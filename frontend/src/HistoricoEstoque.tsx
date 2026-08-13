import { useState, useEffect } from 'react';
import { api } from './services/api';
import { PageHeader } from './ui';
import {
  colors, cardStyle, cardTitleStyle, cardDescStyle,
  inputStyle, btnNeutralStyle,
  tableHeaderStyle, tableCellStyle
} from './theme';
import { SkeletonTable } from './Skeleton';

export function HistoricoEstoque() {
  const [movimentacoes, setMovimentacoes] = useState<any[]>([]);
  const [carregando, setCarregando] = useState<boolean>(true);

  // Filtros
  const [buscaSku, setBuscaSku] = useState<string>('');
  const [filtroTipo, setFiltroTipo] = useState<string>('');
  const [dataInicio, setDataInicio] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  });
  const [dataFim, setDataFim] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });

  useEffect(() => {
    carregarMovimentacoes();
  }, [filtroTipo, dataInicio, dataFim]);

  const carregarMovimentacoes = async () => {
    try {
      setCarregando(true);
      const params = new URLSearchParams();
      if (filtroTipo) params.append('tipo', filtroTipo);
      if (dataInicio) params.append('data_inicio', dataInicio);
      if (dataFim) params.append('data_fim', dataFim);

      const res = await api.get(`/produtos/movimentacoes?${params.toString()}`);
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
      case 'VENDA':
      case 'VENDA_DIRETA':
        return (
          <span style={{ ...badgeBaseStyle, backgroundColor: colors.dangerBg, color: colors.dangerText, border: `1px solid ${colors.dangerBorder}` }}>
            🛒 VENDA
          </span>
        );
      case 'AJUSTE':
      case 'REAJUSTE':
        return (
          <span style={{ ...badgeBaseStyle, backgroundColor: 'rgba(59, 130, 246, 0.2)', color: colors.accent, border: '1px solid #2563eb' }}>
            ⚙️ REAJUSTE
          </span>
        );
      default:
        return (
          <span style={{ ...badgeBaseStyle, backgroundColor: colors.dangerBg, color: colors.dangerText, border: `1px solid ${colors.dangerBorder}` }}>
            🛒 VENDA
          </span>
        );
    }
  };

  const limparMotivoVisivel = (motivo: string) => {
    if (!motivo) return '';
    return motivo
      .replace(/\s*\(\s*R\$\s*[\d.,]+\/un[^)]*\)/gi, '')
      .replace(/\s*\(\s*emb=[SN]\s*,\s*etiq=[SN]\s*\)/gi, '')
      .trim();
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
        <p style={cardDescStyle}>Filtre as movimentações por intervalo de datas, SKU do produto, tipo de alteração ou palavra-chave.</p>

        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: 2, minWidth: '200px' }}>
            <input
              type="text"
              placeholder="Buscar por SKU, nome do produto ou motivo..."
              value={buscaSku}
              onChange={(e) => setBuscaSku(e.target.value)}
              style={{ ...inputStyle, width: '100%', maxWidth: 'none', margin: 0 }}
            />
          </div>

          {/* Seletor de Intervalo de Datas (De / Até) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: colors.bgApp, padding: '6px 12px', borderRadius: '8px', border: `1px solid ${colors.borderStrong}` }}>
            <label style={{ fontSize: '12px', color: colors.textSecondary, fontWeight: 600 }}>De:</label>
            <input
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
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
              onChange={(e) => setDataFim(e.target.value)}
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

          <div style={{ flex: 1, minWidth: '160px' }}>
            <select
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
              style={{ ...inputStyle, width: '100%', maxWidth: 'none', margin: 0, color: colors.textPrimary }}
            >
              <option value="">-- Todos os Tipos --</option>
              <option value="ENTRADA">📥 Entradas de Estoque</option>
              <option value="SAIDA">📤 Saídas / Baixas</option>
              <option value="VENDA">🛒 Vendas de Produtos</option>
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
          <SkeletonTable rows={6} cols={8} />
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
                  <th style={tableHeaderStyle}>Estoque</th>
                  <th style={tableHeaderStyle}>Motivo / Descrição</th>
                  <th style={tableHeaderStyle}>Responsável</th>
                </tr>
              </thead>
              <tbody>
                {movimentacoesFiltradas.map((m) => {
                  const motivoLimpo = limparMotivoVisivel(m.motivo);
                  return (
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
                        {m.tipo === 'ENTRADA' && (
                          <span style={{ color: colors.successText }}>
                            +{(m.qtd_alterada ?? m.quantidade_alterada ?? 1)} un.
                          </span>
                        )}
                        {(m.tipo === 'SAIDA' || m.tipo === 'VENDA_WEBHOOK' || m.tipo === 'VENDA' || m.tipo === 'VENDA_DIRETA') && (
                          <span style={{ color: colors.dangerText }}>
                            -{(m.qtd_alterada ?? m.quantidade_alterada ?? (m.estoque_anterior - m.estoque_novo))} un.
                          </span>
                        )}
                        {(m.tipo === 'AJUSTE' || m.tipo === 'REAJUSTE') && (
                          <span style={{ color: colors.textSecondary }}>
                            {(m.qtd_alterada ?? m.quantidade_alterada ?? 0) > 0 ? `+${m.qtd_alterada ?? m.quantidade_alterada}` : `${m.qtd_alterada ?? m.quantidade_alterada}`} un.
                          </span>
                        )}
                      </td>

                      {/* Coluna Ajustada: Estoque (Antes ➔ Depois) */}
                      <td style={{ ...tableCellStyle, fontSize: '13px', whiteSpace: 'nowrap' }}>
                        <span style={{ color: colors.textMuted }}>{m.estoque_anterior}</span>
                        {' ➔ '}
                        <strong style={{ color: colors.textPrimary }}>{m.estoque_novo} un.</strong>
                      </td>

                      {/* Motivo Limpo (sem tags internas emb=S/N, etiq=S/N) */}
                      <td style={{ ...tableCellStyle, fontSize: '13px', color: colors.textSecondary }}>
                        {motivoLimpo}
                      </td>

                      <td style={{ ...tableCellStyle, fontSize: '12.5px', color: colors.textMuted, whiteSpace: 'nowrap' }}>
                        👤 {m.usuario_nome}
                      </td>
                    </tr>
                  );
                })}
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
