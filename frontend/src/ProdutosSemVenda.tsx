import { useState, useCallback } from 'react';
import {
  colors,
  cardStyle,
  pageTitleStyle,
  pageSubtitleStyle,
  tableHeaderStyle,
  tableCellStyle,
  btnStyle,
  cardTitleStyle,
  inputStyle,
  formatarMoeda,
} from './theme';

const API = import.meta.env.VITE_API_URL ?? '';

interface ProdutoSemVenda {
  id: number;
  sku: string;
  nome: string;
  custo_produto: number;
  preco_venda: number;
  quantidade_estoque: number;
  cross_docking: boolean;
  ultima_venda: string;
  dias_sem_venda: number;
}

interface RelatorioDados {
  periodo: { inicio: string; fim: string };
  total: number;
  produtos: ProdutoSemVenda[];
}

function badgeDias(dias: number) {
  if (dias === 9999) {
    return (
      <span style={{
        backgroundColor: 'rgba(239, 68, 68, 0.15)',
        color: '#fca5a5',
        border: '1px solid rgba(239, 68, 68, 0.35)',
        borderRadius: '6px',
        padding: '2px 8px',
        fontSize: '12px',
        fontWeight: 600,
        whiteSpace: 'nowrap',
      }}>Nunca vendido</span>
    );
  }
  if (dias >= 60) {
    return (
      <span style={{
        backgroundColor: 'rgba(239, 68, 68, 0.15)',
        color: '#fca5a5',
        border: '1px solid rgba(239, 68, 68, 0.35)',
        borderRadius: '6px',
        padding: '2px 8px',
        fontSize: '12px',
        fontWeight: 600,
        whiteSpace: 'nowrap',
      }}>{dias}d sem venda</span>
    );
  }
  if (dias >= 30) {
    return (
      <span style={{
        backgroundColor: 'rgba(245, 158, 11, 0.15)',
        color: '#fcd34d',
        border: '1px solid rgba(245, 158, 11, 0.35)',
        borderRadius: '6px',
        padding: '2px 8px',
        fontSize: '12px',
        fontWeight: 600,
        whiteSpace: 'nowrap',
      }}>{dias}d sem venda</span>
    );
  }
  return (
    <span style={{
      backgroundColor: 'rgba(59, 130, 246, 0.12)',
      color: '#60a5fa',
      border: '1px solid rgba(59, 130, 246, 0.3)',
      borderRadius: '6px',
      padding: '2px 8px',
      fontSize: '12px',
      fontWeight: 600,
      whiteSpace: 'nowrap',
    }}>{dias}d sem venda</span>
  );
}

const PERIODOS = [
  { label: 'Últimos 7 dias',  dias: 7 },
  { label: 'Últimos 15 dias', dias: 15 },
  { label: 'Últimos 30 dias', dias: 30 },
  { label: 'Últimos 60 dias', dias: 60 },
  { label: 'Personalizado',   dias: -1 },
];

