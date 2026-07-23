import { useState, useEffect } from 'react';
import { api } from './services/api';
import { PageHeader } from './ui';
import { PlatformIcon } from './PlatformIcon';
import {
  colors, cardStyle, cardTitleStyle, cardDescStyle,
  inputStyle, btnStyle, btnNeutralStyle,
  tableHeaderStyle, tableCellStyle
} from './theme';

export function SimuladorPreco() {
  const [modo, setModo] = useState<'existente' | 'livre'>('existente');

  // Dados do backend
  const [produtos, setProdutos] = useState<any[]>([]);
  const [embalagens, setEmbalagens] = useState<any[]>([]);

  // Formulário - Modo Existente
  const [skuSelecionado, setSkuSelecionado] = useState<string>('');

  // Formulário - Modo Livre
  const [custoProdutoLivre, setCustoProdutoLivre] = useState<string>('20.00');
  const [embalagemIdLivre, setEmbalagemIdLivre] = useState<string>('');

  // Margem Desejada (%)
  const [margemDesejada, setMargemDesejada] = useState<number>(20);

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
      }
    } catch (err) {
      console.error('Erro ao carregar dados para simulação:', err);
    }
  };

  useEffect(() => {
    executarSimulacao();
  }, [modo, skuSelecionado, custoProdutoLivre, embalagemIdLivre, margemDesejada]);

  const executarSimulacao = async () => {
    setErro('');
    if (margemDesejada <= 0 || margemDesejada >= 100) {
      setErro('A margem desejada deve estar entre 1% e 99%.');
      setResultado(null);
      return;
    }

    try {
      setCarregando(true);
      if (modo === 'existente') {
        if (!skuSelecionado) return;
        const res = await api.get(`/produtos/${skuSelecionado}/simular-preco?margem_desejada=${margemDesejada}`);
        setResultado(res.data);
      } else {
        const custoNum = parseFloat(custoProdutoLivre.replace(',', '.'));
        if (isNaN(custoNum) || custoNum <= 0) {
          setResultado(null);
          return;
        }
        const embParam = embalagemIdLivre ? `&embalagem_id=${embalagemIdLivre}` : '';
        const res = await api.get(`/simular-preco?custo_produto=${custoNum}&margem_desejada=${margemDesejada}${embParam}`);
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
        title="🎯 Simulador de Preço Ideal"
        subtitle="Cálculo inverso: informe a margem de lucro desejada (%) para saber exatamente quanto cobrar em cada plataforma."
      />

      {/* Seletor de Modo */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
        <button
          onClick={() => setModo('existente')}
          style={{
            ...btnStyle,
            backgroundColor: modo === 'existente' ? colors.accent : colors.bgCard,
            border: `1px solid ${modo === 'existente' ? colors.accent : colors.border}`,
            color: modo === 'existente' ? '#fff' : colors.textSecondary
          }}
        >
          📦 Usar Produto do Estoque
        </button>
        <button
          onClick={() => setModo('livre')}
          style={{
            ...btnStyle,
            backgroundColor: modo === 'livre' ? colors.accent : colors.bgCard,
            border: `1px solid ${modo === 'livre' ? colors.accent : colors.border}`,
            color: modo === 'livre' ? '#fff' : colors.textSecondary
          }}
        >
          💡 Simulação Livre (Novo Produto)
        </button>
      </div>

      {/* Card de Configuração da Simulação */}
      <div style={{ ...cardStyle, marginBottom: '28px' }}>
        <h3 style={cardTitleStyle}>⚙️ Parâmetros da Simulação</h3>
        <p style={cardDescStyle}>Defina os custos e a porcentagem de lucro líquido que você deseja obter sobre a venda.</p>

        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          {modo === 'existente' ? (
            <div style={{ flex: 1, minWidth: '240px' }}>
              <label style={{ display: 'block', color: colors.textSecondary, fontSize: '13px', marginBottom: '6px' }}>
                Selecione o Produto:
              </label>
              <select
                value={skuSelecionado}
                onChange={(e) => setSkuSelecionado(e.target.value)}
                style={{ ...inputStyle, width: '100%', maxWidth: 'none', margin: 0 }}
              >
                {produtos.length === 0 && <option value="">Nenhum produto cadastrado</option>}
                {produtos.map((p) => (
                  <option key={p.sku} value={p.sku}>
                    {p.sku} — {p.nome} (Custo: R$ {p.custo_produto.toFixed(2)})
                  </option>
                ))}
              </select>
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
                  <option value="">-- Sem Embalagem (R$ 0.00) --</option>
                  {embalagens.map((emb) => (
                    <option key={emb.id} value={emb.id}>
                      {emb.nome} (R$ {(emb.custo_pacote / emb.qtd_unidades).toFixed(2)}/un)
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          {/* Margem Desejada (%) */}
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
        </div>

        {/* Atalhos de Margem */}
        <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ color: colors.textMuted, fontSize: '12.5px' }}>Atalhos de Margem:</span>
          {presetsMargem.map((val) => (
            <button
              key={val}
              onClick={() => setMargemDesejada(val)}
              style={{
                ...btnNeutralStyle,
                padding: '4px 10px',
                fontSize: '12px',
                backgroundColor: margemDesejada === val ? colors.accent : colors.bgCardAlt,
                color: margemDesejada === val ? '#fff' : colors.textSecondary,
                border: `1px solid ${margemDesejada === val ? colors.accent : colors.border}`
              }}
            >
              {val}%
            </button>
          ))}
        </div>
      </div>

      {erro && (
        <div style={{ padding: '14px 18px', backgroundColor: colors.dangerBg, border: `1px solid ${colors.dangerBorder}`, color: colors.dangerText, borderRadius: '10px', marginBottom: '24px' }}>
          ⚠️ {erro}
        </div>
      )}

      {/* Resultados da Simulação */}
      {carregando ? (
        <p style={{ color: colors.textSecondary }}>Calculando preços ideais...</p>
      ) : resultado && resultado.simulacoes ? (
        <div>
          {/* Card Resumo do Produto / Custo */}
          <div style={{ ...cardStyle, marginBottom: '24px', backgroundColor: colors.bgCardAlt, borderLeft: `4px solid ${colors.accent}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <h4 style={{ margin: '0 0 4px 0', color: colors.textPrimary, fontSize: '16px' }}>
                  {modo === 'existente' ? `SKU: ${resultado.sku} — ${resultado.nome}` : 'Simulação de Produto Livre'}
                </h4>
                <p style={{ margin: 0, color: colors.textSecondary, fontSize: '13px' }}>
                  Custo Produto: <strong>R$ {resultado.custo_produto?.toFixed(2)}</strong> | Embalagem: <strong>R$ {resultado.custo_embalagem?.toFixed(2)}</strong> | Etiqueta: <strong>R$ {resultado.custo_etiqueta?.toFixed(2)}</strong>
                </p>
              </div>

              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '12px', color: colors.textMuted, display: 'block' }}>Margem Alvo</span>
                <span style={{ fontSize: '24px', fontWeight: 800, color: colors.successText }}>
                  {resultado.margem_desejada_pct}%
                </span>
              </div>
            </div>
          </div>

          {/* Tabela de Preços Sugeridos por Plataforma */}
          <div style={cardStyle}>
            <h3 style={cardTitleStyle}>📊 Tabela de Preços Recomendados por Canal</h3>
            <p style={cardDescStyle}>Para obter exatamente <strong>{resultado.margem_desejada_pct}%</strong> de margem líquida, você deve vender pelos preços abaixo:</p>

            <div className="table-scroll">
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={tableHeaderStyle}>Plataforma</th>
                    <th style={tableHeaderStyle}>Preço Recomendado</th>
                    <th style={tableHeaderStyle}>Lucro Líquido (R$)</th>
                    <th style={tableHeaderStyle}>Total de Taxas</th>
                    <th style={tableHeaderStyle}>ROAS Mínimo</th>
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

                      <td style={tableCellStyle}>
                        {sim.inviavel ? (
                          <span style={{ color: colors.dangerText }}>—</span>
                        ) : (
                          <strong style={{ color: colors.accent, fontSize: '18px' }}>
                            R$ {sim.preco_sugerido.toFixed(2)}
                          </strong>
                        )}
                      </td>

                      <td style={tableCellStyle}>
                        {sim.inviavel ? (
                          <span style={{ color: colors.dangerText }}>—</span>
                        ) : (
                          <strong style={{ color: colors.successText, fontSize: '15px' }}>
                            R$ {sim.lucro_liquido.toFixed(2)}
                          </strong>
                        )}
                      </td>

                      <td style={tableCellStyle}>
                        {sim.inviavel ? (
                          <span style={{ color: colors.dangerText }}>—</span>
                        ) : (
                          <span style={{ color: colors.danger }}>
                            R$ {(sim.taxa_plataforma_real + sim.taxa_fixa).toFixed(2)}
                          </span>
                        )}
                      </td>

                      <td style={tableCellStyle}>
                        {sim.inviavel ? '—' : sim.roas_minimo?.toFixed(2)}
                      </td>

                      <td style={tableCellStyle}>
                        {sim.inviavel ? (
                          <span style={{ color: colors.dangerText, backgroundColor: '#7f1d1d', padding: '3px 8px', borderRadius: '6px', fontSize: '12px' }}>
                            ⚠️ Margem Inviável
                          </span>
                        ) : (
                          <span style={{ color: colors.successText, backgroundColor: colors.successBg, border: `1px solid ${colors.successBorder}`, padding: '3px 8px', borderRadius: '6px', fontSize: '12px' }}>
                            ✅ Viável
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
