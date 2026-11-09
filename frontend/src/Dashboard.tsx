import { useState, useEffect, useRef } from 'react';
import { api, apiGet, apiGetSWR } from './services/api';
import { PageHeader } from './ui';
import { PlatformIcon } from './PlatformIcon';
import {
  colors, cardStyle, cardTitleStyle, cardDescStyle,
  inputStyle, tableHeaderStyle, tableCellStyle, formatarMoeda
} from './theme';
import {
  Globe, Handshake, ChevronDown, ChevronUp, Check, BarChart3,
  Download, ShoppingCart, DollarSign, TrendingUp, Package,
  ClipboardList, AlertTriangle, CheckCircle2, ArrowUpDown, ArrowUp, ArrowDown
} from 'lucide-react';
import { SkeletonBox, SkeletonList, SkeletonTable } from './Skeleton';

interface SeletorFiltroCanalProps {
  canalFiltro: string;
  onSelectCanal: (canal: string) => void;
}

function SeletorFiltroCanal({ canalFiltro, onSelectCanal }: SeletorFiltroCanalProps) {
  const [aberto, setAberto] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setAberto(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const opcoes = [
    { id: 'todos', nome: 'Todos os Canais', icone: null },
    { id: 'direta', nome: 'Venda Direta', icone: null },
    { id: 'shopee', nome: 'Shopee', icone: 'shopee' },
    { id: 'tiktok', nome: 'TikTok Shop', icone: 'tiktokshop' },
    { id: 'mercado', nome: 'Mercado Livre', icone: 'mercadolivre' }
  ];

  const opcaoAtual = opcoes.find(o => o.id === canalFiltro) || opcoes[0];

  return (
    <div ref={containerRef} style={{ position: 'relative', minWidth: '170px' }}>
      <div
        onClick={() => setAberto(!aberto)}
        style={{
          ...inputStyle,
          width: '100%',
          maxWidth: 'none',
          margin: 0,
          padding: '6px 12px',
          fontSize: '13px',
          fontWeight: 600,
          backgroundColor: colors.bgApp,
          color: colors.textPrimary,
          border: `1px solid ${aberto ? colors.accent : colors.borderStrong}`,
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          userSelect: 'none'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {opcaoAtual.icone ? (
            <PlatformIcon nome={opcaoAtual.nome} size={16} />
          ) : (
            opcaoAtual.id === 'direta' ? <Handshake size={16} /> : <Globe size={16} />
          )}
          <span>{opcaoAtual.nome}</span>
        </div>
        <span style={{ color: colors.textSecondary, marginLeft: '6px', display: 'flex', alignItems: 'center' }}>
          {aberto ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </span>
      </div>

      {aberto && (
        <div className="popover"
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            backgroundColor: colors.bgSidebar,
            border: `1px solid ${colors.borderStrong}`,
            borderRadius: '8px',
            boxShadow: 'var(--shadow-lg)',
            zIndex: 1000,
            padding: '4px',
          }}
        >
          {opcoes.map((op) => {
            const selecionado = op.id === canalFiltro;
            return (
              <div
                key={op.id}
                onClick={() => {
                  onSelectCanal(op.id);
                  setAberto(false);
                }}
                style={{
                  padding: '8px 10px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  backgroundColor: selecionado ? 'color-mix(in srgb, var(--accent) 20%, transparent)' : 'transparent',
                  color: selecionado ? 'var(--text-primary)' : colors.textPrimary,
                  fontWeight: selecionado ? 600 : 400,
                  marginBottom: '2px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {op.icone ? (
                    <PlatformIcon nome={op.nome} size={16} />
                  ) : (
                    op.id === 'direta' ? <Handshake size={16} /> : <Globe size={16} />
                  )}
                  <span>{op.nome}</span>
                </div>
                {selecionado && <Check size={14} style={{ color: colors.accent }} />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function Dashboard() {
  const [alertas, setAlertas] = useState<any[]>([]);
  const [valorTotalEstoque, setValorTotalEstoque] = useState<number | null>(null);
  const [lucroPotencialTotal, setLucroPotencialTotal] = useState<number | null>(null);
  const [carregando, setCarregando] = useState(true);

  // Relatório de Vendas com Intervalo de Data Personalizado
  const [dataInicio, setDataInicio] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  });
  const [dataFim, setDataFim] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [canalFiltro, setCanalFiltro] = useState<string>('todos');
  const [relatorioVendas, setRelatorioVendas] = useState<any>(null);
  const [carregandoRelatorio, setCarregandoRelatorio] = useState(true);

  // Ordenação de Colunas na Tabela de Vendas
  type SortFieldVendas = 'data' | 'sku' | 'nome' | 'canal' | 'quantidade' | 'faturamento' | 'lucro_estimado';
  const [sortField, setSortField] = useState<SortFieldVendas>('data');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    carregarAlertas();
    carregarValorEstoque();
    carregarRelatorioVendas(dataInicio, dataFim, canalFiltro);
  }, []);

  const carregarAlertas = () => {
    // Stale-while-revalidate para alertas
    const cached = apiGetSWR<any[]>('/produtos/alertas', { limite: '0' }, (fresh) => {
      setAlertas(fresh || []);
      setCarregando(false);
    });

    if (cached !== null) {
      setAlertas(cached || []);
      setCarregando(false);
    } else {
      setCarregando(true);
      apiGet<any[]>('/produtos/alertas', { limite: '0' })
        .then(data => setAlertas(data || []))
        .catch(err => console.error('Erro ao carregar alertas:', err))
        .finally(() => setCarregando(false));
    }
  };

  // Totais do topo vêm prontos do servidor (/dashboard/resumo) — antes o
  // Dashboard baixava o catálogo inteiro com análises só para somar dois números.
  const aplicarResumo = (r: any) => {
    setValorTotalEstoque(r?.valor_total_estoque ?? 0);
    setLucroPotencialTotal(r?.lucro_potencial ?? 0);
  };

  const carregarValorEstoque = () => {
    const cached = apiGetSWR<any>('/dashboard/resumo', undefined, aplicarResumo);

    if (cached !== null) {
      aplicarResumo(cached);
    } else {
      apiGet<any>('/dashboard/resumo')
        .then(aplicarResumo)
        .catch(err => console.error('Erro ao calcular valor do estoque:', err));
    }
  };

  const carregarRelatorioVendas = (inicio?: string, fim?: string, canal?: string) => {
    const targetInicio = inicio !== undefined ? inicio : dataInicio;
    const targetFim = fim !== undefined ? fim : dataFim;
    const targetCanal = canal !== undefined ? canal : canalFiltro;

    const params: Record<string, string> = {};
    if (targetInicio) params['data_inicio'] = targetInicio;
    if (targetFim) params['data_fim'] = targetFim;
    if (targetCanal && targetCanal !== 'todos') params['canal'] = targetCanal;

    // Stale-while-revalidate para relatório
    const cached = apiGetSWR<any>('/relatorios/vendas', params, (fresh) => {
      setRelatorioVendas(fresh);
      setCarregandoRelatorio(false);
    });

    if (cached !== null) {
      setRelatorioVendas(cached);
      setCarregandoRelatorio(false);
    } else {
      setCarregandoRelatorio(true);
      apiGet<any>('/relatorios/vendas', params)
        .then(data => setRelatorioVendas(data))
        .catch(err => console.error('Erro ao carregar relatório de vendas:', err))
        .finally(() => setCarregandoRelatorio(false));
    }
  };

  const exportarExcel = () => {
    const baseURL = api.defaults.baseURL || 'http://localhost:8000';
    const params = new URLSearchParams();
    if (dataInicio) params.append('data_inicio', dataInicio);
    if (dataFim) params.append('data_fim', dataFim);
    if (canalFiltro && canalFiltro !== 'todos') {
      params.append('canal', canalFiltro);
    }
    window.open(`${baseURL}/relatorios/vendas/exportar?${params.toString()}`, '_blank');
  };

  const handleSort = (field: SortFieldVendas) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const renderSortIcon = (field: SortFieldVendas) => {
    if (sortField !== field) return <ArrowUpDown size={12} style={{ opacity: 0.3, marginLeft: '4px', verticalAlign: 'middle' }} />;
    return sortDirection === 'asc'
      ? <ArrowUp size={12} style={{ color: colors.accent, marginLeft: '4px', verticalAlign: 'middle' }} />
      : <ArrowDown size={12} style={{ color: colors.accent, marginLeft: '4px', verticalAlign: 'middle' }} />;
  };

  const statCardStyle = {
    ...cardStyle,
    padding: '20px 24px',
  };

  const dadosResumo = relatorioVendas?.resumo || relatorioVendas;

  const vendasOrdenadas = [...(dadosResumo?.vendas || [])].sort((a: any, b: any) => {
    let valA = a[sortField];
    let valB = b[sortField];

    if (sortField === 'data') {
      valA = a.raw_date || a.data;
      valB = b.raw_date || b.data;
    }

    if (typeof valA === 'string') valA = valA.toLowerCase();
    if (typeof valB === 'string') valB = valB.toLowerCase();

    if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
    if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  return (
    <div>
      <PageHeader
        title="Visão Geral"
        subtitle="Resumo completo da saúde financeira, relatórios de vendas e controle de estoque."
      />

      {/* Faixa de estatísticas principais */}
      <div className="stagger" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '20px' }}>
        <div style={{ ...statCardStyle }}>
          <p style={{ margin: '0 0 8px 0', color: colors.textSecondary, fontSize: '13px', fontWeight: 500 }}>Valor Total em Estoque (Custo)</p>
          <strong style={{ color: colors.textPrimary, fontSize: '28px', fontWeight: 500, letterSpacing: '-0.025em', display: 'flex', alignItems: 'center', minHeight: '36px' }}>
            {valorTotalEstoque === null ? <SkeletonBox width="140px" height="28px" /> : <span className="value-in">{formatarMoeda(valorTotalEstoque)}</span>}
          </strong>
        </div>

        <div style={{ ...statCardStyle }}>
          <p style={{ margin: '0 0 8px 0', color: colors.textSecondary, fontSize: '13px', fontWeight: 500 }}>Lucro Potencial Estimado</p>
          <strong style={{ color: colors.textPrimary, fontSize: '28px', fontWeight: 500, letterSpacing: '-0.025em', display: 'flex', alignItems: 'center', minHeight: '36px' }}>
            {lucroPotencialTotal === null ? <SkeletonBox width="140px" height="28px" /> : <span className="value-in">{formatarMoeda(lucroPotencialTotal)}</span>}
          </strong>
        </div>

        <div style={{ ...statCardStyle }}>
          <p style={{ margin: '0 0 8px 0', color: colors.textSecondary, fontSize: '13px', fontWeight: 500 }}>Faturamento no Mês (Vendas)</p>
          <strong style={{ color: colors.textPrimary, fontSize: '28px', fontWeight: 500, letterSpacing: '-0.025em', display: 'flex', alignItems: 'center', minHeight: '36px' }}>
            {carregandoRelatorio ? <SkeletonBox width="140px" height="28px" /> : <span className="value-in">{formatarMoeda(relatorioVendas?.mes?.faturamento || 0)}</span>}
          </strong>
        </div>

        <div style={{ ...statCardStyle }}>
          <p style={{ margin: '0 0 8px 0', color: colors.textSecondary, fontSize: '13px', fontWeight: 500 }}>Produtos Zerados</p>
          <strong style={{ color: alertas.length > 0 ? colors.dangerText : colors.successText, fontSize: '28px', fontWeight: 500, letterSpacing: '-0.025em', display: 'flex', alignItems: 'center', minHeight: '36px' }}>
            {carregando ? <SkeletonBox width="50px" height="28px" /> : <span className="value-in">{alertas.length}</span>}
          </strong>
        </div>
      </div>

      {/* Relatório Interativo de Vendas com Intervalo de Data Personalizado */}
      <div style={{ ...cardStyle, marginBottom: '28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '18px' }}>
          <div>
            <h3 style={{ ...cardTitleStyle, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BarChart3 size={20} color={colors.accent} /> Relatório de Vendas & Desempenho
            </h3>
            <p style={{ ...cardDescStyle, margin: 0 }}>Consolidado de vendas por intervalo de data personalizado e canal.</p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            {/* Seletor de Intervalo de Datas (De / Até) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', maxWidth: '100%', backgroundColor: colors.bgApp, padding: '4px 10px', borderRadius: '8px', border: `1px solid ${colors.borderStrong}` }}>
              <label style={{ fontSize: '12px', color: colors.textSecondary, fontWeight: 600 }}>De:</label>
              <input
                type="date"
                value={dataInicio}
                onChange={(e) => {
                  const val = e.target.value;
                  setDataInicio(val);
                  carregarRelatorioVendas(val, dataFim, canalFiltro);
                }}
                style={{
                  ...inputStyle,
                  width: 'auto',
                  maxWidth: 'none',
                  margin: 0,
                  padding: '4px 8px',
                  fontSize: '12px',
                  color: colors.textPrimary,
                  backgroundColor: colors.bgSidebar,
                  border: `1px solid ${colors.border}`,
                  colorScheme: 'dark'
                }}
              />
              <label style={{ fontSize: '12px', color: colors.textSecondary, fontWeight: 600, marginLeft: '4px' }}>Até:</label>
              <input
                type="date"
                value={dataFim}
                onChange={(e) => {
                  const val = e.target.value;
                  setDataFim(val);
                  carregarRelatorioVendas(dataInicio, val, canalFiltro);
                }}
                style={{
                  ...inputStyle,
                  width: 'auto',
                  maxWidth: 'none',
                  margin: 0,
                  padding: '4px 8px',
                  fontSize: '12px',
                  color: colors.textPrimary,
                  backgroundColor: colors.bgSidebar,
                  border: `1px solid ${colors.border}`,
                  colorScheme: 'dark'
                }}
              />
            </div>

            {/* Seletor de Canal / Plataforma com Logos Oficiais */}
            <SeletorFiltroCanal
              canalFiltro={canalFiltro}
              onSelectCanal={(c) => {
                setCanalFiltro(c);
                carregarRelatorioVendas(dataInicio, dataFim, c);
              }}
            />

            {/* Botão Exportar para Excel */}
            <button
              onClick={exportarExcel}
              style={{
                padding: '7px 14px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 600,
                border: '1px solid color-mix(in srgb, var(--positive) 40%, transparent)',
                backgroundColor: 'color-mix(in srgb, var(--positive) 15%, transparent)',
                color: 'var(--positive)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
              title="Baixar relatório em formato Excel (.csv)"
            >
              <Download size={15} /> Exportar Excel
            </button>
          </div>
        </div>

        {/* Métricas do Período Selecionado */}
        {carregandoRelatorio ? (
          <SkeletonTable rows={4} cols={4} />
        ) : (
          <div>
            <div className="stagger" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
              <div style={{ backgroundColor: colors.bgApp, padding: '16px', borderRadius: '10px', border: `1px solid ${colors.border}` }}>
                <span style={{ fontSize: '12.5px', color: colors.textSecondary, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                  <ShoppingCart size={14} /> Unidades Vendidas
                </span>
                <strong style={{ fontSize: '22px', color: colors.textPrimary }}>{dadosResumo?.unidades_vendidas || 0} un.</strong>
              </div>

              <div style={{ backgroundColor: colors.bgApp, padding: '16px', borderRadius: '10px', border: `1px solid ${colors.border}` }}>
                <span style={{ fontSize: '12.5px', color: colors.textSecondary, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                  <DollarSign size={14} /> Faturamento Total
                </span>
                <strong style={{ fontSize: '22px', color: 'var(--accent-text)' }}>{formatarMoeda(dadosResumo?.faturamento || 0)}</strong>
              </div>

              <div style={{ backgroundColor: colors.bgApp, padding: '16px', borderRadius: '10px', border: `1px solid ${colors.border}` }}>
                <span style={{ fontSize: '12.5px', color: colors.textSecondary, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                  <TrendingUp size={14} /> Lucro Líquido Estimado
                </span>
                <strong style={{ fontSize: '22px', color: colors.successText }}>{formatarMoeda(dadosResumo?.lucro_estimado || 0)}</strong>
              </div>

              <div style={{ backgroundColor: colors.bgApp, padding: '16px', borderRadius: '10px', border: `1px solid ${colors.border}` }}>
                <span style={{ fontSize: '12.5px', color: colors.textSecondary, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                  <Package size={14} /> Pedidos / Operações
                </span>
                <strong style={{ fontSize: '22px', color: colors.textPrimary }}>{dadosResumo?.total_pedidos || 0} vendas</strong>
              </div>
            </div>

            {/* Tabela de Vendas Recentes do Período com Ordenação */}
            <h4 style={{ color: colors.textSecondary, fontSize: '13px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ClipboardList size={15} /> Detalhamento de Vendas (Clique nos cabeçalhos da tabela para ordenar)
            </h4>

            {(!vendasOrdenadas || vendasOrdenadas.length === 0) ? (
              <div style={{ padding: '20px', textAlign: 'center', color: colors.textMuted, backgroundColor: colors.bgApp, borderRadius: '8px', fontSize: '13.5px' }}>
                Nenhuma venda registrada neste período.
              </div>
            ) : (
              <div className="table-scroll">
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th onClick={() => handleSort('data')} style={{ ...tableHeaderStyle, cursor: 'pointer', userSelect: 'none' }}>
                        Data / Hora {renderSortIcon('data')}
                      </th>
                      <th onClick={() => handleSort('sku')} style={{ ...tableHeaderStyle, cursor: 'pointer', userSelect: 'none' }}>
                        SKU {renderSortIcon('sku')}
                      </th>
                      <th onClick={() => handleSort('nome')} style={{ ...tableHeaderStyle, cursor: 'pointer', userSelect: 'none' }}>
                        Produto {renderSortIcon('nome')}
                      </th>
                      <th onClick={() => handleSort('canal')} style={{ ...tableHeaderStyle, cursor: 'pointer', userSelect: 'none' }}>
                        Canal {renderSortIcon('canal')}
                      </th>
                      <th onClick={() => handleSort('quantidade')} style={{ ...tableHeaderStyle, cursor: 'pointer', userSelect: 'none' }}>
                        Qtd {renderSortIcon('quantidade')}
                      </th>
                      <th onClick={() => handleSort('faturamento')} style={{ ...tableHeaderStyle, cursor: 'pointer', userSelect: 'none' }}>
                        Faturamento {renderSortIcon('faturamento')}
                      </th>
                      <th onClick={() => handleSort('lucro_estimado')} style={{ ...tableHeaderStyle, cursor: 'pointer', userSelect: 'none' }}>
                        Lucro Est. {renderSortIcon('lucro_estimado')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {vendasOrdenadas.map((v: any) => (
                      <tr key={v.id}>
                        <td style={{ ...tableCellStyle, fontSize: '12.5px', color: colors.textSecondary, whiteSpace: 'nowrap' }}>{v.data}</td>
                        <td style={{ ...tableCellStyle, fontWeight: 'bold', color: colors.accent, whiteSpace: 'nowrap' }}>{v.sku}</td>
                        <td className="col-wrap" style={tableCellStyle}>{v.nome}</td>
                        <td style={{ ...tableCellStyle, color: colors.textPrimary, whiteSpace: 'nowrap', fontWeight: 500 }}>
                          {v.canal}
                        </td>
                        <td style={{ ...tableCellStyle, fontWeight: 'bold' }}>{v.quantidade} un.</td>
                        <td style={{ ...tableCellStyle, color: 'var(--accent-text)', fontWeight: 600 }}>{formatarMoeda(v.faturamento)}</td>
                        <td style={{ ...tableCellStyle, color: colors.successText, fontWeight: 600 }}>{formatarMoeda(v.lucro_estimado)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Radar de Estoque Zerado */}
      <div style={{ ...cardStyle }}>
        <h3 style={{ ...cardTitleStyle, color: alertas.length > 0 ? 'var(--negative)' : colors.successText, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertTriangle size={18} /> Radar de Produtos Zerados
        </h3>
        <p style={cardDescStyle}>Produtos cadastrados ativos que estão sem nenhuma unidade em estoque (estoque = 0).</p>

        {carregando ? (
          <SkeletonList count={3} />
        ) : alertas.length === 0 ? (
          <p style={{ color: colors.successText, fontWeight: 500, margin: '16px 0 0 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <CheckCircle2 size={16} /> Nenhum produto com estoque zerado no momento.
          </p>
        ) : (
          <ul style={{ listStyleType: 'none', padding: 0, margin: '16px 0 0 0' }}>
            {alertas.map(produto => (
              <li
                key={produto.id}
                style={{
                  padding: '13px 4px',
                  borderBottom: `1px solid ${colors.border}`,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '10px',
                  flexWrap: 'wrap',
                }}
              >
                <span style={{ color: colors.textSecondary }}>
                  <strong style={{ color: colors.textPrimary }}>{produto.sku}</strong> — {produto.nome}
                </span>
                <span
                  style={{
                    color: 'var(--negative)',
                    fontWeight: 'bold',
                    backgroundColor: 'var(--negative-border)',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '13px',
                  }}
                >
                  {produto.quantidade_estoque <= 0 ? '0 un. (ZERADO)' : `${produto.quantidade_estoque} un.`}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
