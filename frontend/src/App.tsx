import React, { useState, useEffect } from 'react';
import { PlatformIcon } from './PlatformIcon';
import { api } from './services/api';
import { Dashboard } from './Dashboard';
import { Login } from './Login';
import { SimuladorPreco } from './SimuladorPreco';
import { ModalEditarProduto } from './ModalEditarProduto';
import { ModalEditarPlataforma } from './ModalEditarPlataforma';
import { HistoricoEstoque } from './HistoricoEstoque';
import { ImportarProdutosModal } from './ImportarProdutosModal';
import { GestaoUsuarios } from './GestaoUsuarios';
import { IntegracaoShopee } from './IntegracaoShopee';
import { IntegracaoTikTok } from './IntegracaoTikTok';
import { VendaDireta } from './VendaDireta';
import { PageHeader, MessageBanner, CollapsibleCard } from './ui';
import { SkeletonTable } from './Skeleton';
import {
  colors, layoutStyle, sidebarStyle, contentStyle, sidebarGroupLabelStyle, menuItemStyle,
  cardStyle, sectionGapStyle, cardTitleStyle, cardDescStyle,
  inputStyle, btnStyle, btnSuccessStyle, btnPurpleStyle, btnDangerStyle, btnNeutralStyle,
  tableHeaderStyle, tableCellStyle, formatarMoeda, formatarNumero
} from './theme';

type View = 'dashboard' | 'cadastros' | 'estoque' | 'almoxarifado' | 'plataformas' | 'simulador' | 'historico' | 'usuarios' | 'shopee' | 'tiktok' | 'venda_direta';

