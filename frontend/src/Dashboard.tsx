import { useState, useEffect } from 'react';
import { api } from './services/api';
import { PageHeader } from './ui';
import {
  colors, cardStyle, cardTitleStyle, cardDescStyle,
  tableHeaderStyle, tableCellStyle, formatarMoeda
} from './theme';
import { SkeletonBox, SkeletonList, SkeletonTable } from './Skeleton';

type PeriodoRelatorio = 'hoje' | 'semana' | 'mes';

export function Dashboard() {
  const [alertas, setAlertas] = useState<any[]>([]);
  const [valorTotalEstoque, setValorTotalEstoque] = useState<number | null>(null);
  const [lucroPotencialTotal, setLucroPotencialTotal] = useState<number | null>(null);
  const [carregando, setCarregando] = useState(true);

  // Relatório de Vendas
  const [periodo, setPeriodo] = useState<PeriodoRelatorio>('mes');
  const [relatorioVendas, setRelatorioVendas] = useState<any>(null);
  const [carregandoRelatorio, setCarregandoRelatorio] = useState(true);

  useEffect(() => {
    carregarAlertas();
    carregarValorEstoque();
    carregarRelatorioVendas();
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
      const totalCusto = produtos.reduce((soma: number, p: any) => soma + (p.valor_estoque || 0), 0);
      setValorTotalEstoque(totalCusto);

      // Lucro Potencial Total (Lucro da Shopee por padrão ou primeira plataforma disponível)
      const lucroTotal = produtos.reduce((soma: number, p: any) => {
        if (!p.ativo) return soma;
        const shopee = p.analises_plataformas?.find((plat: any) => plat.plataforma_nome?.toLowerCase().includes('shopee'));
        const analise = shopee || p.analises_plataformas?.[0];
        const lucroUn = analise?.lucro_liquido || 0;
        return soma + (lucroUn * (p.quantidade_estoque || 0));
      }, 0);

      setLucroPotencialTotal(lucroTotal);
    } catch (err) {
      console.error('Erro ao calcular valor do estoque:', err);
    }
  };

  const carregarRelatorioVendas = async () => {
    try {
      setCarregandoRelatorio(true);
      const res = await api.get('/relatorios/vendas');
      setRelatorioVendas(res.data);
    } catch (err) {
      console.error('Erro ao carregar relatório de vendas:', err);
    } finally {
      setCarregandoRelatorio(false);
    }
  };

  const exportarExcel = () => {
    const baseURL = api.defaults.baseURL || 'http://localhost:8000';
    window.open(`${baseURL}/relatorios/vendas/exportar?periodo=${periodo}`, '_blank');
  };

  const statCardStyle = {
    ...cardStyle,
    padding: '20px 24px',
    flex: 1,
    minWidth: '220px',
  };

  const dadosPeriodo = relatorioVendas ? relatorioVendas[periodo] : null;

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

      {/* Relatório Interativo de Vendas (Dia / Semana / Mês) */}
      <div style={{ ...cardStyle, marginBottom: '28px', borderLeft: `4px solid ${colors.accent}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '18px' }}>
          <div>
            <h3 style={cardTitleStyle}>📊 Relatório de Vendas & Desempenho</h3>
            <p style={{ ...cardDescStyle, margin: 0 }}>Consolidado de vendas por período: filtre por Dia, Semana ou Mês.</p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            {/* Botões de Seleção de Período */}
            <div style={{ display: 'flex', gap: '8px', backgroundColor: colors.bgApp, padding: '4px', borderRadius: '8px', border: `1px solid ${colors.borderStrong}` }}>
              <button
                onClick={() => setPeriodo('hoje')}
                style={{
                  padding: '6px 16px',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: periodo === 'hoje' ? 'rgba(59, 130, 246, 0.25)' : 'transparent',
                  color: periodo === 'hoje' ? '#60a5fa' : colors.textSecondary,
                  transition: '0.15s'
                }}
              >
                📅 Hoje
              </button>
              <button
                onClick={() => setPeriodo('semana')}
                style={{
                  padding: '6px 16px',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: periodo === 'semana' ? 'rgba(59, 130, 246, 0.25)' : 'transparent',
                  color: periodo === 'semana' ? '#60a5fa' : colors.textSecondary,
                  transition: '0.15s'
                }}
              >
                🗓️ Esta Semana (7d)
              </button>
              <button
                onClick={() => setPeriodo('mes')}
                style={{
                  padding: '6px 16px',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: periodo === 'mes' ? 'rgba(59, 130, 246, 0.25)' : 'transparent',
                  color: periodo === 'mes' ? '#60a5fa' : colors.textSecondary,
                  transition: '0.15s'
                }}
              >
                📊 Este Mês (30d)
              </button>
            </div>

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
                <strong style={{ fontSize: '22px', color: colors.textPrimary }}>{dadosPeriodo?.unidades_vendidas || 0} un.</strong>
              </div>

              <div style={{ backgroundColor: colors.bgApp, padding: '16px', borderRadius: '10px', border: `1px solid ${colors.border}` }}>
                <span style={{ fontSize: '12.5px', color: colors.textSecondary, display: 'block', marginBottom: '4px' }}>💵 Faturamento Total</span>
                <strong style={{ fontSize: '22px', color: '#60a5fa' }}>{formatarMoeda(dadosPeriodo?.faturamento || 0)}</strong>
              </div>

              <div style={{ backgroundColor: colors.bgApp, padding: '16px', borderRadius: '10px', border: `1px solid ${colors.border}` }}>
                <span style={{ fontSize: '12.5px', color: colors.textSecondary, display: 'block', marginBottom: '4px' }}>📈 Lucro Líquido Estimado</span>
                <strong style={{ fontSize: '22px', color: colors.successText }}>{formatarMoeda(dadosPeriodo?.lucro_estimado || 0)}</strong>
              </div>

              <div style={{ backgroundColor: colors.bgApp, padding: '16px', borderRadius: '10px', border: `1px solid ${colors.border}` }}>
                <span style={{ fontSize: '12.5px', color: colors.textSecondary, display: 'block', marginBottom: '4px' }}>📋 Pedidos / Operações</span>
                <strong style={{ fontSize: '22px', color: colors.textPrimary }}>{dadosPeriodo?.total_pedidos || 0} vendas</strong>
              </div>
            </div>

            {/* Tabela de Vendas Recentes do Período */}
            <h4 style={{ color: colors.textSecondary, fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
              📜 Últimas Vendas ({periodo === 'hoje' ? 'Hoje' : periodo === 'semana' ? 'Últimos 7 dias' : 'Últimos 30 dias'})
            </h4>

            {(!dadosPeriodo?.vendas || dadosPeriodo.vendas.length === 0) ? (
              <div style={{ padding: '20px', textAlign: 'center', color: colors.textMuted, backgroundColor: colors.bgApp, borderRadius: '8px', fontSize: '13.5px' }}>
                Nenhuma venda registrada neste período.
              </div>
            ) : (
              <div className="table-scroll">
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={tableHeaderStyle}>Data / Hora</th>
                      <th style={tableHeaderStyle}>SKU</th>
                      <th style={tableHeaderStyle}>Produto</th>
                      <th style={tableHeaderStyle}>Canal</th>
                      <th style={tableHeaderStyle}>Qtd</th>
                      <th style={tableHeaderStyle}>Faturamento</th>
                      <th style={tableHeaderStyle}>Lucro Est.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dadosPeriodo.vendas.map((v: any) => (
                      <tr key={v.id}>
                        <td style={{ ...tableCellStyle, fontSize: '12.5px', color: colors.textSecondary, whiteSpace: 'nowrap' }}>{v.data}</td>
                        <td style={{ ...tableCellStyle, fontWeight: 'bold', color: colors.accent, whiteSpace: 'nowrap' }}>{v.sku}</td>
                        <td style={tableCellStyle}>{v.nome}</td>
                        <td style={{ ...tableCellStyle, whiteSpace: 'nowrap' }}>
                          <span style={{
                            padding: '3px 8px',
                            borderRadius: '4px',
                            fontSize: '11.5px',
                            fontWeight: 600,
                            backgroundColor: v.canal === 'Shopee' ? 'rgba(245, 158, 11, 0.18)' : (v.canal === 'TikTok' ? 'rgba(6, 182, 212, 0.18)' : 'rgba(59, 130, 246, 0.18)'),
                            color: v.canal === 'Shopee' ? '#fbbf24' : (v.canal === 'TikTok' ? '#38bdf8' : '#60a5fa'),
                            border: `1px solid ${v.canal === 'Shopee' ? 'rgba(245, 158, 11, 0.3)' : (v.canal === 'TikTok' ? 'rgba(6, 182, 212, 0.3)' : 'rgba(59, 130, 246, 0.3)')}`
                          }}>
                            {v.canal}
                          </span>
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
