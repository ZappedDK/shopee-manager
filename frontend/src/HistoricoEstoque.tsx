import { useState, useEffect } from 'react';
import { api } from './services/api';
import { PageHeader } from './ui';
import {
  colors, cardStyle, cardTitleStyle, cardDescStyle,
  inputStyle, btnNeutralStyle,
  tableHeaderStyle, tableCellStyle
} from './theme';

export function HistoricoEstoque() {
  const [movimentacoes, setMovimentacoes] = useState<any[]>([]);
  const [carregando, setCarregando] = useState<boolean>(true);

  // Filtros
  const [buscaSku, setBuscaSku] = useState<string>('');
  const [filtroTipo, setFiltroTipo] = useState<string>('');

  useEffect(() => {
    carregarMovimentacoes();
  }, [filtroTipo]);

  const carregarMovimentacoes = async () => {
    try {
      setCarregando(true);
      const url = filtroTipo ? `/produtos/movimentacoes?tipo=${filtroTipo}` : '/produtos/movimentacoes';
      const res = await api.get(url);
      setMovimentacoes(res.data || []);
    } catch (err) {
      console.error('Erro ao carregar histórico de movimentações:', err);
    } finally {
      setCarregando(false);
    }
  };

  const movimentacoesFiltradas = movimentacoes.filter((m) => {
    const termo = buscaSku.toLowerCase().trim();
    if (!termo) return true;
    return (
      m.produto_sku.toLowerCase().includes(termo) ||
      m.produto_nome.toLowerCase().includes(termo) ||
      m.motivo.toLowerCase().includes(termo)
    );
  });

  const getTipoBadge = (tipo: string) => {
    const badgeBaseStyle = {
      display: 'inline-block',
      whiteSpace: 'nowrap' as const,
      padding: '4px 10px',
      borderRadius: '6px',
      fontSize: '12px',
      fontWeight: 600,
    };

    switch (tipo) {
      case 'ENTRADA':
        return (
          <span style={{ ...badgeBaseStyle, backgroundColor: colors.successBg, color: colors.successText, border: `1px solid ${colors.successBorder}` }}>
            📥 ENTRADA
          </span>
        );
      case 'SAIDA':
        return (
          <span style={{ ...badgeBaseStyle, backgroundColor: colors.dangerBg, color: colors.dangerText, border: `1px solid ${colors.dangerBorder}` }}>
            📤 SAÍDA
          </span>
        );
      case 'VENDA_WEBHOOK':
        return (
          <span style={{ ...badgeBaseStyle, backgroundColor: 'rgba(139, 92, 246, 0.2)', color: colors.purple, border: '1px solid #7c3aed' }}>
            🛒 VENDA (WEBHOOK)
          </span>
        );
      default:
        return (
          <span style={{ ...badgeBaseStyle, backgroundColor: 'rgba(59, 130, 246, 0.2)', color: colors.accent, border: '1px solid #2563eb' }}>
            ⚙️ REAJUSTE
          </span>
        );
    }
  };

  return (
    <div>
      <PageHeader
        title="📋 Histórico de Movimentação de Estoque"
        subtitle="Rastreabilidade completa de todas as alterações de estoque, vendas e reajustes de custos."
      />

      {/* Cards de Filtros e Resumo */}
      <div style={{ ...cardStyle, marginBottom: '24px' }}>
        <h3 style={cardTitleStyle}>🔍 Filtrar Auditoria</h3>
        <p style={cardDescStyle}>Filtre as movimentações por SKU do produto, tipo de alteração ou palavra-chave.</p>

        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: 2, minWidth: '220px' }}>
            <input
              type="text"
              placeholder="Buscar por SKU, nome do produto ou motivo..."
              value={buscaSku}
              onChange={(e) => setBuscaSku(e.target.value)}
              style={{ ...inputStyle, width: '100%', maxWidth: 'none', margin: 0 }}
            />
          </div>

          <div style={{ flex: 1, minWidth: '180px' }}>
            <select
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
              style={{ ...inputStyle, width: '100%', maxWidth: 'none', margin: 0, color: colors.textPrimary }}
            >
              <option value="">-- Todos os Tipos --</option>
              <option value="ENTRADA">📥 Entradas de Estoque</option>
              <option value="SAIDA">📤 Saídas / Baixas</option>
              <option value="VENDA_WEBHOOK">🛒 Vendas Webhook</option>
              <option value="AJUSTE">⚙️ Reajustes / Alterações</option>
            </select>
          </div>

          <button
            onClick={carregarMovimentacoes}
            style={{ ...btnNeutralStyle, padding: '10px 16px', fontSize: '13.5px' }}
          >
            🔄 Atualizar
          </button>
        </div>
      </div>

      {/* Tabela de Histórico */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ ...cardTitleStyle, margin: 0 }}>📜 Registro de Alterações ({movimentacoesFiltradas.length})</h3>
        </div>

        {carregando ? (
          <p style={{ color: colors.textSecondary }}>Carregando histórico...</p>
        ) : (
          <div className="table-scroll">
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={tableHeaderStyle}>Data & Hora</th>
                  <th style={tableHeaderStyle}>SKU</th>
                  <th style={tableHeaderStyle}>Nome do Produto</th>
                  <th style={tableHeaderStyle}>Tipo</th>
                  <th style={tableHeaderStyle}>Qtd. Alterada</th>
                  <th style={tableHeaderStyle}>Estoque (Antes ➔ Depois)</th>
                  <th style={tableHeaderStyle}>Motivo / Descrição</th>
                  <th style={tableHeaderStyle}>Responsável</th>
                </tr>
              </thead>
              <tbody>
                {movimentacoesFiltradas.map((m) => (
                  <tr key={m.id}>
                    <td style={{ ...tableCellStyle, fontSize: '13px', color: colors.textSecondary, whiteSpace: 'nowrap' }}>
                      {m.criado_em}
                    </td>

                    <td style={{ ...tableCellStyle, whiteSpace: 'nowrap' }}>
                      <strong style={{ color: colors.accent }}>{m.produto_sku}</strong>
                    </td>

                    <td style={{ ...tableCellStyle, minWidth: '180px' }}>
                      {m.produto_nome}
                    </td>

                    <td style={{ ...tableCellStyle, whiteSpace: 'nowrap', minWidth: '140px' }}>
                      {getTipoBadge(m.tipo)}
                    </td>

                    <td style={{ ...tableCellStyle, fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                      {m.tipo === 'ENTRADA' && <span style={{ color: colors.successText }}>+{m.quantidade_alterada} un.</span>}
                      {(m.tipo === 'SAIDA' || m.tipo === 'VENDA_WEBHOOK') && <span style={{ color: colors.dangerText }}>-{m.quantidade_alterada} un.</span>}
                      {m.tipo === 'AJUSTE' && <span style={{ color: colors.textSecondary }}>{m.quantidade_alterada > 0 ? `+${m.quantidade_alterada}` : `${m.quantidade_alterada}`} un.</span>}
                    </td>

                    <td style={{ ...tableCellStyle, fontSize: '13.5px', whiteSpace: 'nowrap' }}>
                      <span style={{ color: colors.textMuted }}>{m.estoque_anterior} un.</span>
                      {' ➔ '}
                      <strong style={{ color: colors.textPrimary }}>{m.estoque_novo} un.</strong>
                    </td>

                    <td style={{ ...tableCellStyle, fontSize: '13px', color: colors.textSecondary }}>
                      {m.motivo}
                    </td>

                    <td style={{ ...tableCellStyle, fontSize: '12.5px', color: colors.textMuted, whiteSpace: 'nowrap' }}>
                      👤 {m.usuario_nome}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {movimentacoesFiltradas.length === 0 && !carregando && (
          <p style={{ textAlign: 'center', color: colors.textMuted, marginTop: '24px' }}>
            Nenhuma movimentação de estoque encontrada.
          </p>
        )}
      </div>
    </div>
  );
}