function App() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));
  const [usuario, setUsuario] = useState<any>(() => {
    const saved = localStorage.getItem('usuario');
    return saved ? JSON.parse(saved) : null;
  });

  const [produtoParaEditar, setProdutoParaEditar] = useState<any | null>(null);
  const [modalImportarAberto, setModalImportarAberto] = useState<boolean>(false);

  useEffect(() => {
    const handleUnauthorized = () => {
      setToken(null);
      setUsuario(null);
    };
    window.addEventListener('unauthorized', handleUnauthorized);
    return () => window.removeEventListener('unauthorized', handleUnauthorized);
  }, []);

  const handleLoginSuccess = (newToken: string, novoUsuario: any) => {
    localStorage.setItem('token', newToken);
    localStorage.setItem('usuario', JSON.stringify(novoUsuario));
    setToken(newToken);
    setUsuario(novoUsuario);
    setView('dashboard');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    setToken(null);
    setUsuario(null);
    setView('dashboard');
  };

  const [plataformas, setPlataformas] = useState<any[]>([]);
  const [view, setView] = useState<View>('dashboard');


  const [embalagens, setEmbalagens] = useState<any[]>([]);
  const [configuracoes, setConfiguracoes] = useState<any[]>([]);
  const [mensagem, setMensagem] = useState('');

  const [produtosDetalhados, setProdutosDetalhados] = useState<any[]>([]);
  const [linhaExpandida, setLinhaExpandida] = useState<string | null>(null);
  const [buscaProduto, setBuscaProduto] = useState('');

  // Ordenação de colunas da tabela de estoque
  type SortField = 'sku' | 'nome' | 'custo_produto' | 'quantidade_estoque' | 'valor_estoque' | 'margem_shopee';
  type SortDirection = 'asc' | 'desc';
  const [sortField, setSortField] = useState<SortField>('sku');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <span style={{ opacity: 0.4, marginLeft: '6px', fontSize: '11px', display: 'inline-block', lineHeight: 1 }}>↕</span>;
    }
    return (
      <span style={{ color: colors.accent, marginLeft: '6px', fontSize: '11px', fontWeight: 'bold', display: 'inline-block', lineHeight: 1 }}>
        {sortDirection === 'asc' ? '▲' : '▼'}
      </span>
    );
  };

  // Filtro de status de produtos (ativos / inativos / todos)
  const [filtroStatus, setFiltroStatus] = useState<'ativos' | 'inativos' | 'todos'>('ativos');

  // Menu Dropdown de Ações por produto
  const [menuAcoesAberto, setMenuAcoesAberto] = useState<string | null>(null);

  useEffect(() => {
    const handleClickFora = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.dropdown-acoes-container')) {
        setMenuAcoesAberto(null);
      }
    };
    document.addEventListener('click', handleClickFora);
    return () => document.removeEventListener('click', handleClickFora);
  }, []);

  // Edição de plataforma e embalagem
  const [editandoPlataformaModal, setEditandoPlataformaModal] = useState<any | null>(null);
  const [editandoEmbalagem, setEditandoEmbalagem] = useState<any | null>(null);

  // Faixas dinâmicas para cadastro de nova plataforma
  const [novasFaixas, setNovasFaixas] = useState<any[]>([
    { de_valor: '0', ate_valor: '', taxa_percentual: '', taxa_fixa: '' }
  ]);

  const adicionarFaixaNova = () => {
    setNovasFaixas(prev => {
      const ultima = prev[prev.length - 1];
      const deVal = ultima && ultima.ate_valor ? String(Number(ultima.ate_valor) + 0.01) : '0';
      return [...prev, { de_valor: deVal, ate_valor: '', taxa_percentual: '', taxa_fixa: '' }];
    });
  };

  const removerFaixaNova = (index: number) => {
    if (novasFaixas.length <= 1) return;
    setNovasFaixas(prev => prev.filter((_, i) => i !== index));
  };

  const atualizarFaixaNova = (index: number, campo: string, valor: string) => {
    setNovasFaixas(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [campo]: valor };
      return copy;
    });
  };

  // Menu mobile (hambúrguer) — só é usado em telas estreitas via CSS
  const [menuAberto, setMenuAberto] = useState(false);

  // --- FUNÇÃO ÚNICA E CONSOLIDADA ---
  const carregarInsumos = () => {
    api.get('/embalagens/').then(res => setEmbalagens(res.data)).catch(() => {});
    api.get('/configuracoes/').then(res => setConfiguracoes(res.data)).catch(() => {});
    api.get('/plataformas/').then(res => setPlataformas(res.data)).catch(() => {});
  };

  useEffect(() => {
    carregarInsumos();
  }, []);

  const [carregandoEstoque, setCarregandoEstoque] = useState<boolean>(true);
  const [paginaAtual, setPaginaAtual] = useState<number>(1);
  const [itensPorPagina, setItensPorPagina] = useState<number>(20);
  const [totalProdutos, setTotalProdutos] = useState<number>(0);
  const [totalPaginas, setTotalPaginas] = useState<number>(1);

  const carregarEstoque = (
    page = paginaAtual,
    limit = itensPorPagina,
    busca = buscaProduto,
    status = filtroStatus
  ) => {
    if (view === 'estoque') {
      setCarregandoEstoque(true);
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      if (busca) params.append('busca', busca);
      if (status) params.append('status', status);

      api.get(`/produtos/detalhados?${params.toString()}`)
         .then(res => {
           if (res.data && typeof res.data === 'object' && 'produtos' in res.data) {
             setProdutosDetalhados(res.data.produtos);
             setTotalProdutos(res.data.total);
             setTotalPaginas(res.data.total_pages);
             setPaginaAtual(res.data.page);
           } else {
             setProdutosDetalhados(res.data || []);
             setTotalProdutos(res.data ? res.data.length : 0);
             setTotalPaginas(1);
             setPaginaAtual(1);
           }
         })
         .catch(err => console.error("Erro ao carregar estoque:", err))
         .finally(() => setCarregandoEstoque(false));
    }
  };

  useEffect(() => {
    if (view === 'estoque') {
      const timer = setTimeout(() => {
        carregarEstoque(paginaAtual, itensPorPagina, buscaProduto, filtroStatus);
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [paginaAtual, itensPorPagina, buscaProduto, filtroStatus, view]);

  useEffect(() => {
    setPaginaAtual(1);
  }, [buscaProduto, filtroStatus, itensPorPagina]);

  const mostrarMensagem = (texto: string, duracaoMs = 5000) => {
    setMensagem(texto);
    setTimeout(() => setMensagem(''), duracaoMs);
  };

  const gerenciarFormulario = async (e: React.FormEvent<HTMLFormElement>, rota: string, sucessoMsg: string) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const payload: Record<string, any> = Object.fromEntries(formData.entries());

    // Tratamento de conversão
    Object.keys(payload).forEach(key => {
        if (['custo_pacote', 'valor_pacote', 'preco_venda', 'custo_produto'].includes(key)) {
            payload[key] = parseFloat(String(payload[key]).replace(',', '.'));
        } else if (['qtd_unidades', 'quantidade_estoque', 'embalagem_id'].includes(key)) {
            payload[key] = Number(payload[key]);
        }
    });

    try {
        await api.post(rota, payload);
        mostrarMensagem(`✅ ${sucessoMsg}`);
        e.currentTarget.reset();
        carregarInsumos();
        carregarEstoque();
    } catch (err: any) {
        if (!err.response || (err.response.status >= 200 && err.response.status < 300)) {
            mostrarMensagem(`✅ ${sucessoMsg}`);
            e.currentTarget.reset();
            carregarInsumos();
            carregarEstoque();
        } else {
            const erroBackend = err.response?.data?.detail || 'Erro ao processar cadastro.';
            mostrarMensagem(`❌ ${erroBackend}`, 7000);
        }
    }
  };

  // --- EXCLUSÕES ---
  const excluirProduto = async (sku: string) => {
    if (!window.confirm(`⚠️ Tem certeza que deseja excluir o produto SKU: ${sku}?`)) return;
    try {
      await api.delete(`/produtos/${sku}`);
      mostrarMensagem(`✅ Produto ${sku} excluído com sucesso!`);
      carregarEstoque();
    } catch (err) {
      mostrarMensagem('❌ Erro ao excluir produto.');
    }
  };

  const excluirEmbalagem = async (id: number, nome: string) => {
    if (!window.confirm(`⚠️ Tem certeza que deseja excluir a embalagem "${nome}"?`)) return;
    try {
      await api.delete(`/embalagens/${id}`);
      mostrarMensagem(`✅ Embalagem excluída com sucesso!`);
      carregarInsumos();
    } catch (err: any) {
      const erroBackend = err.response?.data?.detail || 'Erro ao excluir.';
      mostrarMensagem(`❌ ${erroBackend}`, 7000);
    }
  };

  const iniciarEdicaoEmbalagem = (emb: any) => {
    setEditandoEmbalagem({
      id: emb.id,
      nome: emb.nome,
      custo_pacote: String(emb.custo_pacote),
      qtd_unidades: String(emb.qtd_unidades),
    });
  };

  const cancelarEdicaoEmbalagem = () => {
    setEditandoEmbalagem(null);
  };

  const salvarEdicaoEmbalagem = async () => {
    if (!editandoEmbalagem) return;
    try {
      const payload = {
        nome: editandoEmbalagem.nome,
        custo_pacote: parseFloat(String(editandoEmbalagem.custo_pacote).replace(',', '.')),
        qtd_unidades: Number(editandoEmbalagem.qtd_unidades),
      };
      await api.put(`/embalagens/${editandoEmbalagem.id}`, payload);
      mostrarMensagem('✅ Embalagem atualizada com sucesso!');
      setEditandoEmbalagem(null);
      carregarInsumos();
    } catch (err: any) {
      mostrarMensagem('❌ Erro ao editar embalagem: ' + (err.response?.data?.detail || 'Erro inesperado'), 7000);
    }
  };

  const toggleStatusProduto = async (sku: string) => {
    try {
      const res = await api.patch(`/produtos/${sku}/status`);
      mostrarMensagem(`✅ Status do produto ${res.data.produto} alterado para ${res.data.ativo ? 'Ativo' : 'Desativado'}!`);
      carregarEstoque();
    } catch (err: any) {
      mostrarMensagem('❌ Erro ao alterar status do produto: ' + (err.response?.data?.detail || 'Erro inesperado'), 7000);
    }
  };

  const toggleExpandir = (sku: string) => {
    setLinhaExpandida(linhaExpandida === sku ? null : sku);
  };

  const etiquetaPadrao = configuracoes.find(c => c.chave === 'etiqueta_padrao');

  const produtosFiltrados = [...produtosDetalhados]
    .filter(item => {
      // Filtro de Ativos / Inativos
      if (filtroStatus === 'ativos' && item.ativo === false) return false;
      if (filtroStatus === 'inativos' && item.ativo !== false) return false;

      const termo = buscaProduto.trim().toLowerCase();
      if (!termo) return true;
      return item.nome?.toLowerCase().includes(termo) || item.sku?.toLowerCase().includes(termo);
    })
    .sort((a, b) => {
      if (sortField === 'margem_shopee') {
        const getShopeeMargem = (item: any) => {
          const shopee = item.analises_plataformas?.find((plat: any) => plat.plataforma_nome?.toLowerCase().includes('shopee'));
          return shopee ? (shopee.margem_final * 100) : -999;
        };
        const valA = getShopeeMargem(a);
        const valB = getShopeeMargem(b);
        const res = valA - valB;
        return sortDirection === 'asc' ? res : -res;
      }

      let valA = a[sortField];
      let valB = b[sortField];

      if (typeof valA === 'string') {
        valA = valA.toLowerCase();
        valB = (valB || '').toLowerCase();
        const res = valA.localeCompare(valB, undefined, { numeric: true, sensitivity: 'base' });
        return sortDirection === 'asc' ? res : -res;
      } else {
        valA = Number(valA) || 0;
        valB = Number(valB) || 0;
        const res = valA - valB;
        return sortDirection === 'asc' ? res : -res;
      }
    });

  const abasLiberadas = (usuario?.abas_permitidas || 'dashboard,estoque,calculadora,historico,plataformas,insumos,usuarios,shopee,tiktok')
    .split(',')
    .map((a: string) => a.trim().toLowerCase());

  const userRole = usuario?.role || 'viewer';
  const podeEditar = userRole === 'admin' || userRole === 'editor';
  const isAdmin = userRole === 'admin';

  const temPermissaoAba = (abaId: string) => {
    if (isAdmin) return true;
    return abasLiberadas.includes(abaId.toLowerCase());
  };

  // Item de menu com hover sutil (inline styles não têm :hover)
  const MenuItem = ({ icon, label, target }: { icon: React.ReactNode; label: string; target: View }) => {
    const ativo = view === target;
    return (
      <div
        style={menuItemStyle(ativo)}
        onClick={() => { setView(target); setMenuAberto(false); }}
        onMouseEnter={e => { if (!ativo) e.currentTarget.style.backgroundColor = 'rgba(148,163,184,0.08)'; }}
        onMouseLeave={e => { if (!ativo) e.currentTarget.style.backgroundColor = 'transparent'; }}
      >
        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '20px', height: '20px', flexShrink: 0 }}>{icon}</span>
        <span>{label}</span>
      </div>
    );
  };

  if (!token) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div style={layoutStyle} className="app-layout">
      <div style={sidebarStyle} className="app-sidebar">
        <div style={{ marginBottom: '16px', textAlign: 'center' }} className="app-sidebar-brand">
          <img src="/icone.png" alt="Skold Stock Icon" style={{ maxWidth: '90px', maxHeight: '100px', objectFit: 'contain', marginBottom: '12px' }} />
          <h1
            className="brand-title"
            style={{
              fontSize: '20px',
              color: colors.textPrimary,
              fontWeight: 600,
              margin: '8px 0 0 0',
              fontFamily: "'Rostex-Regular', 'Inter', sans-serif"
            }}
          >
            Skold Stock
          </h1>
        </div>

        <button
          className="mobile-menu-toggle"
          onClick={() => setMenuAberto(aberto => !aberto)}
          aria-label={menuAberto ? 'Fechar menu' : 'Abrir menu'}
          aria-expanded={menuAberto}
        >
          {menuAberto ? '✕' : '☰'}
        </button>

        <div className={`app-sidebar-nav${menuAberto ? ' open' : ''}`}>
          <div style={sidebarGroupLabelStyle}>Principal</div>
          {temPermissaoAba('dashboard') && <MenuItem icon="📊" label="Visão Geral" target="dashboard" />}
          {temPermissaoAba('estoque') && <MenuItem icon="📦" label="Controle de Estoque" target="estoque" />}
          {(temPermissaoAba('insumos') || temPermissaoAba('almoxarifado')) && <MenuItem icon="🧺" label="Almoxarifado" target="almoxarifado" />}

          <div style={sidebarGroupLabelStyle}>Ferramentas</div>
          {(temPermissaoAba('calculadora') || temPermissaoAba('simulador')) && <MenuItem icon="🎯" label="Simulador de Preço" target="simulador" />}
          {temPermissaoAba('historico') && <MenuItem icon="📋" label="Histórico de Estoque" target="historico" />}

          <div style={sidebarGroupLabelStyle}>Integrações & Vendas</div>
          {temPermissaoAba('shopee') && (
            <MenuItem
              icon={<img src="/logos/shopee.png" alt="Shopee" style={{ width: 18, height: 18, objectFit: 'contain', borderRadius: 3 }} />}
              label="Integração Shopee"
              target="shopee"
            />
          )}
          {temPermissaoAba('tiktok') && (
            <MenuItem
              icon={<img src="/logos/tiktokshop.png" alt="TikTok" style={{ width: 18, height: 18, objectFit: 'contain', borderRadius: 3 }} />}
              label="Integração TikTok"
              target="tiktok"
            />
          )}
          <MenuItem icon="🤝" label="Baixa Venda Manual" target="venda_direta" />

          <div style={sidebarGroupLabelStyle}>Configurações</div>
          {temPermissaoAba('plataformas') && <MenuItem icon="🏪" label="Plataformas de Venda" target="plataformas" />}
          {(temPermissaoAba('insumos') || temPermissaoAba('cadastros')) && <MenuItem icon="⚙️" label="Cadastros e Config." target="cadastros" />}
          
          {(userRole === 'admin' || temPermissaoAba('usuarios')) && (
            <MenuItem icon="👥" label="Gestão de Usuários" target="usuarios" />
          )}
        </div>

        {/* Rodapé com Informações do Usuário Logado & Logout */}
        <div style={{ marginTop: 'auto', paddingTop: '20px', borderTop: `1px solid ${colors.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
            <div style={{ fontSize: '13px', color: colors.textPrimary, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis' }}>
              👤 {usuario?.nome || 'Usuário'}
            </div>
            <span
              style={{
                fontSize: '10px',
                fontWeight: 700,
                padding: '2px 6px',
                borderRadius: '10px',
                backgroundColor: userRole === 'admin' ? 'rgba(59, 130, 246, 0.2)' : userRole === 'editor' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(148, 163, 184, 0.2)',
                color: userRole === 'admin' ? colors.accent : userRole === 'editor' ? colors.successText : colors.textMuted,
                border: `1px solid ${userRole === 'admin' ? colors.accent : colors.border}`
              }}
            >
              {userRole.toUpperCase()}
            </span>
          </div>
          <div style={{ fontSize: '11.5px', color: colors.textMuted, marginBottom: '12px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {usuario?.email || ''}
          </div>
          <button
            onClick={handleLogout}
            style={{
              ...btnNeutralStyle,
              width: '100%',
              backgroundColor: colors.dangerBg,
              color: colors.dangerText,
              border: `1px solid ${colors.dangerBorder}`
            }}
          >
            🚪 Sair da Conta
          </button>
        </div>
      </div>


      <div style={contentStyle} className="app-content">
        {view === 'dashboard' && <Dashboard />}

        {view === 'simulador' && <SimuladorPreco />}

        {view === 'historico' && <HistoricoEstoque />}

        {view === 'venda_direta' && <VendaDireta mostrarMensagem={mostrarMensagem} carregarEstoqueGlobal={carregarEstoque} />}


        {view === 'almoxarifado' && (
          <div>
            <PageHeader title="Gestão de Almoxarifado" subtitle="Custos de embalagens e etiquetas usados no cálculo de margem." />
            <MessageBanner mensagem={mensagem} />

            <div style={sectionGapStyle}>
              <div style={{ ...cardStyle, borderLeft: '4px solid #10b981' }}>
                <h3 style={cardTitleStyle}>🏷️ Etiqueta de Envio Padrão</h3>
                {etiquetaPadrao ? (
                  <div style={{ display: 'flex', gap: '40px', marginTop: '18px', flexWrap: 'wrap' }}>
                    <div><p style={{ margin: '0 0 5px 0', color: colors.textSecondary, fontSize: '13px' }}>Custo do Rolo</p><strong style={{ color: colors.textPrimary, fontSize: '18px' }}>{formatarMoeda(etiquetaPadrao.valor_pacote)}</strong></div>
                    <div><p style={{ margin: '0 0 5px 0', color: colors.textSecondary, fontSize: '13px' }}>Qtd. no Rolo</p><strong style={{ color: colors.textPrimary, fontSize: '18px' }}>{etiquetaPadrao.qtd_unidades} un.</strong></div>
                    <div style={{ borderLeft: `1px solid ${colors.border}`, paddingLeft: '40px' }}><p style={{ margin: '0 0 5px 0', color: colors.textSecondary, fontSize: '13px' }}>Custo por Etiqueta</p><strong style={{ color: colors.success, fontSize: '20px' }}>{formatarMoeda(etiquetaPadrao.valor_pacote / etiquetaPadrao.qtd_unidades)}</strong></div>
                  </div>
                ) : (
                  <p style={{ color: '#f87171' }}>Nenhuma etiqueta configurada.</p>
                )}
              </div>
            </div>

            <div style={cardStyle}>
              <h3 style={cardTitleStyle}>📦 Embalagens e Caixas</h3>
              <p style={cardDescStyle}>Custo de cada embalagem usado para calcular o custo unitário por produto.</p>
              <div className="table-scroll">
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={tableHeaderStyle}>ID</th>
                      <th style={tableHeaderStyle}>Nome da Embalagem</th>
                      <th style={tableHeaderStyle}>Custo do Pacote</th>
                      <th style={tableHeaderStyle}>Qtd. no Pacote</th>
                      <th style={tableHeaderStyle}>Custo Unitário</th>
                      <th style={tableHeaderStyle}>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {embalagens.map(emb => {
                      if (editandoEmbalagem && editandoEmbalagem.id === emb.id) {
                        return (
                          <tr key={emb.id} style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)' }}>
                            <td style={tableCellStyle}>#{emb.id}</td>
                            <td style={tableCellStyle}>
                              <input
                                value={editandoEmbalagem.nome}
                                onChange={e => setEditandoEmbalagem({ ...editandoEmbalagem, nome: e.target.value })}
                                style={{ ...inputStyle, width: '180px', marginBottom: 0, padding: '5px 10px', maxWidth: 'none' }}
                              />
                            </td>
                            <td style={tableCellStyle}>
                              <input
                                type="number" step="0.01"
                                value={editandoEmbalagem.custo_pacote}
                                onChange={e => setEditandoEmbalagem({ ...editandoEmbalagem, custo_pacote: e.target.value })}
                                style={{ ...inputStyle, width: '110px', marginBottom: 0, padding: '5px 10px', maxWidth: 'none' }}
                              />
                            </td>
                            <td style={tableCellStyle}>
                              <input
                                type="number"
                                value={editandoEmbalagem.qtd_unidades}
                                onChange={e => setEditandoEmbalagem({ ...editandoEmbalagem, qtd_unidades: e.target.value })}
                                style={{ ...inputStyle, width: '90px', marginBottom: 0, padding: '5px 10px', maxWidth: 'none' }}
                              />
                            </td>
                            <td style={{ ...tableCellStyle, color: colors.cyan, fontWeight: 'bold' }}>
                              {formatarMoeda((parseFloat(editandoEmbalagem.custo_pacote) || 0) / (Number(editandoEmbalagem.qtd_unidades) || 1))}
                            </td>
                            <td style={{ ...tableCellStyle, display: 'flex', gap: '6px' }}>
                              <button
                                onClick={salvarEdicaoEmbalagem}
                                style={{ ...btnSuccessStyle, padding: '5px 10px', fontSize: '12px' }}
                                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(16, 185, 129, 0.28)'}
                                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(16, 185, 129, 0.16)'}
                              >
                                Salvar
                              </button>
                              <button
                                onClick={cancelarEdicaoEmbalagem}
                                style={{ ...btnNeutralStyle, padding: '5px 10px', fontSize: '12px' }}
                                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#334155'}
                                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(30, 41, 59, 0.75)'}
                              >
                                Cancelar
                              </button>
                            </td>
                          </tr>
                        );
                      }

                      return (
                        <tr key={emb.id}>
                          <td style={tableCellStyle}>#{emb.id}</td>
                          <td style={tableCellStyle}>{emb.nome}</td>
                          <td style={tableCellStyle}>{formatarMoeda(emb.custo_pacote)}</td>
                          <td style={tableCellStyle}>{emb.qtd_unidades} un.</td>
                          <td style={{ ...tableCellStyle, color: colors.cyan, fontWeight: 'bold' }}>{formatarMoeda(emb.custo_pacote / emb.qtd_unidades)}</td>
                          <td style={{ ...tableCellStyle, display: 'flex', gap: '6px' }}>
                            {podeEditar ? (
                              <>
                                <button
                                  onClick={() => iniciarEdicaoEmbalagem(emb)}
                                  style={{ ...btnNeutralStyle, padding: '5px 10px', fontSize: '12px' }}
                                  onMouseEnter={e => e.currentTarget.style.backgroundColor = '#334155'}
                                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(30, 41, 59, 0.75)'}
                                >
                                  ✏️ Editar
                                </button>
                                <button
                                  onClick={() => excluirEmbalagem(emb.id, emb.nome)}
                                  style={{ ...btnDangerStyle, padding: '5px 10px', fontSize: '12px' }}
                                  onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.28)'}
                                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.14)'}
                                >
                                  Excluir
                                </button>
                              </>
                            ) : (
                              <span style={{ color: colors.textMuted, fontSize: '12px' }}>🔒 Somente Leitura</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {embalagens.length === 0 && (
                      <tr><td colSpan={6} style={{ ...tableCellStyle, textAlign: 'center', color: colors.textMuted }}>Nenhuma embalagem cadastrada ainda.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {view === 'plataformas' && (
          <div>
            <PageHeader title="Plataformas de Venda" subtitle="Cadastre os marketplaces e as taxas cobradas por cada um." />
            <MessageBanner mensagem={mensagem} />

            {isAdmin && (
              <CollapsibleCard
                icon="🏪"
                title="Nova Plataforma"
                description="Ex: Shopee, Mercado Livre, Shein — informe as taxas praticadas."
                buttonLabel="+ Nova Plataforma"
                style={sectionGapStyle}
              >
                <form onSubmit={(e) => {
                    e.preventDefault();
                    const formElement = e.currentTarget;
                    const formData = new FormData(formElement);
                    const data: any = Object.fromEntries(formData.entries());

                    const faixasPayload = novasFaixas
                      .filter(f => f.taxa_percentual !== '' || f.taxa_fixa !== '')
                      .map(f => ({
                        de_valor: parseFloat(String(f.de_valor).replace(',', '.')) || 0,
                        ate_valor: f.ate_valor !== '' && f.ate_valor !== null ? parseFloat(String(f.ate_valor).replace(',', '.')) : null,
                        taxa_percentual: parseFloat(String(f.taxa_percentual).replace(',', '.')) || 0,
                        taxa_fixa: parseFloat(String(f.taxa_fixa).replace(',', '.')) || 0,
                      }));

                    const payload = {
                      nome: data.nome,
                      icone: data.icone,
                      taxa_plataforma: faixasPayload.length > 0 ? faixasPayload[0].taxa_percentual / 100 : 0,
                      taxa_fixa: faixasPayload.length > 0 ? faixasPayload[0].taxa_fixa : 0,
                      taxa_extra: (parseFloat(data.taxa_extra ? data.taxa_extra.replace(',', '.') : '0') || 0) / 100,
                      faixas: faixasPayload
                    };

                    api.post('/plataformas/', payload)
                      .then(() => {
                        mostrarMensagem('✅ Plataforma cadastrada com sucesso!');
                        carregarInsumos();
                        formElement.reset();
                        setNovasFaixas([{ de_valor: '0', ate_valor: '', taxa_percentual: '', taxa_fixa: '' }]);
                      })
                      .catch(err => mostrarMensagem('❌ Erro: ' + (err.response?.data?.detail || 'Erro ao cadastrar'), 7000));
                }}>
                  <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '16px' }}>
                    <input name="nome" placeholder="Nome da Plataforma (Ex: Shopee, TikTok, Mercado Livre)" required style={{ ...inputStyle, flex: 2, marginBottom: 0, maxWidth: '100%', minWidth: '180px' }} />
                    <input name="icone" placeholder="Emoji (Ex: 🟧, 🎵, 🟨)" required style={{ ...inputStyle, flex: 1, marginBottom: 0, maxWidth: '100%', minWidth: '100px' }} />
                    <input name="taxa_extra" type="number" step="0.1" placeholder="Taxa Extra % (Ex: 6 para Frete Grátis)" defaultValue="0" style={{ ...inputStyle, flex: 1, marginBottom: 0, maxWidth: '100%', minWidth: '140px' }} />
                  </div>

                  <div style={{ backgroundColor: colors.bgCardAlt, padding: '16px', borderRadius: '10px', border: `1px solid ${colors.border}`, marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <div>
                        <label style={{ color: colors.accent, fontWeight: 700, fontSize: '13px' }}>
                          📊 Faixas de Taxas Progressivas (De X até X ➔ % + Taxa Fixa)
                        </label>
                        <span style={{ display: 'block', fontSize: '11px', color: colors.textMuted }}>
                          No TikTok adicione 2 linhas, na Shopee 4 linhas, Mercado Livre 1 linha. Deixe "Até R$" em branco na última faixa.
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={adicionarFaixaNova}
                        style={{ ...btnNeutralStyle, padding: '4px 10px', fontSize: '12px', color: colors.accent, borderColor: colors.borderStrong }}
                      >
                        + Adicionar Linha
                      </button>
                    </div>

                    {novasFaixas.map((faixa, idx) => (
                      <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: colors.textMuted, width: '45px' }}>Linha {idx + 1}:</span>
                        
                        <div style={{ flex: 1, minWidth: '90px' }}>
                          <input
                            type="number" step="0.01"
                            placeholder="De R$ (0)"
                            value={faixa.de_valor}
                            onChange={e => atualizarFaixaNova(idx, 'de_valor', e.target.value)}
                            style={{ ...inputStyle, marginBottom: 0, padding: '6px 8px', fontSize: '12px' }}
                          />
                        </div>

                        <span style={{ fontSize: '12px', color: colors.textMuted }}>até</span>

                        <div style={{ flex: 1, minWidth: '110px' }}>
                          <input
                            type="number" step="0.01"
                            placeholder="Até (Sem limite)"
                            value={faixa.ate_valor}
                            onChange={e => atualizarFaixaNova(idx, 'ate_valor', e.target.value)}
                            style={{ ...inputStyle, marginBottom: 0, padding: '6px 8px', fontSize: '12px' }}
                          />
                        </div>

                        <span style={{ fontSize: '12px', color: colors.textMuted }}>➔ Taxa %:</span>

                        <div style={{ flex: 1, minWidth: '90px' }}>
                          <input
                            type="number" step="0.1"
                            placeholder="Ex: 20"
                            value={faixa.taxa_percentual}
                            onChange={e => atualizarFaixaNova(idx, 'taxa_percentual', e.target.value)}
                            style={{ ...inputStyle, marginBottom: 0, padding: '6px 8px', fontSize: '12px' }}
                          />
                        </div>

                        <span style={{ fontSize: '12px', color: colors.textMuted }}>+ R$ Fixo:</span>

                        <div style={{ flex: 1, minWidth: '90px' }}>
                          <input
                            type="number" step="0.01"
                            placeholder="Ex: 4.00"
                            value={faixa.taxa_fixa}
                            onChange={e => atualizarFaixaNova(idx, 'taxa_fixa', e.target.value)}
                            style={{ ...inputStyle, marginBottom: 0, padding: '6px 8px', fontSize: '12px' }}
                          />
                        </div>

                        {novasFaixas.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removerFaixaNova(idx)}
                            style={{ ...btnDangerStyle, padding: '4px 8px', fontSize: '12px' }}
                            title="Remover linha"
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  <button
                    type="submit"
                    style={btnPurpleStyle}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = colors.purpleHover}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = colors.purple}
                  >
                    Salvar Plataforma
                  </button>
                </form>
              </CollapsibleCard>
            )}

            <div style={cardStyle}>
              <h3 style={cardTitleStyle}>Plataformas Ativas no Sistema</h3>
              <p style={cardDescStyle}>Taxas usadas automaticamente no cálculo de margem por produto.</p>

              <div className="table-scroll">
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={{ ...tableHeaderStyle, width: '24%' }}>Plataforma</th>
                      <th style={{ ...tableHeaderStyle, width: '24%' }}>Taxa Padrão</th>
                      <th style={{ ...tableHeaderStyle, width: '22%' }}>Taxa Fixa</th>
                      <th style={{ ...tableHeaderStyle, width: '12%' }}>Taxa Extra</th>
                      <th style={{ ...tableHeaderStyle, width: '18%', minWidth: '180px' }}>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {plataformas.map(plat => {
                      const faixas = plat.faixas || [];
                      const temFaixas = faixas.length > 0;
                      const eShopee = plat.nome.toLowerCase().includes('shopee');
                      const eTikTok = plat.nome.toLowerCase().includes('tiktok') || plat.nome.toLowerCase().includes('tik tok');
                      const eDinamico = temFaixas || eShopee || eTikTok;

                      return (
                        <tr key={plat.id}>
                          <td style={tableCellStyle}>
                            <PlatformIcon nome={plat.nome} icone={plat.icone} size={22} /> <strong>{plat.nome}</strong>
                            {eDinamico && (
                              <div style={{ fontSize: '11px', color: colors.accent, marginTop: '2px', fontWeight: 500 }}>
                                ⚡ {temFaixas ? `${faixas.length} ${faixas.length === 1 ? 'faixa cadastrada' : 'faixas cadastradas'}` : 'Faixas dinâmicas ativas'}
                              </div>
                            )}
                          </td>
                          <td style={tableCellStyle}>
                            {temFaixas ? (
                              <span style={{ color: colors.accent, fontWeight: 600, fontSize: '12.5px' }}>
                                {faixas.map((f: any) => `${(f.taxa_percentual > 1 ? f.taxa_percentual : f.taxa_percentual * 100).toFixed(0)}%`).join(' / ')}
                              </span>
                            ) : eShopee ? (
                              <span title="Até R$ 79,99: 20% | Acima de R$ 80,00: 14%" style={{ color: colors.accent, fontWeight: 600, fontSize: '12.5px' }}>
                                20% / 14%
                              </span>
                            ) : eTikTok ? (
                              <span title="Até R$ 50,00: 10% | Acima de R$ 50,00: 6%" style={{ color: colors.accent, fontWeight: 600, fontSize: '12.5px' }}>
                                10% / 6%
                              </span>
                            ) : (
                              `${(plat.taxa_plataforma * 100).toFixed(1)}%`
                            )}
                          </td>
                          <td style={tableCellStyle}>
                            {temFaixas ? (
                              <span style={{ color: colors.accent, fontWeight: 600, fontSize: '12.5px' }}>
                                {faixas.map((f: any) => formatarMoeda(f.taxa_fixa)).join(' / ')}
                              </span>
                            ) : eShopee ? (
                              <span title="Até 79,99: R$4 | 80 a 99,99: R$16 | 100 a 199,99: R$20 | 200+: R$26" style={{ color: colors.accent, fontWeight: 600, fontSize: '12.5px' }}>
                                R$ 4,00 a R$ 26,00
                              </span>
                            ) : eTikTok ? (
                              <span title="Até 50,00: R$4,00 | Acima de 50,00: R$6,00" style={{ color: colors.accent, fontWeight: 600, fontSize: '12.5px' }}>
                                R$ 4,00 / R$ 6,00
                              </span>
                            ) : (
                              formatarMoeda(plat.taxa_fixa)
                            )}
                          </td>
                          <td style={tableCellStyle}>{((plat.taxa_extra || 0) * 100).toFixed(1)}%</td>
                          <td style={tableCellStyle}>
                            {isAdmin ? (
                              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <button
                                  onClick={() => setEditandoPlataformaModal(plat)}
                                  style={{ ...btnNeutralStyle, padding: '6px 14px', fontSize: '12px', whiteSpace: 'nowrap' }}
                                  onMouseEnter={e => e.currentTarget.style.backgroundColor = '#334155'}
                                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(30, 41, 59, 0.75)'}
                                >
                                  ✏️ Editar
                                </button>
                                <button
                                  onClick={() => {
                                    if (window.confirm(`Tem certeza que deseja excluir a plataforma "${plat.nome}"?`)) {
                                      api.delete(`/plataformas/${plat.id}`)
                                        .then(() => {
                                          mostrarMensagem('✅ Plataforma excluída com sucesso!');
                                          carregarInsumos();
                                          carregarEstoque();
                                        })
                                        .catch(err => mostrarMensagem('❌ Erro ao excluir plataforma: ' + (err.response?.data?.detail || 'Erro inesperado'), 7000));
                                    }
                                  }}
                                  style={{ ...btnDangerStyle, padding: '6px 14px', fontSize: '12px', whiteSpace: 'nowrap' }}
                                  onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.28)'}
                                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.14)'}
                                >
                                  Excluir
                                </button>
                              </div>
                            ) : (
                              <span style={{ color: colors.textMuted, fontSize: '12px' }}>🔒 Somente Leitura</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {plataformas.length === 0 && (
                      <tr><td colSpan={5} style={{ ...tableCellStyle, textAlign: 'center', color: colors.textMuted }}>Nenhuma plataforma cadastrada.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {view === 'cadastros' && (
          <div>
            <PageHeader title="Cadastros do Sistema" subtitle="Embalagens, etiquetas e produtos." />
            <MessageBanner mensagem={mensagem} />

            {!podeEditar ? (
              <div style={{ ...cardStyle, borderLeft: `4px solid ${colors.amber}` }}>
                <h3 style={cardTitleStyle}>🔒 Acesso Restrito ao Perfil Leitor</h3>
                <p style={{ color: colors.textSecondary, margin: '8px 0 0 0', fontSize: '14px' }}>
                  Sua conta possui perfil <strong>Leitor (Visualizador)</strong>. Para cadastrar novas embalagens, alterar custos de etiqueta ou cadastrar produtos, solicite autorização a um Administrador.
                </p>
              </div>
            ) : (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px', alignItems: 'start' }}>
              <CollapsibleCard
                title="Nova Embalagem"
                description="Caixas, sacos ou envelopes usados para enviar os produtos."
                buttonLabel="+ Nova Embalagem"
              >
                <form onSubmit={(e) => gerenciarFormulario(e, '/embalagens/', 'Embalagem salva!')}>
                  <input name="nome" placeholder="Nome (Ex: Caixa P)" required style={inputStyle} />
                  <input name="custo_pacote" type="number" step="0.01" placeholder="Custo do Pacote (R$)" required style={inputStyle} />
                  <input name="qtd_unidades" type="number" placeholder="Unidades no pacote" required style={inputStyle} />
                  <button
                    type="submit"
                    style={btnStyle}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.28)'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.16)'}
                  >
                    Salvar Embalagem
                  </button>
                </form>
              </CollapsibleCard>

              <CollapsibleCard
                title="Custo da Etiqueta"
                description="Custo do rolo de etiquetas de envio, dividido pela quantidade."
                buttonLabel="+ Custo da Etiqueta"
              >
                <form onSubmit={(e) => gerenciarFormulario(e, '/configuracoes/', 'Etiqueta atualizada!')}>
                  <input type="hidden" name="chave" value="etiqueta_padrao" />
                  <input name="valor_pacote" type="number" step="0.01" placeholder="Custo do Rolo (R$)" required style={inputStyle} />
                  <input name="qtd_unidades" type="number" placeholder="Quantas etiquetas?" required style={inputStyle} />
                  <button
                    type="submit"
                    style={btnSuccessStyle}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(16, 185, 129, 0.28)'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(16, 185, 129, 0.16)'}
                  >
                    Atualizar Custo
                  </button>
                </form>
              </CollapsibleCard>
            </div>

            <div style={{ ...cardStyle, marginBottom: '24px', borderLeft: `4px solid ${colors.accent}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <h3 style={{ ...cardTitleStyle, margin: 0 }}>📦 Cadastro de Novo Produto</h3>
                  <p style={{ ...cardDescStyle, margin: '4px 0 0 0' }}>Cadastre produtos individualmente ou faça upload em lote por planilha.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setModalImportarAberto(true)}
                  style={{ ...btnPurpleStyle, padding: '9px 16px', fontSize: '13.5px' }}
                >
                  📊 Importar em Massa (Excel / CSV)
                </button>
              </div>
              
              <form onSubmit={(e) => {
                  e.preventDefault();
                  const formElement = e.currentTarget;
                  const formData = new FormData(formElement);
                  const data: any = Object.fromEntries(formData.entries());

                  const plataformasSelecionadas = Array.from(formElement.querySelectorAll('input[name="plataformas"]:checked'))
                    .map((input: any) => Number(input.value));

                  const payload = {
                    sku: data.sku,
                    nome: data.nome,
                    preco_venda: parseFloat(data.preco_venda.replace(',', '.')),
                    custo_produto: parseFloat(data.custo_produto.replace(',', '.')),
                    quantidade_estoque: Number(data.quantidade_estoque),
                    embalagem_id: data.embalagem_id ? Number(data.embalagem_id) : null,
                    plataformas_ids: plataformasSelecionadas
                  };

                  api.post('/produtos/', payload)
                    .then(() => {
                      mostrarMensagem('✅ Produto cadastrado com sucesso!');
                      carregarEstoque();
                      formElement.reset();
                    })
                    .catch(err => mostrarMensagem('❌ Erro: ' + (err.response?.data?.detail || 'Erro ao cadastrar'), 7000));
              }}>

                {/* Bloco 1: Identificação */}
                <div style={{ backgroundColor: colors.bgCardAlt, padding: '18px', borderRadius: '10px', border: `1px solid ${colors.border}`, marginBottom: '20px' }}>
                  <h4 style={{ margin: '0 0 12px 0', color: colors.accent, fontSize: '14px', fontWeight: 600 }}>
                    1. 🏷️ Identificação do Produto
                  </h4>
                  <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: '180px' }}>
                      <label style={{ display: 'block', color: colors.textSecondary, fontSize: '12.5px', marginBottom: '4px' }}>SKU (Código único):</label>
                      <input name="sku" placeholder="Ex: CAM-ALGODAO-01" required style={{ ...inputStyle, width: '100%', maxWidth: 'none', margin: 0 }} />
                    </div>
                    <div style={{ flex: 2, minWidth: '240px' }}>
                      <label style={{ display: 'block', color: colors.textSecondary, fontSize: '12.5px', marginBottom: '4px' }}>Nome do Produto:</label>
                      <input name="nome" placeholder="Ex: Camiseta Algodão Premium Preta" required style={{ ...inputStyle, width: '100%', maxWidth: 'none', margin: 0 }} />
                    </div>
                  </div>
                </div>

                {/* Bloco 2: Custos e Preços */}
                <div style={{ backgroundColor: colors.bgCardAlt, padding: '18px', borderRadius: '10px', border: `1px solid ${colors.border}`, marginBottom: '20px' }}>
                  <h4 style={{ margin: '0 0 12px 0', color: colors.accent, fontSize: '14px', fontWeight: 600 }}>
                    2. 💰 Custos & Preço de Venda
                  </h4>
                  <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: '160px' }}>
                      <label style={{ display: 'block', color: colors.textSecondary, fontSize: '12.5px', marginBottom: '4px' }}>Custo da Mercadoria (R$):</label>
                      <input name="custo_produto" type="number" step="0.01" placeholder="R$ 0,00" required style={{ ...inputStyle, width: '100%', maxWidth: 'none', margin: 0 }} />
                    </div>
                    <div style={{ flex: 1, minWidth: '160px' }}>
                      <label style={{ display: 'block', color: colors.textSecondary, fontSize: '12.5px', marginBottom: '4px' }}>Preço de Venda Base (R$):</label>
                      <input name="preco_venda" type="number" step="0.01" placeholder="R$ 0,00" required style={{ ...inputStyle, width: '100%', maxWidth: 'none', margin: 0 }} />
                    </div>
                    <div style={{ flex: 1, minWidth: '140px' }}>
                      <label style={{ display: 'block', color: colors.textSecondary, fontSize: '12.5px', marginBottom: '4px' }}>Estoque Inicial (Unidades):</label>
                      <input name="quantidade_estoque" type="number" placeholder="Ex: 50" required style={{ ...inputStyle, width: '100%', maxWidth: 'none', margin: 0 }} />
                    </div>
                  </div>
                </div>

                {/* Bloco 3: Insumos & Canais */}
                <div style={{ backgroundColor: colors.bgCardAlt, padding: '18px', borderRadius: '10px', border: `1px solid ${colors.border}`, marginBottom: '24px' }}>
                  <h4 style={{ margin: '0 0 12px 0', color: colors.accent, fontSize: '14px', fontWeight: 600 }}>
                    3. 🧺 Insumos & Canais de Venda
                  </h4>

                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '6px', fontSize: '12.5px' }}>Embalagem de Envio:</label>
                    <select name="embalagem_id" style={{ ...inputStyle, width: '100%', maxWidth: 'none', color: colors.textPrimary, margin: 0 }}>
                      <option value="">-- Sem Embalagem (Caixa Própria - R$ 0,00) --</option>
                      {embalagens.map(emb => (
                        <option key={emb.id} value={emb.id}>
                          {emb.nome} ({formatarMoeda(emb.custo_pacote / emb.qtd_unidades)}/un)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px', fontSize: '12.5px' }}>Canais de Venda Vinculados:</label>
                    <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
                      {plataformas.map(plat => (
                        <label key={plat.id} style={{ color: colors.textPrimary, display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13.5px', cursor: 'pointer', backgroundColor: colors.bgApp, padding: '6px 12px', borderRadius: '8px', border: `1px solid ${colors.border}` }}>
                          <input type="checkbox" name="plataformas" value={plat.id} defaultChecked />
                          <PlatformIcon nome={plat.nome} icone={plat.icone} size={16} /> {plat.nome}
                        </label>
                      ))}
                      {plataformas.length === 0 && (
                        <span style={{ color: colors.textMuted, fontSize: '13px' }}>Cadastre plataformas de venda para vincular ao produto.</span>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  style={{ ...btnStyle, padding: '12px 24px', fontSize: '15px', width: '100%' }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = colors.accentHover}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = colors.accent}
                >
                  🚀 Finalizar Cadastro do Produto
                </button>
              </form>
            </div>
            </div>
            )}
          </div>
        )}

        {view === 'estoque' && (
          <div>
            <PageHeader title="Controle de Estoque" subtitle={`Consulte quantidades, custos e margem por plataforma (${produtosDetalhados.length} ${produtosDetalhados.length === 1 ? 'SKU cadastrado' : 'SKUs cadastrados'}).`} />
            <MessageBanner mensagem={mensagem} />

            <div style={cardStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', gap: '12px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                  <h3 style={{ ...cardTitleStyle, marginBottom: 0, fontSize: '16px' }}>Produtos Cadastrados</h3>
                  <span style={{ backgroundColor: 'rgba(59, 130, 246, 0.15)', color: colors.accent, border: `1px solid ${colors.borderStrong}`, padding: '2px 8px', borderRadius: '10px', fontSize: '11.5px', fontWeight: 600 }}>
                    📦 {produtosFiltrados.length} {produtosFiltrados.length === 1 ? 'SKU' : 'SKUs'} {buscaProduto || filtroStatus !== 'ativos' ? `(filtrado de ${produtosDetalhados.length})` : ''}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', marginLeft: 'auto', justifyContent: 'flex-end' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', height: '28px', backgroundColor: colors.bgApp, padding: '2px', borderRadius: '6px', border: `1px solid ${colors.border}`, boxSizing: 'border-box' }}>
                    <button
                      type="button"
                      onClick={() => setFiltroStatus('ativos')}
                      style={{
                        height: '24px',
                        padding: '0 10px',
                        fontSize: '11.5px',
                        fontWeight: 600,
                        borderRadius: '6px',
                        border: filtroStatus === 'ativos' ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid transparent',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: filtroStatus === 'ativos' ? 'rgba(16, 185, 129, 0.18)' : 'transparent',
                        color: filtroStatus === 'ativos' ? '#34d399' : colors.textMuted,
                        transition: '0.15s'
                      }}
                    >
                      🟢 Ativos
                    </button>
                    <button
                      type="button"
                      onClick={() => setFiltroStatus('inativos')}
                      style={{
                        height: '24px',
                        padding: '0 10px',
                        fontSize: '11.5px',
                        fontWeight: 600,
                        borderRadius: '6px',
                        border: filtroStatus === 'inativos' ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid transparent',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: filtroStatus === 'inativos' ? 'rgba(245, 158, 11, 0.18)' : 'transparent',
                        color: filtroStatus === 'inativos' ? '#fbbf24' : colors.textMuted,
                        transition: '0.15s'
                      }}
                    >
                      ⏸️ Pausados
                    </button>
                    <button
                      type="button"
                      onClick={() => setFiltroStatus('todos')}
                      style={{
                        height: '24px',
                        padding: '0 10px',
                        fontSize: '11.5px',
                        fontWeight: 600,
                        borderRadius: '6px',
                        border: filtroStatus === 'todos' ? '1px solid rgba(59, 130, 246, 0.4)' : '1px solid transparent',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: filtroStatus === 'todos' ? 'rgba(59, 130, 246, 0.18)' : 'transparent',
                        color: filtroStatus === 'todos' ? '#60a5fa' : colors.textMuted,
                        transition: '0.15s'
                      }}
                    >
                      📋 Todos
                    </button>
                  </div>

                  <input
                    value={buscaProduto}
                    onChange={e => setBuscaProduto(e.target.value)}
                    placeholder="🔎 Buscar por nome ou SKU..."
                    style={{
                      ...inputStyle,
                      height: '35px',
                      marginBottom: 0,
                      maxWidth: '280px',
                      padding: '0 10px',
                      fontSize: '12px',
                      borderRadius: '6px',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              {carregandoEstoque ? (
                <SkeletonTable rows={6} cols={7} />
              ) : (
                <React.Fragment>
                  <div className="table-scroll">
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th
                        style={{ ...tableHeaderStyle, cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}
                        onClick={() => handleSort('sku')}
                        title="Clique para ordenar por SKU"
                      >
                        <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                          SKU {renderSortIcon('sku')}
                        </span>
                      </th>
                      <th
                        style={{ ...tableHeaderStyle, cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}
                        onClick={() => handleSort('nome')}
                        title="Clique para ordenar de A-Z ou Z-A por Nome do Produto"
                      >
                        <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                          Produto (A-Z) {renderSortIcon('nome')}
                        </span>
                      </th>
                      <th
                        style={{ ...tableHeaderStyle, cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}
                        onClick={() => handleSort('custo_produto')}
                        title="Clique para ordenar por Custo Unitário (menor para o maior)"
                      >
                        <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                          Custo Unit. {renderSortIcon('custo_produto')}
                        </span>
                      </th>
                      <th
                        style={{ ...tableHeaderStyle, cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}
                        onClick={() => handleSort('quantidade_estoque')}
                        title="Clique para ordenar por Quantidade de Estoque"
                      >
                        <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                          Estoque {renderSortIcon('quantidade_estoque')}
                        </span>
                      </th>
                      <th
                        style={{ ...tableHeaderStyle, width: '95px', cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}
                        onClick={() => handleSort('valor_estoque')}
                        title="Clique para ordenar por Valor do Estoque"
                      >
                        <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                          Valor do Estq {renderSortIcon('valor_estoque')}
                        </span>
                      </th>
                      <th
                        style={{ ...tableHeaderStyle, width: '135px', cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}
                        onClick={() => handleSort('margem_shopee')}
                        title="Clique para ordenar pela Margem de Lucro da Shopee (%)"
                      >
                        <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                          Margem {renderSortIcon('margem_shopee')}
                        </span>
                      </th>
                      <th style={{ ...tableHeaderStyle, whiteSpace: 'nowrap' }}>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {produtosFiltrados.map(item => {
                      const isMenuAberto = menuAcoesAberto === item.sku;

                      return (
                        <React.Fragment key={item.sku}>
                          <tr style={{
                            backgroundColor: linhaExpandida === item.sku ? colors.bgCardAlt : 'transparent',
                            position: 'relative',
                            zIndex: isMenuAberto ? 100 : 1,
                            transition: '0.2s'
                          }}>
                            <td style={{ ...tableCellStyle, opacity: item.ativo === false ? 0.65 : 1 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                {item.ativo === false ? (
                                  <span style={{ fontSize: '10px', backgroundColor: 'rgba(245, 158, 11, 0.2)', color: colors.amber, padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>PAUSADO</span>
                                ) : null}
                                <strong>{item.sku}</strong>
                              </div>
                            </td>
                            <td style={{ ...tableCellStyle, opacity: item.ativo === false ? 0.65 : 1 }}>{item.nome}</td>
                            <td style={{ ...tableCellStyle, opacity: item.ativo === false ? 0.65 : 1 }}>{formatarMoeda(item.custo_produto)}</td>
                            <td style={{ ...tableCellStyle, opacity: item.ativo === false ? 0.65 : 1, color: item.quantidade_estoque <= 10 ? '#f87171' : colors.textPrimary, fontWeight: 'bold' }}>{item.quantidade_estoque} un.</td>
                            <td style={{ ...tableCellStyle, opacity: item.ativo === false ? 0.65 : 1 }}>{formatarMoeda(item.valor_estoque)}</td>
                            <td style={{ ...tableCellStyle, opacity: item.ativo === false ? 0.65 : 1 }}>
                              {(() => {
                                const shopee = item.analises_plataformas?.find((plat: any) => plat.plataforma_nome?.toLowerCase().includes('shopee'));
                                if (!shopee) return <span style={{ color: colors.textMuted, fontSize: '12px' }}>—</span>;
                                const mPct = shopee.margem_final * 100;
                                const isAlto = mPct >= 20;
                                const isMedio = mPct >= 10 && mPct < 20;
                                const bg = isAlto ? 'rgba(16, 185, 129, 0.18)' : isMedio ? 'rgba(245, 158, 11, 0.18)' : 'rgba(239, 68, 68, 0.18)';
                                const textCol = isAlto ? '#34d399' : isMedio ? '#fbbf24' : '#f87171';
                                const borderCol = isAlto ? 'rgba(16, 185, 129, 0.35)' : isMedio ? 'rgba(245, 158, 11, 0.35)' : 'rgba(239, 68, 68, 0.35)';

                                return (
                                  <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-start', gap: '2px' }}>
                                    <span style={{
                                      backgroundColor: bg,
                                      color: textCol,
                                      border: `1px solid ${borderCol}`,
                                      padding: '2px 7px',
                                      borderRadius: '5px',
                                      fontSize: '11.5px',
                                      fontWeight: 700,
                                      whiteSpace: 'nowrap'
                                    }}>
                                      {formatarNumero(mPct)}%
                                    </span>
                                    <span style={{ fontSize: '11px', color: textCol, opacity: 0.95, fontWeight: 500 }}>
                                      {shopee.lucro_liquido > 0 ? `+${formatarMoeda(shopee.lucro_liquido)}` : formatarMoeda(shopee.lucro_liquido)}
                                    </span>
                                  </div>
                                );
                              })()}
                            </td>
                            <td style={{ ...tableCellStyle, position: 'relative', zIndex: isMenuAberto ? 100 : 1 }}>
                              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                {podeEditar && (
                                  <div className="dropdown-acoes-container" style={{ position: 'relative', zIndex: isMenuAberto ? 100 : 1 }}>
                                    <button
                                      onClick={() => setMenuAcoesAberto(isMenuAberto ? null : item.sku)}
                                      style={{
                                        padding: '5px 12px',
                                        fontSize: '12px',
                                        fontWeight: 500,
                                        borderRadius: '6px',
                                        border: '1px solid #334155',
                                        cursor: 'pointer',
                                        whiteSpace: 'nowrap',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        height: '28px',
                                        lineHeight: 1,
                                        backgroundColor: isMenuAberto ? '#334155' : 'rgba(30, 41, 59, 0.75)',
                                        color: isMenuAberto ? '#ffffff' : '#cbd5e1',
                                        transition: '0.15s'
                                      }}
                                      onMouseEnter={e => {
                                        if (!isMenuAberto) {
                                          e.currentTarget.style.backgroundColor = '#334155';
                                          e.currentTarget.style.color = '#ffffff';
                                        }
                                      }}
                                      onMouseLeave={e => {
                                        if (!isMenuAberto) {
                                          e.currentTarget.style.backgroundColor = 'rgba(30, 41, 59, 0.75)';
                                          e.currentTarget.style.color = '#cbd5e1';
                                        }
                                      }}
                                    >
                                      ⚙️ Ações ▾
                                    </button>

                                    {isMenuAberto && (
                                      <div
                                        style={{
                                          position: 'absolute',
                                          right: 0,
                                          top: '100%',
                                          marginTop: '4px',
                                          backgroundColor: colors.bgCard,
                                          border: `1px solid ${colors.borderStrong}`,
                                          borderRadius: '8px',
                                          boxShadow: '0 10px 30px rgba(0,0,0,0.85)',
                                          zIndex: 1000,
                                          minWidth: '160px',
                                          padding: '4px 0',
                                          display: 'flex',
                                          flexDirection: 'column'
                                        }}
                                      >
                                        <button
                                          onClick={() => { setProdutoParaEditar(item); setMenuAcoesAberto(null); }}
                                          style={{
                                            padding: '8px 14px',
                                            backgroundColor: 'transparent',
                                            border: 'none',
                                            color: colors.textPrimary,
                                            fontSize: '12.5px',
                                            fontWeight: 500,
                                            textAlign: 'left',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            width: '100%',
                                            transition: '0.15s'
                                          }}
                                          onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.15)'}
                                          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                                        >
                                          ✏️ Editar
                                        </button>

                                        <button
                                          onClick={() => { toggleStatusProduto(item.sku); setMenuAcoesAberto(null); }}
                                          style={{
                                            padding: '8px 14px',
                                            backgroundColor: 'transparent',
                                            border: 'none',
                                            color: item.ativo === false ? colors.successText : colors.amber,
                                            fontSize: '12.5px',
                                            fontWeight: 500,
                                            textAlign: 'left',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            width: '100%',
                                            transition: '0.15s'
                                          }}
                                          onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(245, 158, 11, 0.15)'}
                                          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                                        >
                                          {item.ativo === false ? '▶️ Ativar Produto' : '⏸️ Pausar Produto'}
                                        </button>

                                        <div style={{ height: '1px', backgroundColor: colors.border, margin: '4px 0' }} />

                                        <button
                                          onClick={() => { setMenuAcoesAberto(null); excluirProduto(item.sku); }}
                                          style={{
                                            padding: '8px 14px',
                                            backgroundColor: 'transparent',
                                            border: 'none',
                                            color: '#f87171',
                                            fontSize: '12.5px',
                                            fontWeight: 500,
                                            textAlign: 'left',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            width: '100%',
                                            transition: '0.15s'
                                          }}
                                          onMouseEnter={e => e.currentTarget.style.backgroundColor = colors.dangerBg}
                                          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                                        >
                                          🗑️ Excluir
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                )}

                                <button
                                  onClick={() => toggleExpandir(item.sku)}
                                  style={{
                                    padding: '5px 10px',
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    borderRadius: '6px',
                                    border: '1px solid rgba(59, 130, 246, 0.35)',
                                    cursor: 'pointer',
                                    whiteSpace: 'nowrap',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    height: '28px',
                                    lineHeight: 1,
                                    backgroundColor: linhaExpandida === item.sku ? 'rgba(59, 130, 246, 0.3)' : 'rgba(59, 130, 246, 0.14)',
                                    color: '#60a5fa',
                                    transition: '0.15s'
                                  }}
                                  onMouseEnter={e => {
                                    e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.28)';
                                    e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.6)';
                                    e.currentTarget.style.color = '#93c5fd';
                                  }}
                                  onMouseLeave={e => {
                                    e.currentTarget.style.backgroundColor = linhaExpandida === item.sku ? 'rgba(59, 130, 246, 0.3)' : 'rgba(59, 130, 246, 0.14)';
                                    e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.35)';
                                    e.currentTarget.style.color = '#60a5fa';
                                  }}
                                >
                                  {linhaExpandida === item.sku ? 'Ocultar' : '+ Info'}
                                </button>
                              </div>
                            </td>
                          </tr>

                          {linhaExpandida === item.sku && (
                            <tr>
                              <td colSpan={7} style={{ padding: '0', borderBottom: `1px solid ${colors.border}` }}>
                                <div style={{ padding: '22px', backgroundColor: colors.bgCardAlt }}>
                                  {!item.analises_plataformas || item.analises_plataformas.length === 0 ? (
                                     <p style={{ color: '#f87171' }}>Nenhuma plataforma vinculada a este produto.</p>
                                  ) : (
                                      item.analises_plataformas.map((ana: any, index: number) => (
                                        <div key={index} style={{ marginBottom: '16px', borderBottom: `1px solid ${colors.border}`, paddingBottom: '16px' }}>
                                          <h4 style={{ color: colors.textPrimary, margin: '0 0 16px 0', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <PlatformIcon nome={ana.plataforma_nome} icone={ana.icone} size={20} /> {ana.plataforma_nome}
                                          </h4>

                                          <div style={{ display: 'flex', gap: '28px', flexWrap: 'wrap', alignItems: 'center' }}>
                                            <div><p style={{ margin: '0 0 5px 0', color: colors.textSecondary, fontSize: '12.5px' }}>ROAS Mín.</p><strong style={{ color: '#e2e8f0' }}>{formatarNumero(ana.roas_minimo)}</strong></div>
                                            <div><p style={{ margin: '0 0 5px 0', color: colors.textSecondary, fontSize: '12.5px' }}>Taxa Plat.</p><strong style={{ color: '#EE6C6D' }}>{formatarMoeda(ana.taxa_plataforma_real)}</strong></div>
                                            <div><p style={{ margin: '0 0 5px 0', color: colors.textSecondary, fontSize: '12.5px' }}>Taxa Fixa</p><strong style={{ color: '#EE6C6D' }}>{formatarMoeda(ana.taxa_fixa)}</strong></div>
                                            <div><p style={{ margin: '0 0 5px 0', color: colors.textSecondary, fontSize: '12.5px' }}>Custo Emb.</p><strong style={{ color: '#EE6C6D' }}>{formatarMoeda(ana.custo_embalagem)}</strong></div>
                                            <div><p style={{ margin: '0 0 5px 0', color: colors.textSecondary, fontSize: '12.5px' }}>Custo Etiq.</p><strong style={{ color: '#EE6C6D' }}>{formatarMoeda(ana.custo_etiqueta)}</strong></div>

                                            <div style={{ borderLeft: `2px solid ${colors.borderStrong}`, paddingLeft: '20px' }}>
                                               <p style={{ margin: '0 0 5px 0', color: colors.textSecondary, fontSize: '11.5px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Custo Total</p>
                                               <strong style={{ color: colors.amber, fontSize: '16px' }}>{formatarMoeda(ana.custo_total)}</strong>
                                            </div>

                                            <div style={{ borderLeft: `2px solid ${colors.borderStrong}`, paddingLeft: '20px' }}>
                                               <p style={{ margin: '0 0 5px 0', color: colors.textSecondary, fontSize: '11.5px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Preço Venda</p>
                                               <strong style={{ color: colors.cyan, fontSize: '16px' }}>{formatarMoeda(item.preco_venda)}</strong>
                                            </div>

                                            <div style={{ borderLeft: `2px solid ${colors.borderStrong}`, paddingLeft: '20px' }}>
                                               <p style={{ margin: '0 0 5px 0', color: colors.textSecondary, fontSize: '11.5px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Margem</p>
                                               <strong style={{ color: ana.margem_final > 0 ? colors.successText : colors.danger, fontSize: '16px' }}>{formatarNumero(ana.margem_final * 100)}%</strong>
                                            </div>

                                            <div style={{ borderLeft: `2px solid ${colors.borderStrong}`, paddingLeft: '20px' }}>
                                               <p style={{ margin: '0 0 5px 0', color: colors.textSecondary, fontSize: '11.5px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Lucro Líquido</p>
                                               <strong style={{ color: ana.lucro_liquido > 0 ? colors.success : colors.danger, fontSize: '18px' }}>{formatarMoeda(ana.lucro_liquido)}</strong>
                                            </div>
                                          </div>
                                        </div>
                                      ))
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {produtosDetalhados.length === 0 && (
                <p style={{ textAlign: 'center', color: colors.textMuted, marginTop: '24px' }}>Nenhum produto cadastrado ainda.</p>
              )}
              {produtosDetalhados.length > 0 && produtosFiltrados.length === 0 && (
                <p style={{ textAlign: 'center', color: colors.textMuted, marginTop: '24px' }}>Nenhum produto encontrado para "{buscaProduto}".</p>
              )}

              {/* Barra de Paginação */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', flexWrap: 'wrap', gap: '12px', paddingTop: '16px', borderTop: `1px solid ${colors.border}` }}>
                <div style={{ fontSize: '13px', color: colors.textSecondary }}>
                  Exibindo página <strong>{paginaAtual}</strong> de <strong>{totalPaginas}</strong> (Total: <strong>{totalProdutos}</strong> {totalProdutos === 1 ? 'SKU' : 'SKUs'})
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', color: colors.textSecondary }}>
                    <span>Por página:</span>
                    <select
                      value={itensPorPagina}
                      onChange={e => {
                        setItensPorPagina(Number(e.target.value));
                        setPaginaAtual(1);
                      }}
                      style={{ ...inputStyle, width: '75px', marginBottom: 0, padding: '4px 8px', fontSize: '12px' }}
                    >
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </div>

                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      disabled={paginaAtual <= 1 || carregandoEstoque}
                      onClick={() => setPaginaAtual(prev => Math.max(1, prev - 1))}
                      style={{
                        ...btnNeutralStyle,
                        padding: '6px 12px',
                        fontSize: '12px',
                        opacity: (paginaAtual <= 1 || carregandoEstoque) ? 0.4 : 1,
                        cursor: (paginaAtual <= 1 || carregandoEstoque) ? 'not-allowed' : 'pointer'
                      }}
                    >
                      ◀️ Anterior
                    </button>
                    <button
                      disabled={paginaAtual >= totalPaginas || carregandoEstoque}
                      onClick={() => setPaginaAtual(prev => Math.min(totalPaginas, prev + 1))}
                      style={{
                        ...btnNeutralStyle,
                        padding: '6px 12px',
                        fontSize: '12px',
                        opacity: (paginaAtual >= totalPaginas || carregandoEstoque) ? 0.4 : 1,
                        cursor: (paginaAtual >= totalPaginas || carregandoEstoque) ? 'not-allowed' : 'pointer'
                      }}
                    >
                      Próxima ▶️
                    </button>
                  </div>
                </div>
              </div>
                </React.Fragment>
              )}
            </div>
          </div>
        )}

        {view === 'usuarios' && (
          <GestaoUsuarios />
        )}

        {view === 'shopee' && (
          <IntegracaoShopee onEstoqueAtualizado={carregarEstoque} />
        )}

        {view === 'tiktok' && (
          <IntegracaoTikTok onEstoqueAtualizado={carregarEstoque} />
        )}
      </div>

      {produtoParaEditar && (
        <ModalEditarProduto
          produto={produtoParaEditar}
          embalagens={embalagens}
          plataformas={plataformas}
          onClose={() => setProdutoParaEditar(null)}
          onSuccess={(msg) => {
            mostrarMensagem(msg);
            carregarEstoque();
          }}
        />
      )}

      {modalImportarAberto && (
        <ImportarProdutosModal
          onClose={() => setModalImportarAberto(false)}
          onSuccess={(msg) => {
            mostrarMensagem(msg);
            carregarEstoque();
          }}
        />
      )}

      {editandoPlataformaModal && (
        <ModalEditarPlataforma
          plataforma={editandoPlataformaModal}
          onClose={() => setEditandoPlataformaModal(null)}
          onSuccess={(msg) => {
            mostrarMensagem(msg);
            carregarInsumos();
            carregarEstoque();
          }}
        />
      )}
    </div>
  );
}

export default App;
