import { useState, useEffect } from 'react';
import { api } from './services/api';
import { PageHeader } from './ui';
import { colors, cardStyle, cardTitleStyle, cardDescStyle, formatarMoeda } from './theme';
import { SkeletonBox, SkeletonList } from './Skeleton';

export function Dashboard() {
  const [alertas, setAlertas] = useState<any[]>([]);
  const [valorTotalEstoque, setValorTotalEstoque] = useState<number | null>(null);
  const [lucroPotencialTotal, setLucroPotencialTotal] = useState<number | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    carregarAlertas();
    carregarValorEstoque();
  }, []);

  const carregarAlertas = async () => {
    try {
      setCarregando(true);
      const res = await api.get('/produtos/alertas?limite=10');
      setAlertas(res.data);
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
        if (!p.ativo) return soma; // Ignora inativos
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

  const statCardStyle = {
    ...cardStyle,
    padding: '20px 24px',
    flex: 1,
    minWidth: '220px',
  };

  return (
    <div>
      <PageHeader
        title="Visão Geral"
        subtitle="Resumo rápido da saúde financeira e controle do seu estoque."
      />

      {/* Faixa de estatísticas */}
      <div style={{ display: 'flex', gap: '20px', marginBottom: '28px', flexWrap: 'wrap' }}>
        <div style={{ ...statCardStyle, borderLeft: `4px solid ${colors.success}` }}>
          <p style={{ margin: '0 0 6px 0', color: colors.textSecondary, fontSize: '13px' }}>Valor Total em Estoque (Custo)</p>
          <strong style={{ color: colors.successText, fontSize: '28px', display: 'flex', alignItems: 'center', minHeight: '34px' }}>
            {valorTotalEstoque === null ? <SkeletonBox width="140px" height="28px" /> : formatarMoeda(valorTotalEstoque)}
          </strong>
        </div>
        <div style={{ ...statCardStyle, borderLeft: `4px solid ${colors.accent}` }}>
          <p style={{ margin: '0 0 6px 0', color: colors.textSecondary, fontSize: '13px' }}>Lucro Potencial Estimado</p>
          <strong style={{ color: '#60a5fa', fontSize: '28px', display: 'flex', alignItems: 'center', minHeight: '34px' }}>
            {lucroPotencialTotal === null ? <SkeletonBox width="140px" height="28px" /> : formatarMoeda(lucroPotencialTotal)}
          </strong>
        </div>
        <div style={{ ...statCardStyle, borderLeft: `4px solid ${alertas.length > 0 ? colors.danger : colors.success}` }}>
          <p style={{ margin: '0 0 6px 0', color: colors.textSecondary, fontSize: '13px' }}>Produtos com Estoque Baixo</p>
          <strong style={{ color: alertas.length > 0 ? colors.dangerText : colors.successText, fontSize: '28px', display: 'flex', alignItems: 'center', minHeight: '34px' }}>
            {carregando ? <SkeletonBox width="50px" height="28px" /> : alertas.length}
          </strong>
        </div>
      </div>

      {/* Radar de Estoque */}
      <div style={{ ...cardStyle, borderLeft: `4px solid ${colors.danger}` }}>
        <h3 style={{ ...cardTitleStyle, color: '#f87171' }}>⚠️ Radar de Estoque Local</h3>
        <p style={cardDescStyle}>Produtos com 10 ou menos unidades em estoque.</p>

        {carregando ? (
          <SkeletonList count={3} />
        ) : alertas.length === 0 ? (
          <p style={{ color: colors.successText, fontWeight: 500 }}>✅ Todos os produtos com estoque saudável.</p>
        ) : (
          <ul style={{ listStyleType: 'none', padding: 0, margin: 0 }}>
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
                  {produto.quantidade_estoque} un.
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
