import { useState, useEffect } from 'react';
import { api } from './services/api';
import { PageHeader } from './ui';
import { colors, cardStyle, cardTitleStyle, cardDescStyle, formatarMoeda } from './theme';

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

      // Lucro Potencial Estimado
      const totalLucro = produtos.reduce((soma: number, p: any) => {
        const qtd = p.quantidade_estoque || 0;
        let lucroUnitario = 0;
        if (p.analises_plataformas && p.analises_plataformas.length > 0) {
          const somaLucros = p.analises_plataformas.reduce((acc: number, item: any) => acc + (item.lucro_liquido || 0), 0);
          lucroUnitario = somaLucros / p.analises_plataformas.length;
        } else {
          lucroUnitario = (p.preco_venda || 0) - (p.custo_produto || 0);
        }
        return soma + (qtd * Math.max(0, lucroUnitario));
      }, 0);

      setLucroPotencialTotal(totalLucro);
    } catch (err) {
      console.error('Erro ao carregar valor do estoque:', err);
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
          <strong style={{ color: colors.successText, fontSize: '28px' }}>
            {valorTotalEstoque === null ? '...' : formatarMoeda(valorTotalEstoque)}
          </strong>
        </div>
        <div style={{ ...statCardStyle, borderLeft: `4px solid ${colors.accent}` }}>
          <p style={{ margin: '0 0 6px 0', color: colors.textSecondary, fontSize: '13px' }}>Lucro Potencial Estimado</p>
          <strong style={{ color: '#60a5fa', fontSize: '28px' }}>
            {lucroPotencialTotal === null ? '...' : formatarMoeda(lucroPotencialTotal)}
          </strong>
        </div>
        <div style={{ ...statCardStyle, borderLeft: `4px solid ${alertas.length > 0 ? colors.danger : colors.success}` }}>
          <p style={{ margin: '0 0 6px 0', color: colors.textSecondary, fontSize: '13px' }}>Produtos com Estoque Baixo</p>
          <strong style={{ color: alertas.length > 0 ? colors.dangerText : colors.successText, fontSize: '28px' }}>{alertas.length}</strong>
        </div>
      </div>

      {/* Radar de Estoque */}
      <div style={{ ...cardStyle, borderLeft: `4px solid ${colors.danger}` }}>
        <h3 style={{ ...cardTitleStyle, color: '#f87171' }}>⚠️ Radar de Estoque Local</h3>
        <p style={cardDescStyle}>Produtos com 10 ou menos unidades em estoque.</p>

        {carregando ? (
          <p style={{ color: colors.textSecondary }}>Carregando...</p>
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
