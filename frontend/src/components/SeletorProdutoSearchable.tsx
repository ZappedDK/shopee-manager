import { useState, useEffect, useRef } from 'react';

interface SeletorProdutoProps {
  produtos: any[];
  skuSelecionado: string;
  onSelectSku: (sku: string) => void;
  colors: any;
  inputStyle: any;
}

export function SeletorProdutoSearchable({ produtos, skuSelecionado, onSelectSku, colors, inputStyle }: SeletorProdutoProps) {
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fecha o dropdown ao clicar fora do componente
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setAberto(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const produtoSelecionado = produtos.find(p => p.sku === skuSelecionado);

  const produtosFiltrados = produtos.filter(p => {
    if (!busca.trim()) return true;
    const b = busca.toLowerCase();
    return (
      (p.sku && p.sku.toLowerCase().includes(b)) ||
      (p.nome && p.nome.toLowerCase().includes(b))
    );
  });

  return (
    <div ref={dropdownRef} style={{ position: 'relative', width: '100%' }}>
      {/* Botão Principal Estilizado como Caixa de Seleção */}
      <div
        onClick={() => setAberto(!aberto)}
        style={{
          ...inputStyle,
          width: '100%',
          margin: 0,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'pointer',
          userSelect: 'none',
          backgroundColor: colors.cardBackground,
          borderColor: aberto ? colors.accent : colors.border,
          color: produtoSelecionado ? colors.textPrimary : colors.textSecondary,
          fontWeight: produtoSelecionado ? 'bold' : 'normal',
          fontSize: '13.5px',
          boxShadow: aberto ? `0 0 0 2px ${colors.accent}33` : 'none',
          transition: 'all 0.2s ease',
          boxSizing: 'border-box'
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: '8px' }}>
          {produtoSelecionado ? (
            <>
              <span style={{ color: colors.accent, fontWeight: 'bold' }}>{produtoSelecionado.sku}</span>
              {' — '}
              <span>{produtoSelecionado.nome}</span>
              <span style={{ color: colors.textSecondary, fontSize: '12px', marginLeft: '6px' }}>
                (Estoque: {produtoSelecionado.quantidade_estoque} un.)
              </span>
            </>
          ) : (
            'Selecione o produto para simulação...'
          )}
        </span>
        <span style={{ fontSize: '11px', color: colors.textSecondary }}>{aberto ? '▲' : '▼'}</span>
      </div>

      {/* Menu Dropdown Suspenso com Campo de Pesquisa Interno */}
      {aberto && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            right: 0,
            zIndex: 999,
            backgroundColor: colors.cardBackground,
            border: `1px solid ${colors.border}`,
            borderRadius: '10px',
            boxShadow: '0 12px 28px rgba(0,0,0,0.35)',
            padding: '10px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}
        >
          {/* Campo de Busca DENTRO do Dropdown */}
          <div>
            <input
              type="text"
              autoFocus
              placeholder="🔎 Pesquisar produto ou SKU..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              style={{
                ...inputStyle,
                width: '100%',
                margin: 0,
                fontSize: '12.5px',
                padding: '8px 12px',
                backgroundColor: colors.background,
                borderColor: colors.accent,
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Lista Scrollável de Produtos */}
          <div style={{ maxHeight: '210px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '3px' }}>
            {produtosFiltrados.length > 0 ? (
              produtosFiltrados.map((p) => {
                const eSelecionado = p.sku === skuSelecionado;
                return (
                  <div
                    key={p.id}
                    onClick={() => {
                      onSelectSku(p.sku);
                      setAberto(false);
                    }}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      backgroundColor: eSelecionado ? `${colors.accent}22` : 'transparent',
                      color: eSelecionado ? colors.accent : colors.textPrimary,
                      fontWeight: eSelecionado ? 'bold' : 'normal',
                      transition: 'background-color 0.15s ease'
                    }}
                    onMouseEnter={(e) => {
                      if (!eSelecionado) e.currentTarget.style.backgroundColor = `${colors.border}44`;
                    }}
                    onMouseLeave={(e) => {
                      if (!eSelecionado) e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', paddingRight: '8px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 600 }}>{p.sku} — {p.nome}</span>
                    </div>
                    <span
                      style={{
                        fontSize: '11px',
                        padding: '2px 8px',
                        borderRadius: '10px',
                        backgroundColor: p.quantidade_estoque > 5 ? '#10b98122' : '#f59e0b22',
                        color: p.quantidade_estoque > 5 ? '#10b981' : '#f59e0b',
                        fontWeight: 'bold',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {p.quantidade_estoque} un.
                    </span>
                  </div>
                );
              })
            ) : (
              <div style={{ padding: '12px', textAlign: 'center', fontSize: '12.5px', color: colors.textSecondary }}>
                Nenhum produto encontrado com "{busca}".
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
