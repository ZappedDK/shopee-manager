import { useState, useEffect, useRef } from 'react';

interface SeletorProdutoSearchableProps {
  produtos: any[];
  skuSelecionado: string;
  onSelectSku: (sku: string) => void;
  colors: any;
  inputStyle: any;
}

export function SeletorProdutoSearchable({ produtos, skuSelecionado, onSelectSku, colors, inputStyle }: SeletorProdutoSearchableProps) {
  const [aberto, setAberto] = useState(false);
  const [termoBusca, setTermoBusca] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const produtoAtual = produtos.find(p => p.sku === skuSelecionado);

  const produtosFiltrados = produtos.filter((p) => {
    const t = termoBusca.toLowerCase().trim();
    if (!t) return true;
    return (p.sku && p.sku.toLowerCase().includes(t)) || (p.nome && p.nome.toLowerCase().includes(t));
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
      {/* Campo Principal (Clique para abrir) - Idêntico ao Simulador de Preço */}
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
          border: `1px solid ${aberto ? (colors.accent || '#3b82f6') : (colors.borderStrong || colors.border || '#374151')}`,
          backgroundColor: colors.bgInput || colors.cardBackground || '#1f2937',
          userSelect: 'none',
          boxSizing: 'border-box'
        }}
      >
        <span style={{ color: produtoAtual ? (colors.textPrimary || '#fff') : (colors.textMuted || colors.textSecondary || '#9ca3af'), overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {produtoAtual ? `📦 ${produtoAtual.sku} — ${produtoAtual.nome} (Estoque: ${produtoAtual.quantidade_estoque ?? 0} un.)` : 'Selecione um produto...'}
        </span>
        <span style={{ fontSize: '12px', color: colors.textSecondary || '#9ca3af', marginLeft: '8px' }}>
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
            backgroundColor: colors.bgSidebar || colors.cardBackground || '#111827',
            border: `1px solid ${colors.borderStrong || colors.border || '#374151'}`,
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
              backgroundColor: colors.bgApp || colors.background || '#030712',
              boxSizing: 'border-box'
            }}
          />

          {/* Lista de Opções */}
          <div style={{ maxHeight: '220px', overflowY: 'auto' }}>
            {produtosFiltrados.length === 0 ? (
              <div style={{ padding: '10px', color: colors.textMuted || '#6b7280', textAlign: 'center', fontSize: '13px' }}>
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
                      color: selecionado ? '#fff' : (colors.textPrimary || '#f3f4f6'),
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
                      <strong style={{ color: colors.accent || '#3b82f6' }}>{p.sku}</strong> — {p.nome}
                    </span>
                    <span style={{ fontSize: '12px', color: colors.textSecondary || '#9ca3af', marginLeft: '8px' }}>
                      Estoque: {p.quantidade_estoque ?? 0} un.
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