export default function ProdutosSemVenda() {
  const fmt = (d: Date) => d.toISOString().substring(0, 10);
  const calcInicio = (dias: number) => {
    const d = new Date();
    d.setDate(d.getDate() - dias);
    return fmt(d);
  };

  const [periodoSelecionado, setPeriodoSelecionado] = useState<number>(30);
  const [dataInicioCustom, setDataInicioCustom] = useState(calcInicio(30));
  const [dataFimCustom, setDataFimCustom] = useState(fmt(new Date()));
  const [dados, setDados] = useState<RelatorioDados | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [filtro, setFiltro] = useState('');

  const buscar = useCallback(async (inicio: string, fim: string) => {
    setCarregando(true);
    try {
      const params = new URLSearchParams();
      params.set('data_inicio', inicio);
      params.set('data_fim', fim);
      const resp = await fetch(`${API}/relatorios/produtos-sem-venda?${params}`);
      const json = await resp.json();
      setDados(json);
    } catch (e) {
      console.error(e);
    } finally {
      setCarregando(false);
    }
  }, []);

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const dias = Number(e.target.value);
    setPeriodoSelecionado(dias);
    if (dias !== -1) {
      const inicio = calcInicio(dias);
      const fim = fmt(new Date());
      setDataInicioCustom(inicio);
      setDataFimCustom(fim);
      buscar(inicio, fim);
    }
  };

  const buscarCustom = () => {
    buscar(dataInicioCustom, dataFimCustom);
  };

  const produtosFiltrados = (dados?.produtos ?? []).filter(p => {
    if (p.cross_docking) return false;
    const q = filtro.toLowerCase();
    return (
      (p.sku ?? '').toLowerCase().includes(q) ||
      (p.nome ?? '').toLowerCase().includes(q)
    );
  });

  const totalEstoque = produtosFiltrados.reduce((s, p) => s + (p.quantidade_estoque || 0), 0);
  const totalCapitalParado = produtosFiltrados.reduce((s, p) => s + (p.custo_produto || 0) * (p.quantidade_estoque || 0), 0);
  const nuncaVendidos = produtosFiltrados.filter(p => p.dias_sem_venda === 9999).length;

  return (
    <div>
      {/* Cabeçalho */}
      <div style={{ marginBottom: '28px' }}>
        <h2 style={pageTitleStyle}>📉 Produtos Sem Vendas</h2>
        <p style={pageSubtitleStyle}>
          Identifique produtos parados no estoque para impulsionar as vendas.
        </p>
      </div>

      {/* Seletor de Período */}
      <div style={{ ...cardStyle, marginBottom: '24px' }}>
        <h3 style={{ ...cardTitleStyle, marginBottom: '16px' }}>🗓️ Período de Análise</h3>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          {/* Dropdown */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', color: colors.textMuted, marginBottom: '5px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Selecione o período
            </label>
            <select
              value={periodoSelecionado}
              onChange={handleSelectChange}
              disabled={carregando}
              style={{
                ...inputStyle,
                marginBottom: 0,
                width: '200px',
                cursor: 'pointer',
              }}
            >
              {PERIODOS.map(p => (
                <option key={p.dias} value={p.dias}>{p.label}</option>
              ))}
            </select>
          </div>

          {/* Inputs de data — só aparecem no modo Personalizado */}
          {periodoSelecionado === -1 && (
            <>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: colors.textMuted, marginBottom: '5px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Data Início
                </label>
                <input
                  type="date"
                  value={dataInicioCustom}
                  onChange={e => setDataInicioCustom(e.target.value)}
                  style={{ ...inputStyle, marginBottom: 0, width: '155px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: colors.textMuted, marginBottom: '5px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Data Fim
                </label>
                <input
                  type="date"
                  value={dataFimCustom}
                  onChange={e => setDataFimCustom(e.target.value)}
                  style={{ ...inputStyle, marginBottom: 0, width: '155px' }}
                />
              </div>
              <button
                onClick={buscarCustom}
                disabled={carregando}
                style={{ ...btnStyle, padding: '10px 22px', fontSize: '13.5px', opacity: carregando ? 0.6 : 1 }}
              >
                {carregando ? '⏳ Buscando...' : '🔍 Buscar'}
              </button>
            </>
          )}

          {/* Indicador de carregamento nos períodos fixos */}
          {carregando && periodoSelecionado !== -1 && (
            <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: '10px' }}>
              <span style={{ fontSize: '13px', color: colors.textMuted }}>⏳ Buscando...</span>
            </div>
          )}
        </div>

        {dados && (
          <p style={{ fontSize: '13px', color: colors.textMuted, marginTop: '14px', marginBottom: 0 }}>
            Exibindo produtos sem nenhuma venda entre{' '}
            <strong style={{ color: colors.textSecondary }}>{dados.periodo.inicio}</strong> e{' '}
            <strong style={{ color: colors.textSecondary }}>{dados.periodo.fim}</strong>.
          </p>
        )}
      </div>

      {/* Resumo */}
      {dados && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            <div style={{ ...cardStyle, padding: '20px 24px', borderLeft: `3px solid ${colors.danger}` }}>
              <div style={{ fontSize: '12px', color: colors.textMuted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Produtos Parados</div>
              <div style={{ fontSize: '28px', fontWeight: 700, color: '#fca5a5' }}>{produtosFiltrados.length}</div>
              <div style={{ fontSize: '12px', color: colors.textMuted, marginTop: '4px' }}>no período analisado</div>
            </div>
            <div style={{ ...cardStyle, padding: '20px 24px', borderLeft: `3px solid ${colors.amber}` }}>
              <div style={{ fontSize: '12px', color: colors.textMuted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Nunca Vendidos</div>
              <div style={{ fontSize: '28px', fontWeight: 700, color: '#fcd34d' }}>{nuncaVendidos}</div>
              <div style={{ fontSize: '12px', color: colors.textMuted, marginTop: '4px' }}>sem histórico de venda</div>
            </div>
            <div style={{ ...cardStyle, padding: '20px 24px', borderLeft: `3px solid ${colors.accent}` }}>
              <div style={{ fontSize: '12px', color: colors.textMuted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Unidades Paradas</div>
              <div style={{ fontSize: '28px', fontWeight: 700, color: '#60a5fa' }}>{totalEstoque}</div>
              <div style={{ fontSize: '12px', color: colors.textMuted, marginTop: '4px' }}>em estoque</div>
            </div>
            <div style={{ ...cardStyle, padding: '20px 24px', borderLeft: `3px solid ${colors.purple}` }}>
              <div style={{ fontSize: '12px', color: colors.textMuted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Capital Parado</div>
              <div style={{ fontSize: '22px', fontWeight: 700, color: '#c084fc' }}>{formatarMoeda(totalCapitalParado)}</div>
              <div style={{ fontSize: '12px', color: colors.textMuted, marginTop: '4px' }}>custo × estoque de cada produto</div>
            </div>
          </div>

          {/* Tabela */}
          <div style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
              <h3 style={{ ...cardTitleStyle, marginBottom: 0 }}>
                📋 Lista de Produtos ({produtosFiltrados.length})
              </h3>
              <input
                type="text"
                placeholder="🔍 Filtrar por SKU ou nome..."
                value={filtro}
                onChange={e => setFiltro(e.target.value)}
                style={{ ...inputStyle, marginBottom: 0, width: '260px', maxWidth: '100%' }}
              />
            </div>

            {produtosFiltrados.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 0', color: colors.textMuted }}>
                {filtro ? '🔍 Nenhum produto encontrado com esse filtro.' : '✅ Nenhum produto sem venda no período selecionado!'}
              </div>
            ) : (
              <div className="table-scroll">
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
                  <thead>
                    <tr>
                      <th style={{ ...tableHeaderStyle, width: '90px' }}>SKU</th>
                      <th style={tableHeaderStyle}>Nome do Produto</th>
                      <th style={{ ...tableHeaderStyle, textAlign: 'right', width: '110px' }}>Custo</th>
                      <th style={{ ...tableHeaderStyle, textAlign: 'right', width: '120px' }}>Preço Venda</th>
                      <th style={{ ...tableHeaderStyle, textAlign: 'center', width: '80px' }}>Estoque</th>
                      <th style={{ ...tableHeaderStyle, textAlign: 'center', width: '115px' }}>Última Venda</th>
                      <th style={{ ...tableHeaderStyle, textAlign: 'center', width: '140px' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {produtosFiltrados.map(p => (
                      <tr key={p.id} style={{ backgroundColor: 'transparent' }}
                        onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.02)')}
                        onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                      >
                        <td style={{ ...tableCellStyle, fontFamily: 'monospace', fontSize: '12px', color: colors.textMuted }}>
                          {p.sku || '—'}
                        </td>
                        <td style={{ ...tableCellStyle }}>
                          <div style={{ fontWeight: 500 }}>{p.nome}</div>
                        </td>
                        <td style={{ ...tableCellStyle, textAlign: 'right', color: colors.textSecondary }}>
                          {formatarMoeda(p.custo_produto)}
                        </td>
                        <td style={{ ...tableCellStyle, textAlign: 'right', color: colors.successText, fontWeight: 600 }}>
                          {p.preco_venda > 0 ? formatarMoeda(p.preco_venda) : <span style={{ color: colors.textMuted }}>—</span>}
                        </td>
                        <td style={{ ...tableCellStyle, textAlign: 'center' }}>
                          <span style={{ color: p.quantidade_estoque > 0 ? colors.textPrimary : colors.danger, fontWeight: 600 }}>
                            {p.quantidade_estoque}
                          </span>
                        </td>
                        <td style={{ ...tableCellStyle, textAlign: 'center', fontSize: '12px', color: colors.textMuted }}>
                          {p.ultima_venda}
                        </td>
                        <td style={{ ...tableCellStyle, textAlign: 'center' }}>
                          {badgeDias(p.dias_sem_venda)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {!dados && !carregando && (
        <div style={{ ...cardStyle, textAlign: 'center', padding: '60px 32px', color: colors.textMuted }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📉</div>
          <div style={{ fontSize: '16px', fontWeight: 600, color: colors.textSecondary, marginBottom: '8px' }}>
            Selecione um período acima para ver os produtos parados
          </div>
          <div style={{ fontSize: '14px' }}>
            Clique em <strong>Últimos 7, 15 ou 30 dias</strong> para carregar automaticamente.
          </div>
        </div>
      )}
    </div>
  );
}
