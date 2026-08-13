import { useState, useEffect, useRef } from 'react';
import { api } from './services/api';
import { PageHeader } from './ui';
import { PlatformIcon } from './PlatformIcon';
import {
  colors, cardStyle, cardTitleStyle, cardDescStyle,
  inputStyle, tableHeaderStyle, tableCellStyle, formatarMoeda
} from './theme';
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
            <span style={{ fontSize: '13px' }}>{opcaoAtual.id === 'direta' ? '🤝' : '🌐'}</span>
          )}
          <span>{opcaoAtual.nome}</span>
        </div>
        <span style={{ fontSize: '11px', color: colors.textSecondary, marginLeft: '6px' }}>
          {aberto ? '▲' : '▼'}
        </span>
      </div>

      {aberto && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            backgroundColor: colors.bgSidebar,
            border: `1px solid ${colors.borderStrong}`,
            borderRadius: '8px',
            boxShadow: '0 12px 30px rgba(0,0,0,0.6)',
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
                  backgroundColor: selecionado ? 'rgba(59,130,246,0.2)' : 'transparent',
                  color: selecionado ? '#fff' : colors.textPrimary,
                  fontWeight: selecionado ? 600 : 400,
                  marginBottom: '2px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
                onMouseEnter={(e) => {
                  if (!selecionado) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)';
                }}
                onMouseLeave={(e) => {
                  if (!selecionado) e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {op.icone ? (
                    <PlatformIcon nome={op.nome} size={16} />
                  ) : (
                    <span style={{ fontSize: '13px' }}>{op.id === 'direta' ? '🤝' : '🌐'}</span>
                  )}
                  <span>{op.nome}</span>
                </div>
                {selecionado && <span style={{ color: colors.accent, fontWeight: 'bold' }}>✓</span>}
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

  const carregarAlertas = async () => {
    try {
      setCarregando(true);
      const res = await api.get('/produtos/alertas?limite=0');
      setAlertas(res.data || []);
    } catch (err) {
      console.error('Erro ao carregar alertas:', err);
    } finally {
      setCarregando(false);
    }
  };

  const carregarValorEstoque = async () => {
    try {
      const res = await api.get('/produtos/detalhados');
      const produtos = res.data || [];

      // Custo Total em Estoque
      const totalCusto = produtos.reduce((soma: number, p: any) => soma + Math.max(0, p.valor_estoque || 0), 0);
      setValorTotalEstoque(totalCusto);

      // Lucro Potencial Total (Lucro da Shopee por padrão ou primeira plataforma disponível)
      const lucroTotal = produtos.reduce((soma: number, p: any) => {
        if (!p.ativo) return soma;
        const shopee = p.analises_plataformas?.find((plat: any) => plat.plataforma_nome?.toLowerCase().includes('shopee'));
        const analise = shopee || p.analises_plataformas?.[0];
        const lucroUn = analise?.lucro_liquido || 0;
        return soma + (lucroUn * Math.max(0, p.quantidade_estoque || 0));
      }, 0);

      setLucroPotencialTotal(lucroTotal);
    } catch (err) {
      console.error('Erro ao calcular valor do estoque:', err);
    }
  };

  const carregarRelatorioVendas = async (inicio?: string, fim?: string, canal?: string) => {
    try {
      setCarregandoRelatorio(true);
      const targetInicio = inicio !== undefined ? inicio : dataInicio;
      const targetFim = fim !== undefined ? fim : dataFim;
      const targetCanal = canal !== undefined ? canal : canalFiltro;

      const params = new URLSearchParams();
      if (targetInicio) params.append('data_inicio', targetInicio);
      if (targetFim) params.append('data_fim', targetFim);
      if (targetCanal && targetCanal !== 'todos') params.append('canal', targetCanal);

      const res = await api.get(`/relatorios/vendas?${params.toString()}`);
      setRelatorioVendas(res.data);
    } catch (err) {
      console.error('Erro ao carregar relatório de vendas:', err);
    } finally {
      setCarregandoRelatorio(false);
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
    if (sortField !== field) return <span style={{ opacity: 0.3, marginLeft: '4px' }}>↕</span>;
    return <span style={{ color: colors.accent, marginLeft: '4px', fontWeight: 'bold' }}>{sortDirection === 'asc' ? '▲' : '▼'}</span>;
  };

  const statCardStyle = {
    ...cardStyle,
    padding: '20px 24px',
    flex: 1,
    minWidth: '220px',
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
      <div style={{ display: 'flex', gap: '20px', marginBottom: '28px', flexWrap: 'wrap' }}>
        <div style={{ ...statCardStyle, borderLeft: `4px solid ${colors.success}` }}>
          <p style={{ margin: '0 0 6px 0', color: colors.textSecondary, fontSize: '13px' }}>Valor Total em Estoque (Custo)</p>
          <strong style={{ color: colors.successText, fontSize: '26px', display: 'flex', alignItems: 'center', minHeight: '34px' }}>
            {valorTotalEstoque === null ? <SkeletonBox width="140px" height="28px" /> : formatarMoeda(valorTotalEstoque)}
          </strong>
        </div>

        <div style={{ ...statCardStyle, borderLeft: `4px solid ${colors.accent}` }}>
          <p style={{ margin: '0 0 6px 0', color: colors.textSecondary, fontSize: '13px' }}>Lucro Potencial Estimado</p>
          <strong style={{ color: '#60a5fa', fontSize: '26px', display: 'flex', alignItems: 'center', minHeight: '34px' }}>
            {lucroPotencialTotal === null ? <SkeletonBox width="140px" height="28px" /> : formatarMoeda(lucroPotencialTotal)}
          </strong>
        </div>

        <div style={{ ...statCardStyle, borderLeft: `4px solid ${colors.purple}` }}>
          <p style={{ margin: '0 0 6px 0', color: colors.textSecondary, fontSize: '13px' }}>Faturamento no Mês (Vendas)</p>
          <strong style={{ color: '#c084fc', fontSize: '26px', display: 'flex', alignItems: 'center', minHeight: '34px' }}>
            {carregandoRelatorio ? <SkeletonBox width="140px" height="28px" /> : formatarMoeda(relatorioVendas?.mes?.faturamento || 0)}
          </strong>
        </div>

        <div style={{ ...statCardStyle, borderLeft: `4px solid ${alertas.length > 0 ? colors.danger : colors.success}` }}>
          <p style={{ margin: '0 0 6px 0', color: colors.textSecondary, fontSize: '13px' }}>Produtos Zerados</p>
          <strong style={{ color: alertas.length > 0 ? colors.dangerText : colors.successText, fontSize: '26px', display: 'flex', alignItems: 'center', minHeight: '34px' }}>
            {carregando ? <SkeletonBox width="50px" height="28px" /> : alertas.length}
          </strong>
        </div>
      </div>

      {/* Relatório Interativo de Vendas com Intervalo de Data Personalizado */}
      <div style={{ ...cardStyle, marginBottom: '28px', borderLeft: `4px solid ${colors.accent}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '18px' }}>
          <div>
            <h3 style={cardTitleStyle}>📊 Relatório de Vendas & Desempenho</h3>
            <p style={{ ...cardDescStyle, margin: 0 }}>Consolidado de vendas por intervalo de data personalizado e canal.</p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            {/* Seletor de Intervalo de Datas (De / Até) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: colors.bgApp, padding: '4px 10px', borderRadius: '8px', border: `1px solid ${colors.borderStrong}` }}>
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
                border: '1px solid rgba(16, 185, 129, 0.4)',
                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                color: '#34d399',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: '0.15s'
              }}
              title="Baixar relatório em formato Excel (.csv)"
            >
              📥 Exportar Excel
            </button>
          </div>
        </div>

        {/* Métricas do Período Selecionado */}
        {carregandoRelatorio ? (
          <SkeletonTable rows={4} cols={4} />
        ) : (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
              <div style={{ backgroundColor: colors.bgApp, padding: '16px', borderRadius: '10px', border: `1px solid ${colors.border}` }}>
                <span style={{ fontSize: '12.5px', color: colors.textSecondary, display: 'block', marginBottom: '4px' }}>🛒 Unidades Vendidas</span>
                <strong style={{ fontSize: '22px', color: colors.textPrimary }}>{dadosResumo?.unidades_vendidas || 0} un.</strong>
              </div>

              <div style={{ backgroundColor: colors.bgApp, padding: '16px', borderRadius: '10px', border: `1px solid ${colors.border}` }}>
                <span style={{ fontSize: '12.5px', color: colors.textSecondary, display: 'block', marginBottom: '4px' }}>💵 Faturamento Total</span>
                <strong style={{ fontSize: '22px', color: '#60a5fa' }}>{formatarMoeda(dadosResumo?.faturamento || 0)}</strong>
              </div>

              <div style={{ backgroundColor: colors.bgApp, padding: '16px', borderRadius: '10px', border: `1px solid ${colors.border}` }}>
                <span style={{ fontSize: '12.5px', color: colors.textSecondary, display: 'block', marginBottom: '4px' }}>📈 Lucro Líquido Estimado</span>
                <strong style={{ fontSize: '22px', color: colors.successText }}>{formatarMoeda(dadosResumo?.lucro_estimado || 0)}</strong>
              </div>

              <div style={{ backgroundColor: colors.bgApp, padding: '16px', borderRadius: '10px', border: `1px solid ${colors.border}` }}>
                <span style={{ fontSize: '12.5px', color: colors.textSecondary, display: 'block', marginBottom: '4px' }}>📋 Pedidos / Operações</span>
                <strong style={{ fontSize: '22px', color: colors.textPrimary }}>{dadosResumo?.total_pedidos || 0} vendas</strong>
              </div>
            </div>

            {/* Tabela de Vendas Recentes do Período com Ordenação */}
            <h4 style={{ color: colors.textSecondary, fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
              📜 Detalhamento de Vendas (Clique nos cabeçalhos da tabela para ordenar)
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
                        <td style={tableCellStyle}>{v.nome}</td>
                        <td style={{ ...tableCellStyle, color: colors.textPrimary, whiteSpace: 'nowrap', fontWeight: 500 }}>
                          {v.canal}
                        </td>
                        <td style={{ ...tableCellStyle, fontWeight: 'bold' }}>{v.quantidade} un.</td>
                        <td style={{ ...tableCellStyle, color: '#60a5fa', fontWeight: 600 }}>{formatarMoeda(v.faturamento)}</td>
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
      <div style={{ ...cardStyle, borderLeft: `4px solid ${alertas.length > 0 ? colors.danger : colors.success}` }}>
        <h3 style={{ ...cardTitleStyle, color: alertas.length > 0 ? '#f87171' : colors.successText }}>
          🚨 Radar de Produtos Zerados
        </h3>
        <p style={cardDescStyle}>Produtos cadastrados ativos que estão sem nenhuma unidade em estoque (estoque = 0).</p>

        {carregando ? (
          <SkeletonList count={3} />
        ) : alertas.length === 0 ? (
          <p style={{ color: colors.successText, fontWeight: 500, margin: '16px 0 0 0' }}>
            ✅ Nenhum produto com estoque zerado no momento.
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
                    color: '#fecaca',
                    fontWeight: 'bold',
                    backgroundColor: '#7f1d1d',
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
