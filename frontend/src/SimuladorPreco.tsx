import { useState, useEffect } from 'react';
import { api } from './services/api';
import { PageHeader } from './ui';
import { PlatformIcon } from './PlatformIcon';
import { SeletorProdutoSearchable } from './components/SeletorProdutoSearchable';
import {
  colors, cardStyle, cardTitleStyle, cardDescStyle,
  inputStyle, btnStyle, btnNeutralStyle,
  tableHeaderStyle, tableCellStyle,
  formatarMoeda, formatarNumero
} from './theme';
import { SkeletonTable } from './Skeleton';

export function SimuladorPreco() {
  const [modo, setModo] = useState<'existente' | 'livre'>('existente');

  // Dados do backend
  const [produtos, setProdutos] = useState<any[]>([]);
  const [embalagens, setEmbalagens] = useState<any[]>([]);

  // Formulário - Modo Existente
  const [skuSelecionado, setSkuSelecionado] = useState<string>('');

  // Modo de Cálculo: 'margem' (Precificação por Margem %) ou 'preco' (Lucro por Preço R$)
  type TipoCalculo = 'margem' | 'preco';
  const [tipoCalculo, setTipoCalculo] = useState<TipoCalculo>('margem');

  // Formulário - Modo Livre
  const [custoProdutoLivre, setCustoProdutoLivre] = useState<string>('20.00');
  const [embalagemIdLivre, setEmbalagemIdLivre] = useState<string>('');

  // Inputs de Parâmetros
  const [margemDesejada, setMargemDesejada] = useState<number>(20);
  const [precoVendaInformado, setPrecoVendaInformado] = useState<string>('50.00');

  // Resultado da simulação
  const [resultado, setResultado] = useState<any | null>(null);
  const [carregando, setCarregando] = useState<boolean>(false);
  const [erro, setErro] = useState<string>('');

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    try {
      const [resProd, resEmb] = await Promise.all([
        api.get('/produtos/detalhados'),
        api.get('/embalagens/')
      ]);
      setProdutos(resProd.data || []);
      setEmbalagens(resEmb.data || []);
      if (resProd.data && resProd.data.length > 0) {
        setSkuSelecionado(resProd.data[0].sku);
        if (resProd.data[0].preco_venda) {
          setPrecoVendaInformado(String(resProd.data[0].preco_venda));
        }
      }
    } catch (err) {
      console.error('Erro ao carregar dados para simulação:', err);
    }
  };

  // Sempre que o SKU muda no modo existente, preenche por padrão o Preço de Venda do produto
  useEffect(() => {
    if (modo === 'existente' && skuSelecionado && produtos.length > 0) {
      const prod = produtos.find(p => p.sku === skuSelecionado);
      if (prod && prod.preco_venda) {
        setPrecoVendaInformado(String(prod.preco_venda));
      }
    }
  }, [skuSelecionado, modo, produtos]);

  useEffect(() => {
    executarSimulacao();
  }, [modo, skuSelecionado, custoProdutoLivre, embalagemIdLivre, margemDesejada, tipoCalculo, precoVendaInformado]);

  const executarSimulacao = async () => {
    setErro('');
    if (tipoCalculo === 'margem') {
      if (margemDesejada <= 0 || margemDesejada >= 100) {
        setErro('A margem desejada deve estar entre 1% e 99%.');
        setResultado(null);
        return;
      }
    } else {
      const precoNum = parseFloat(precoVendaInformado.replace(',', '.'));
      if (isNaN(precoNum) || precoNum <= 0) {
        setErro('Informe um preço de venda válido maior que R$ 0,00.');
        setResultado(null);
        return;
      }
    }

    try {
      setCarregando(true);
      if (modo === 'existente') {
        if (!skuSelecionado) return;
        let url = `/produtos/${skuSelecionado}/simular-preco?tipo_calculo=${tipoCalculo}`;
        if (tipoCalculo === 'margem') {
          url += `&margem_desejada=${margemDesejada}`;
        } else {
          const precoNum = parseFloat(precoVendaInformado.replace(',', '.'));
          url += `&preco_venda=${precoNum}`;
        }
        const res = await api.get(url);
        setResultado(res.data);
      } else {
        const custoNum = parseFloat(custoProdutoLivre.replace(',', '.'));
        if (isNaN(custoNum) || custoNum <= 0) {
          setResultado(null);
          return;
        }
        const embParam = embalagemIdLivre ? `&embalagem_id=${embalagemIdLivre}` : '';
        let url = `/simular-preco?custo_produto=${custoNum}&tipo_calculo=${tipoCalculo}${embParam}`;
        if (tipoCalculo === 'margem') {
          url += `&margem_desejada=${margemDesejada}`;
        } else {
          const precoNum = parseFloat(precoVendaInformado.replace(',', '.'));
          url += `&preco_venda=${precoNum}`;
        }
        const res = await api.get(url);
        setResultado(res.data);
      }
    } catch (err: any) {
      setErro(err.response?.data?.detail || 'Erro ao realizar simulação.');
      setResultado(null);
    } finally {
      setCarregando(false);
    }
  };

  const presetsMargem = [10, 15, 20, 25, 30, 35, 40];

  return (
    <div>
      <PageHeader
        title="🎯 Simulador de Preço & Margem Ideal"
        subtitle="Simulação bidirecional: calcule o preço ideal a partir da margem desejada ou descubra a margem e o lucro informando o preço de venda."
      />

      {/* Seletor de Origem (Estoque vs Livre) */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <button
          onClick={() => setModo('existente')}
          style={{
            ...btnStyle,
            padding: '10px 18px',
            borderRadius: '8px',
            backgroundColor: modo === 'existente' ? 'rgba(59, 130, 246, 0.18)' : 'rgba(30, 41, 59, 0.75)',
            border: modo === 'existente' ? '1px solid rgba(59, 130, 246, 0.4)' : '1px solid #334155',
            color: modo === 'existente' ? '#60a5fa' : '#cbd5e1',
            boxShadow: modo === 'existente' ? '0 2px 8px rgba(59, 130, 246, 0.15)' : 'none',
            transition: '0.15s ease-in-out'
          }}
        >
          📦 Usar Produto do Estoque
        </button>
        <button
          onClick={() => setModo('livre')}
          style={{
            ...btnStyle,
            padding: '10px 18px',
            borderRadius: '8px',
            backgroundColor: modo === 'livre' ? 'rgba(59, 130, 246, 0.18)' : 'rgba(30, 41, 59, 0.75)',
            border: modo === 'livre' ? '1px solid rgba(59, 130, 246, 0.4)' : '1px solid #334155',
            color: modo === 'livre' ? '#60a5fa' : '#cbd5e1',
            boxShadow: modo === 'livre' ? '0 2px 8px rgba(59, 130, 246, 0.15)' : 'none',
            transition: '0.15s ease-in-out'
          }}
        >
          💡 Simulação Livre (Novo Produto)
        </button>
      </div>

      {/* Seletor de Tipo de Simulação (Margem % vs Preço R$) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px', backgroundColor: colors.bgCard, padding: '10px 16px', borderRadius: '10px', border: `1px solid ${colors.border}`, flexWrap: 'wrap' }}>
        <span style={{ fontSize: '13px', fontWeight: 600, color: colors.textSecondary }}>Modo de Cálculo:</span>
        <button
          type="button"
          onClick={() => setTipoCalculo('margem')}
          style={{
            padding: '6px 14px',
            fontSize: '12.5px',
            fontWeight: 600,
            borderRadius: '6px',
            border: tipoCalculo === 'margem' ? '1px solid rgba(59, 130, 246, 0.45)' : '1px solid transparent',
            backgroundColor: tipoCalculo === 'margem' ? 'rgba(59, 130, 246, 0.18)' : 'transparent',
            color: tipoCalculo === 'margem' ? '#60a5fa' : colors.textMuted,
            cursor: 'pointer',
            transition: '0.15s'
          }}
        >
          🎯 Descobrir Preço (por Margem % Desejada)
        </button>
        <button
          type="button"
          onClick={() => setTipoCalculo('preco')}
          style={{
            padding: '6px 14px',
            fontSize: '12.5px',
            fontWeight: 600,
            borderRadius: '6px',
            border: tipoCalculo === 'preco' ? '1px solid rgba(16, 185, 129, 0.45)' : '1px solid transparent',
            backgroundColor: tipoCalculo === 'preco' ? 'rgba(16, 185, 129, 0.18)' : 'transparent',
            color: tipoCalculo === 'preco' ? '#34d399' : colors.textMuted,
            cursor: 'pointer',
            transition: '0.15s'
          }}
        >
          💲 Simular Lucro & Margem (por Preço de Venda R$)
        </button>
      </div>

      {/* Card de Configuração da Simulação */}
      <div style={{ ...cardStyle, marginBottom: '28px' }}>
        <h3 style={cardTitleStyle}>⚙️ Parâmetros da Simulação</h3>
        <p style={cardDescStyle}>
          {tipoCalculo === 'margem'
            ? 'Informe a margem de lucro líquido desejada (%) para o sistema calcular o preço de venda recomendado.'
            : 'Informe o preço de venda desejado (R$) para consultar a margem final e o lucro líquido em cada plataforma.'}
        </p>

        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          {modo === 'existente' ? (
            <div style={{ flex: 1.5, minWidth: '280px' }}>
              <label style={{ display: 'block', color: colors.textSecondary, fontSize: '13px', marginBottom: '6px' }}>
                Selecione o Produto:
              </label>
              <SeletorProdutoSearchable
                produtos={produtos}
                skuSelecionado={skuSelecionado}
                onSelectSku={setSkuSelecionado}
                colors={colors}
                inputStyle={inputStyle}
              />
            </div>
          ) : (
            <>
              <div style={{ flex: 1, minWidth: '180px' }}>
                <label style={{ display: 'block', color: colors.textSecondary, fontSize: '13px', marginBottom: '6px' }}>
                  Custo da Mercadoria (R$):
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={custoProdutoLivre}
                  onChange={(e) => setCustoProdutoLivre(e.target.value)}
                  style={{ ...inputStyle, width: '100%', maxWidth: 'none', margin: 0 }}
                  placeholder="20.00"
                />
              </div>

              <div style={{ flex: 1, minWidth: '200px' }}>
                <label style={{ display: 'block', color: colors.textSecondary, fontSize: '13px', marginBottom: '6px' }}>
                  Embalagem:
                </label>
                <select
                  value={embalagemIdLivre}
                  onChange={(e) => setEmbalagemIdLivre(e.target.value)}
                  style={{ ...inputStyle, width: '100%', maxWidth: 'none', margin: 0 }}
                >
                  <option value="">-- Sem Embalagem (Caixa Própria - {formatarMoeda(0)}) --</option>
                  {embalagens.map((emb) => (
                    <option key={emb.id} value={emb.id}>
                      {emb.nome} ({formatarMoeda(emb.custo_pacote / emb.qtd_unidades)}/un)
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          {/* Input Condicional: Margem (%) vs Preço de Venda (R$) */}
          {tipoCalculo === 'margem' ? (
            <div style={{ flex: 1, minWidth: '220px' }}>
              <label style={{ display: 'block', color: colors.textSecondary, fontSize: '13px', marginBottom: '6px' }}>
                Margem de Lucro Desejada (%):
              </label>
              <input
                type="number"
                step="0.5"
                min="1"
                max="99"
                value={margemDesejada}
                onChange={(e) => setMargemDesejada(Number(e.target.value))}
                style={{ ...inputStyle, width: '100%', maxWidth: 'none', margin: 0, fontWeight: 'bold', color: colors.accent }}
              />
            </div>
          ) : (
            <div style={{ flex: 1, minWidth: '220px' }}>
              <label style={{ display: 'block', color: colors.textSecondary, fontSize: '13px', marginBottom: '6px' }}>
                Preço de Venda Desejado (R$):
              </label>
              <input
                type="number"
                step="0.10"
                min="0.10"
                value={precoVendaInformado}
                onChange={(e) => setPrecoVendaInformado(e.target.value)}
                style={{ ...inputStyle, width: '100%', maxWidth: 'none', margin: 0, fontWeight: 'bold', color: colors.successText }}
                placeholder="50.00"
              />
            </div>
          )}
        </div>

        {/* Atalhos de Margem (Somente se tipoCalculo === 'margem') */}
        {tipoCalculo === 'margem' && (
          <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ color: colors.textMuted, fontSize: '12.5px' }}>Atalhos de Margem:</span>
            {presetsMargem.map((val) => (
              <button
                key={val}
                onClick={() => setMargemDesejada(val)}
                style={{
                  ...btnNeutralStyle,
                  padding: '4px 11px',
                  fontSize: '12px',
                  borderRadius: '6px',
                  backgroundColor: margemDesejada === val ? 'rgba(59, 130, 246, 0.2)' : 'rgba(30, 41, 59, 0.6)',
                  color: margemDesejada === val ? '#60a5fa' : '#cbd5e1',
                  border: margemDesejada === val ? '1px solid rgba(59, 130, 246, 0.45)' : '1px solid #334155',
                  transition: '0.15s'
                }}
              >
                {val}%
              </button>
            ))}
          </div>
        )}
      </div>

      {erro && (
        <div style={{ padding: '14px 18px', backgroundColor: colors.dangerBg, border: `1px solid ${colors.dangerBorder}`, color: colors.dangerText, borderRadius: '10px', marginBottom: '24px' }}>
          ⚠️ {erro}
        </div>
      )}

      {/* Resultados da Simulação */}
      {carregando ? (
        <div style={{ ...cardStyle, marginTop: '24px' }}>
          <SkeletonTable rows={4} cols={7} />
        </div>
      ) : resultado && resultado.simulacoes ? (
        <div>
          {/* Card Resumo do Produto / Custo */}
          <div style={{ ...cardStyle, marginBottom: '24px', backgroundColor: colors.bgCardAlt, borderLeft: `4px solid ${tipoCalculo === 'preco' ? colors.success : colors.accent}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <h4 style={{ margin: '0 0 4px 0', color: colors.textPrimary, fontSize: '16px' }}>
                  {modo === 'existente' ? `SKU: ${resultado.sku} — ${resultado.nome}` : 'Simulação de Produto Livre'}
                </h4>
                <p style={{ margin: 0, color: colors.textSecondary, fontSize: '13px' }}>
                  Custo Produto: <strong>{formatarMoeda(resultado.custo_produto)}</strong> | Embalagem: <strong>{formatarMoeda(resultado.custo_embalagem)}</strong> | Etiqueta: <strong>{formatarMoeda(resultado.custo_etiqueta)}</strong>
                </p>
              </div>

              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '12px', color: colors.textMuted, display: 'block' }}>
                  {tipoCalculo === 'preco' ? 'Preço Testado' : 'Margem Alvo'}
                </span>
                <span style={{ fontSize: '24px', fontWeight: 800, color: tipoCalculo === 'preco' ? colors.accent : colors.successText }}>
                  {tipoCalculo === 'preco' ? formatarMoeda(resultado.preco_venda_informado) : `${resultado.margem_desejada_pct}%`}
                </span>
              </div>
            </div>
          </div>

          {/* Tabela de Preços Sugeridos por Plataforma */}
          <div style={cardStyle}>
            <h3 style={cardTitleStyle}>📊 Tabela de Resultados por Canal</h3>
            <p style={cardDescStyle}>
              {tipoCalculo === 'margem'
                ? `Para obter exatamente ${resultado.margem_desejada_pct}% de margem líquida, você deve vender pelos preços abaixo:`
                : `Vendendo por ${formatarMoeda(resultado.preco_venda_informado)}, este é o lucro e a margem resultantes em cada marketplace:`}
            </p>

            <div className="table-scroll">
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={tableHeaderStyle}>Plataforma</th>
                    <th style={tableHeaderStyle}>{tipoCalculo === 'preco' ? 'Preço de Venda' : 'Preço Recomendado'}</th>
                    <th style={tableHeaderStyle}>{tipoCalculo === 'preco' ? 'Margem Resultante (%)' : 'Lucro Líquido (R$)'}</th>
                    <th style={tableHeaderStyle}>{tipoCalculo === 'preco' ? 'Lucro Líquido (R$)' : 'Total de Taxas'}</th>
                    <th style={tableHeaderStyle}>{tipoCalculo === 'preco' ? 'Total de Taxas' : 'ROAS Mínimo'}</th>
                    {tipoCalculo === 'preco' && <th style={tableHeaderStyle}>ROAS Mínimo</th>}
                    <th style={tableHeaderStyle}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {resultado.simulacoes.map((sim: any) => (
                    <tr key={sim.plataforma_id} style={{ backgroundColor: sim.inviavel ? colors.dangerBg : 'transparent' }}>
                      <td style={tableCellStyle}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
                          <PlatformIcon nome={sim.plataforma_nome} icone={sim.icone} size={20} />
                          {sim.plataforma_nome}
                        </div>
                      </td>

                      {/* Coluna Preço */}
                      <td style={tableCellStyle}>
                        {sim.inviavel ? (
                          <span style={{ color: colors.dangerText }}>—</span>
                        ) : (
                          <strong style={{ color: colors.accent, fontSize: '17px' }}>
                            {formatarMoeda(sim.preco_sugerido)}
                          </strong>
                        )}
                      </td>

                      {/* Se tipoCalculo === 'preco', Coluna 3 = Margem (%) */}
                      {tipoCalculo === 'preco' ? (
                        <td style={tableCellStyle}>
                          {sim.inviavel ? (
                            <span style={{ color: colors.dangerText }}>Prejuízo</span>
                          ) : (
                            <strong style={{ color: colors.amber, fontSize: '15px' }}>
                              {formatarNumero(sim.margem_desejada_pct || (sim.margem_final * 100))}%
                            </strong>
                          )}
                        </td>
                      ) : (
                        <td style={tableCellStyle}>
                          {sim.inviavel ? (
                            <span style={{ color: colors.dangerText }}>—</span>
                          ) : (
                            <strong style={{ color: colors.successText, fontSize: '15px' }}>
                              {formatarMoeda(sim.lucro_liquido)}
                            </strong>
                          )}
                        </td>
                      )}

                      {/* Se tipoCalculo === 'preco', Coluna 4 = Lucro (R$) */}
                      {tipoCalculo === 'preco' ? (
                        <td style={tableCellStyle}>
                          {sim.inviavel ? (
                            <span style={{ color: colors.dangerText }}>{formatarMoeda(sim.lucro_liquido)}</span>
                          ) : (
                            <strong style={{ color: colors.successText, fontSize: '15px' }}>
                              {formatarMoeda(sim.lucro_liquido)}
                            </strong>
                          )}
                        </td>
                      ) : (
                        <td style={tableCellStyle}>
                          {sim.inviavel ? (
                            <span style={{ color: colors.dangerText }}>—</span>
                          ) : (
                            <span style={{ color: '#EE6C6D' }}>
                              {formatarMoeda(sim.taxa_plataforma_real + sim.taxa_fixa)}
                            </span>
                          )}
                        </td>
                      )}

                      {/* Se tipoCalculo === 'preco', Coluna 5 = Taxas */}
                      {tipoCalculo === 'preco' ? (
                        <td style={tableCellStyle}>
                          <span style={{ color: '#EE6C6D' }}>
                            {formatarMoeda(sim.taxa_plataforma_real + sim.taxa_fixa)}
                          </span>
                        </td>
                      ) : (
                        <td style={tableCellStyle}>
                          {sim.inviavel ? '—' : <strong style={{ color: '#e2e8f0' }}>{formatarNumero(sim.roas_minimo)}</strong>}
                        </td>
                      )}

                      {/* ROAS se tipoCalculo === 'preco' */}
                      {tipoCalculo === 'preco' && (
                        <td style={tableCellStyle}>
                          <strong style={{ color: '#e2e8f0' }}>{formatarNumero(sim.roas_minimo)}</strong>
                        </td>
                      )}

                      {/* Status */}
                      <td style={tableCellStyle}>
                        {sim.inviavel ? (
                          <span style={{ color: colors.dangerText, backgroundColor: '#7f1d1d', padding: '3px 8px', borderRadius: '6px', fontSize: '12px' }}>
                            ⚠️ {tipoCalculo === 'preco' ? 'Prejuízo / Inviável' : 'Margem Inviável'}
                          </span>
                        ) : (
                          <span style={{ color: colors.successText, backgroundColor: colors.successBg, border: `1px solid ${colors.successBorder}`, padding: '3px 8px', borderRadius: '6px', fontSize: '12px' }}>
                            ✅ {tipoCalculo === 'preco' ? 'Lucrativo' : 'Viável'}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
