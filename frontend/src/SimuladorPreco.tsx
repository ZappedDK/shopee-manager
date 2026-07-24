import { useState, useEffect, useRef } from 'react';
import { api } from './services/api';
import { PageHeader } from './ui';
import { PlatformIcon } from './PlatformIcon';
import {
  colors, cardStyle, cardTitleStyle, cardDescStyle,
  inputStyle, btnStyle, btnNeutralStyle,
  tableHeaderStyle, tableCellStyle
} from './theme';

interface SeletorProdutoComBuscaProps {
  produtos: any[];
  skuSelecionado: string;
  onSelectSku: (sku: string) => void;
}

function SeletorProdutoComBusca({ produtos, skuSelecionado, onSelectSku }: SeletorProdutoComBuscaProps) {
  const [aberto, setAberto] = useState(false);
  const [termoBusca, setTermoBusca] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const produtoAtual = produtos.find(p => p.sku === skuSelecionado);

  const produtosFiltrados = produtos.filter((p) => {
    const t = termoBusca.toLowerCase().trim();
    if (!t) return true;
    return p.sku.toLowerCase().includes(t) || p.nome.toLowerCase().includes(t);
  });

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setAberto(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      {/* Campo Principal (Clique para abrir) */}
      <div
        onClick={() => setAberto(!aberto)}
        style={{
          ...inputStyle,
          width: '100%',
          maxWidth: 'none',
          margin: 0,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'pointer',
          border: `1px solid ${aberto ? colors.accent : colors.borderStrong}`,
          backgroundColor: colors.bgInput,
          userSelect: 'none'
        }}
      >
        <span style={{ color: produtoAtual ? colors.textPrimary : colors.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {produtoAtual ? `📦 ${produtoAtual.sku} — ${produtoAtual.nome} (R$ ${produtoAtual.custo_produto.toFixed(2)})` : 'Selecione um produto...'}
        </span>
        <span style={{ fontSize: '12px', color: colors.textSecondary, marginLeft: '8px' }}>
          {aberto ? '▲' : '▼'}
        </span>
      </div>

      {/* Painel Flutuante com busca + lista */}
      {aberto && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            backgroundColor: colors.bgSidebar,
            border: `1px solid ${colors.borderStrong}`,
            borderRadius: '10px',
            boxShadow: '0 12px 30px rgba(0,0,0,0.6)',
            zIndex: 1000,
            padding: '8px',
          }}
        >
          {/* Campo de Pesquisa Interno */}
          <input
            type="text"
            placeholder="🔍 Digite para pesquisar SKU ou Nome..."
            value={termoBusca}
            onChange={(e) => setTermoBusca(e.target.value)}
            autoFocus
            style={{
              ...inputStyle,
              width: '100%',
              maxWidth: 'none',
              marginBottom: '8px',
              padding: '8px 12px',
              fontSize: '13px',
              backgroundColor: colors.bgApp
            }}
          />

          {/* Lista de Opções */}
          <div style={{ maxHeight: '220px', overflowY: 'auto' }}>
            {produtosFiltrados.length === 0 ? (
              <div style={{ padding: '10px', color: colors.textMuted, textAlign: 'center', fontSize: '13px' }}>
                Nenhum produto encontrado
              </div>
            ) : (
              produtosFiltrados.map((p) => {
                const selecionado = p.sku === skuSelecionado;
                return (
                  <div
                    key={p.sku}
                    onClick={() => {
                      onSelectSku(p.sku);
                      setAberto(false);
                      setTermoBusca('');
                    }}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      backgroundColor: selecionado ? 'rgba(59,130,246,0.2)' : 'transparent',
                      color: selecionado ? '#fff' : colors.textPrimary,
                      fontWeight: selecionado ? 600 : 400,
                      marginBottom: '2px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                    onMouseEnter={(e) => {
                      if (!selecionado) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)';
                    }}
                    onMouseLeave={(e) => {
                      if (!selecionado) e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <span>
                      <strong style={{ color: colors.accent }}>{p.sku}</strong> — {p.nome}
                    </span>
                    <span style={{ fontSize: '12px', color: colors.textSecondary, marginLeft: '8px' }}>
                      Custo: R$ {p.custo_produto.toFixed(2)}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

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
            <div style={{ flex: 1.5, minWidth: '280px' }}>
              <label style={{ display: 'block', color: colors.textSecondary, fontSize: '13px', marginBottom: '6px' }}>
                Selecione o Produto:
              </label>
              <SeletorProdutoComBusca
                produtos={produtos}
                skuSelecionado={skuSelecionado}
                onSelectSku={setSkuSelecionado}
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
