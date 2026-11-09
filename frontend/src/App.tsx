import React, { useState, useEffect, useRef } from 'react';
import {
  Menu, X, LayoutDashboard, Package, ClipboardList, TrendingDown,
  Calculator, Receipt, Plug, Store, Settings, Users, User, LogOut,
  Archive, Tag, Pencil, Lock, Zap, Trash2, PackagePlus, FileSpreadsheet,
  CheckCircle, PauseCircle, ChevronDown, Play, Pause, ChevronLeft, ChevronRight,
  CheckCircle2, ArrowUpDown, ArrowUp, ArrowDown, Sun, Moon, PanelLeftClose, PanelLeftOpen
} from 'lucide-react';

import { PlatformIcon } from './PlatformIcon';
import { api, apiGet, apiGetSWR, apiPrefetch } from './services/api';
import { Dashboard } from './Dashboard';
import { Login } from './Login';
import { SimuladorPreco } from './SimuladorPreco';
import { ModalEditarProduto } from './ModalEditarProduto';
import { ModalEditarPlataforma } from './ModalEditarPlataforma';
import { HistoricoEstoque } from './HistoricoEstoque';
import { ImportarProdutosModal } from './ImportarProdutosModal';
import { GestaoUsuarios } from './GestaoUsuarios';
import { Integracoes } from './Integracoes';
import { VendaDireta } from './VendaDireta';
import ProdutosSemVenda from './ProdutosSemVenda';
import { PageHeader, MessageBanner, CollapsibleCard } from './ui';
import { SkeletonTable, SkeletonBox, LinhasSkeleton } from './Skeleton';
import {
  colors, layoutStyle, sidebarStyle, contentStyle,
  cardStyle, sectionGapStyle, cardTitleStyle, cardDescStyle,
  inputStyle, btnStyle, btnSuccessStyle, btnPurpleStyle, btnDangerStyle, btnNeutralStyle,
  tableHeaderStyle, tableCellStyle, formatarMoeda, formatarNumero
} from './theme';

type View = 'dashboard' | 'cadastros' | 'estoque' | 'almoxarifado' | 'plataformas' | 'simulador' | 'historico' | 'usuarios' | 'shopee' | 'tiktok' | 'venda_direta' | 'sem_venda' | 'integracoes';

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
  const [view, setView] = useState<View>(() => {
    const params = new URLSearchParams(window.location.search);
    const v = params.get('view') as View;
    const validViews: View[] = ['dashboard', 'cadastros', 'estoque', 'almoxarifado', 'plataformas', 'simulador', 'historico', 'usuarios', 'shopee', 'tiktok', 'venda_direta', 'sem_venda', 'integracoes'];
    if (v && validViews.includes(v)) return v;
    return 'dashboard';
  });

  const mudarView = (novaView: View) => {
    setView(novaView);
    const url = new URL(window.location.href);
    url.searchParams.set('view', novaView);
    window.history.pushState({}, '', url.toString());
  };

  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const v = params.get('view') as View;
      if (v) setView(v);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);


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
      return <ArrowUpDown size={12} style={{ opacity: 0.4, marginLeft: '6px', verticalAlign: 'middle', display: 'inline-block' }} />;
    }
    return sortDirection === 'asc' ? (
      <ArrowUp size={12} style={{ color: colors.accent, marginLeft: '6px', verticalAlign: 'middle', display: 'inline-block' }} />
    ) : (
      <ArrowDown size={12} style={{ color: colors.accent, marginLeft: '6px', verticalAlign: 'middle', display: 'inline-block' }} />
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

  // --- INSUMOS: carrega do cache imediatamente, revalida em background ---
  // Enquanto a primeira carga não chega, as tabelas mostram skeleton em vez
  // de "Nenhuma cadastrada" (que seria mentira durante o carregamento).
  const [insumosProntos, setInsumosProntos] = useState(false);

  const carregarInsumos = () => {
    // Stale-while-revalidate: serve do cache instantaneamente, busca atualização em background
    apiGetSWR<any[]>('/embalagens/', undefined, setEmbalagens);
    apiGetSWR<any[]>('/configuracoes/', undefined, setConfiguracoes);
    apiGetSWR<any[]>('/plataformas/', undefined, setPlataformas);

    // Primeira carga sem cache: apiGet reaproveita a mesma requisição do SWR acima
    Promise.allSettled([
      apiGet<any[]>('/embalagens/').then(setEmbalagens),
      apiGet<any[]>('/configuracoes/').then(setConfiguracoes),
      apiGet<any[]>('/plataformas/').then(setPlataformas),
    ]).finally(() => setInsumosProntos(true));
  };

  useEffect(() => {
    carregarInsumos();
  }, []);

  const [carregandoEstoque, setCarregandoEstoque] = useState<boolean>(true);
  const [paginaAtual, setPaginaAtual] = useState<number>(1);
  const [itensPorPagina, setItensPorPagina] = useState<number>(20);
  const [totalProdutos, setTotalProdutos] = useState<number>(0);
  const [totalPaginas, setTotalPaginas] = useState<number>(1);

  // Cada carga do estoque ganha um número; respostas de cargas antigas (ex.: a
  // busca "cab" chegando depois de "cabo") são descartadas em vez de
  // sobrescrever o resultado mais novo.
  const reqEstoqueId = useRef(0);
  const ultimaBuscaEstoque = useRef(buscaProduto);

  const carregarEstoque = (
    page = paginaAtual,
    limit = itensPorPagina,
    busca = buscaProduto,
    status = filtroStatus
  ) => {
    if (view === 'estoque') {
      const params: Record<string, string> = {
        page: String(page),
        limit: String(limit),
      };
      if (busca) params['busca'] = busca;
      if (status) params['status'] = status;

      const reqId = ++reqEstoqueId.current;
      const applyData = (data: any) => {
        if (reqId !== reqEstoqueId.current) return;
        if (data && typeof data === 'object' && 'produtos' in data) {
          setProdutosDetalhados(data.produtos);
          setTotalProdutos(data.total);
          setTotalPaginas(data.total_pages);
          setPaginaAtual(data.page);
        } else {
          setProdutosDetalhados(data || []);
          setTotalProdutos(data ? data.length : 0);
          setTotalPaginas(1);
          setPaginaAtual(1);
        }
      };

      // Stale-while-revalidate: serve do cache sem mostrar skeleton
      const cached = apiGetSWR<any>('/produtos/detalhados', params, (fresh) => {
        applyData(fresh);
        if (reqId === reqEstoqueId.current) setCarregandoEstoque(false);
      });

      if (cached !== null) {
        // Dados do cache disponíveis — exibe instantaneamente
        applyData(cached);
        setCarregandoEstoque(false);
      } else {
        // Sem cache: busca normal com loading
        setCarregandoEstoque(true);
        apiGet<any>('/produtos/detalhados', params)
          .then(applyData)
          .catch(err => console.error('Erro ao carregar estoque:', err))
          .finally(() => { if (reqId === reqEstoqueId.current) setCarregandoEstoque(false); });
      }
    }
  };

  useEffect(() => {
    if (view === 'estoque') {
      // Só a digitação na busca espera (300ms). Trocar página, filtro ou
      // quantidade por página busca na hora.
      const digitando = buscaProduto !== ultimaBuscaEstoque.current;
      ultimaBuscaEstoque.current = buscaProduto;
      const timer = setTimeout(() => {
        carregarEstoque(paginaAtual, itensPorPagina, buscaProduto, filtroStatus);
      }, digitando ? 300 : 0);
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
        mostrarMensagem(sucessoMsg);
        e.currentTarget.reset();
        carregarInsumos();
        carregarEstoque();
    } catch (err: any) {
        if (!err.response || (err.response.status >= 200 && err.response.status < 300)) {
            mostrarMensagem(sucessoMsg);
            e.currentTarget.reset();
            carregarInsumos();
            carregarEstoque();
        } else {
            const erroBackend = err.response?.data?.detail || 'Erro ao processar cadastro.';
            mostrarMensagem(erroBackend, 7000);
        }
    }
  };

  // --- EXCLUSÕES ---
  const excluirProduto = async (sku: string) => {
    if (!window.confirm(`Tem certeza que deseja excluir o produto SKU: ${sku}?`)) return;
    try {
      await api.delete(`/produtos/${sku}`);
      mostrarMensagem(`Produto ${sku} excluído com sucesso!`);
      carregarEstoque();
    } catch (err) {
      mostrarMensagem('Erro ao excluir produto.');
    }
  };

  const excluirEmbalagem = async (id: number, nome: string) => {
    if (!window.confirm(`Tem certeza que deseja excluir a embalagem "${nome}"?`)) return;
    try {
      await api.delete(`/embalagens/${id}`);
      mostrarMensagem(`Embalagem excluída com sucesso!`);
      carregarInsumos();
    } catch (err: any) {
      const erroBackend = err.response?.data?.detail || 'Erro ao excluir.';
      mostrarMensagem(erroBackend, 7000);
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
      mostrarMensagem('Embalagem atualizada com sucesso!');
      setEditandoEmbalagem(null);
      carregarInsumos();
    } catch (err: any) {
      mostrarMensagem('Erro ao editar embalagem: ' + (err.response?.data?.detail || 'Erro inesperado'), 7000);
    }
  };

  const toggleStatusProduto = async (sku: string) => {
    try {
      const res = await api.patch(`/produtos/${sku}/status`);
      mostrarMensagem(`Status do produto ${res.data.produto} alterado para ${res.data.ativo ? 'Ativo' : 'Desativado'}!`);
      carregarEstoque();
    } catch (err: any) {
      mostrarMensagem('Erro ao alterar status do produto: ' + (err.response?.data?.detail || 'Erro inesperado'), 7000);
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
    if (abaId === 'integracoes') {
      return abasLiberadas.includes('integracoes') || abasLiberadas.includes('shopee') || abasLiberadas.includes('tiktok');
    }
    return abasLiberadas.includes(abaId.toLowerCase());
  };

  // --- TEMA CLARO / ESCURO ---
  // Claro por padrão; a escolha fica salva no navegador. O index.html aplica o
  // atributo antes do React carregar, então a tela não "pisca" no tema errado.
  const [tema, setTema] = useState<'light' | 'dark'>(() => {
    try { return localStorage.getItem('tema') === 'dark' ? 'dark' : 'light'; } catch { return 'light'; }
  });

  useEffect(() => {
    document.documentElement.dataset.theme = tema;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', tema === 'dark' ? '#0f0f13' : '#f7f7f9');
    try { localStorage.setItem('tema', tema); } catch { /* modo privado */ }
  }, [tema]);

  const trocarTema = (novo: 'light' | 'dark') => {
    if (novo === tema) return;
    const aplicar = () => {
      document.documentElement.dataset.theme = novo;
      setTema(novo);
    };
    const reduzir = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const doc = document as Document & { startViewTransition?: (cb: () => void) => unknown };
    if (doc.startViewTransition && !reduzir) doc.startViewTransition(aplicar);
    else aplicar();
  };

  // --- MENU LATERAL RECOLHÍVEL (desktop) ---
  // Vira um trilho só de ícones para liberar espaço. Sem preferência salva,
  // começa recolhido em telas de notebook (< 1280px).
  const [menuRecolhido, setMenuRecolhido] = useState<boolean>(() => {
    try {
      const salvo = localStorage.getItem('menuRecolhido');
      if (salvo !== null) return salvo === '1';
    } catch { /* modo privado */ }
    return window.innerWidth < 1280;
  });

  const alternarMenuRecolhido = () => {
    setMenuRecolhido(r => {
      try { localStorage.setItem('menuRecolhido', r ? '0' : '1'); } catch { /* modo privado */ }
      return !r;
    });
  };

  // --- DICAS (tooltips) DO MENU LATERAL ---
  // Renderizadas fora da barra (position: fixed) porque a barra corta o que
  // passa da borda. Primeira dica espera 350ms; as seguintes aparecem na hora
  // enquanto o mouse percorre o menu.
  const [dica, setDica] = useState<{ texto: string; top: number; left: number; imediata: boolean } | null>(null);
  const dicaAlvo = useRef<HTMLElement | null>(null);
  const dicaTimer = useRef<number | undefined>(undefined);
  const dicaUltima = useRef(0);

  const esconderDica = () => {
    window.clearTimeout(dicaTimer.current);
    if (dicaAlvo.current) dicaUltima.current = Date.now();
    dicaAlvo.current = null;
    setDica(null);
  };

  const mostrarDica = (e: React.MouseEvent) => {
    const alvo = (e.target as HTMLElement).closest<HTMLElement>('[data-tooltip]');
    if (alvo === dicaAlvo.current) return;
    if (!alvo || !alvo.dataset.tooltip || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
      esconderDica();
      return;
    }
    window.clearTimeout(dicaTimer.current);
    const imediata = dicaAlvo.current !== null || Date.now() - dicaUltima.current < 400;
    dicaAlvo.current = alvo;
    const r = alvo.getBoundingClientRect();
    const nova = { texto: alvo.dataset.tooltip, top: r.top + r.height / 2, left: r.right + 10, imediata };
    if (imediata) setDica(nova);
    else dicaTimer.current = window.setTimeout(() => setDica(nova), 350);
  };

  // --- MENU DO CELULAR (bottom sheet): arrastar para baixo fecha ---
  // Acompanha o dedo 1:1 pelo cabeçalho do painel. Fecha se arrastou mais de
  // 110px OU se foi um "peteleco" rápido (velocidade > 0.11 px/ms), mesmo curto.
  const sheetRef = useRef<HTMLElement | null>(null);
  const arraste = useRef<{ y0: number; t0: number; dy: number; id: number } | null>(null);

  const iniciarArraste = (e: React.PointerEvent<HTMLDivElement>) => {
    if (arraste.current || (e.target as HTMLElement).closest('button')) return;
    const sheet = sheetRef.current;
    if (!sheet || !window.matchMedia('(max-width: 860px)').matches) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    arraste.current = { y0: e.clientY, t0: performance.now(), dy: 0, id: e.pointerId };
    sheet.style.transition = 'none';
  };

  const moverArraste = (e: React.PointerEvent<HTMLDivElement>) => {
    const a = arraste.current;
    const sheet = sheetRef.current;
    if (!a || !sheet || e.pointerId !== a.id) return;
    const bruto = e.clientY - a.y0;
    // Para cima o painel resiste (rubber-band); para baixo segue o dedo
    a.dy = bruto >= 0 ? bruto : -Math.sqrt(-bruto) * 2;
    sheet.style.transform = `translateY(${a.dy}px)`;
  };

  const soltarArraste = (e: React.PointerEvent<HTMLDivElement>) => {
    const a = arraste.current;
    const sheet = sheetRef.current;
    if (!a || e.pointerId !== a.id) return;
    arraste.current = null;
    if (!sheet) return;
    const velocidade = a.dy / Math.max(1, performance.now() - a.t0);
    // Limpar os estilos inline faz a transição do CSS partir da posição atual
    sheet.style.transition = '';
    sheet.style.transform = '';
    if (a.dy > 110 || (velocidade > 0.11 && a.dy > 20)) setMenuAberto(false);
  };

  // Fecha o menu mobile com Esc e trava o scroll da página enquanto ele está aberto
  useEffect(() => {
    if (!menuAberto) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuAberto(false); };
    const overflowAnterior = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.documentElement.style.overflow = overflowAnterior;
      window.removeEventListener('keydown', onKey);
    };
  }, [menuAberto]);

  const isViewAtiva = (target: View) =>
    view === target ||
    (target === 'integracoes' && (view === 'shopee' || view === 'tiktok')) ||
    (target === 'estoque' && view === 'almoxarifado');

  // Navegação com <a> real: permite botão direito ("Abrir em nova guia"), Ctrl+clique ou clique do meio
  const irPara = (e: React.MouseEvent<HTMLAnchorElement>, target: View) => {
    if (e.ctrlKey || e.metaKey || e.shiftKey || e.button === 1) return;
    e.preventDefault();
    if (target !== view) mudarView(target);
    setMenuAberto(false);
    window.scrollTo({ top: 0 });
  };

  // Pré-carrega os dados da tela quando o mouse para sobre o link (ou o dedo
  // toca), para que ela abra com os dados já no cache.
  const preCarregar = (target: View) => {
    if (target === view) return;
    if (target === 'estoque') {
      const params: Record<string, string> = { page: '1', limit: String(itensPorPagina) };
      if (filtroStatus) params['status'] = filtroStatus;
      apiPrefetch('/produtos/detalhados', params);
    } else if (target === 'dashboard') {
      apiPrefetch('/dashboard/resumo');
      apiPrefetch('/produtos/alertas', { limite: '0' });
    } else if (target === 'plataformas') {
      apiPrefetch('/plataformas/');
    } else if (target === 'cadastros' || target === 'almoxarifado') {
      apiPrefetch('/embalagens/');
      apiPrefetch('/configuracoes/');
    }
  };

  // Função (não componente) para não remontar os links a cada render
  const navItem = (icon: React.ReactNode, label: string, target: View) => (
    <a
      key={target}
      href={`/?view=${target}`}
      className="nav-item"
      data-tooltip={menuRecolhido ? label : undefined}
      aria-current={isViewAtiva(target) ? 'page' : undefined}
      onClick={(e) => irPara(e, target)}
      onPointerEnter={() => preCarregar(target)}
      onFocus={() => preCarregar(target)}
    >
      {icon}
      <span>{label}</span>
    </a>
  );

  // Abas fixas no rodapé do celular (as 4 telas mais usadas, respeitando permissões)
  const abasRodape = ([
    { target: 'dashboard', label: 'Início', icon: <LayoutDashboard size={21} />, ok: temPermissaoAba('dashboard') },
    { target: 'estoque', label: 'Estoque', icon: <Package size={21} />, ok: temPermissaoAba('estoque') },
    { target: 'venda_direta', label: 'Venda', icon: <Receipt size={21} />, ok: true },
    { target: 'simulador', label: 'Simulador', icon: <Calculator size={21} />, ok: temPermissaoAba('calculadora') || temPermissaoAba('simulador') },
  ] as { target: View; label: string; icon: React.ReactNode; ok: boolean }[]).filter(a => a.ok).slice(0, 4);

  const iniciais = (usuario?.nome || usuario?.email || 'U')
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p: string) => p[0]?.toUpperCase())
    .join('');

  const corPapel = userRole === 'admin'
    ? { bg: 'color-mix(in srgb, var(--accent) 12%, transparent)', fg: 'var(--accent-text)', bd: 'transparent' }
    : userRole === 'editor'
      ? { bg: 'color-mix(in srgb, var(--positive) 16%, transparent)', fg: colors.successText, bd: 'color-mix(in srgb, var(--positive) 40%, transparent)' }
      : { bg: 'color-mix(in srgb, var(--text-muted) 14%, transparent)', fg: colors.textSecondary, bd: colors.border };

  if (!token) {
    return <Login onLoginSuccess={handleLoginSuccess} tema={tema} onTrocarTema={trocarTema} />;
  }

  return (
    <div style={layoutStyle} className="app-layout">
      <header
        style={{ ...sidebarStyle, width: menuRecolhido ? '72px' : sidebarStyle.width }}
        className="app-sidebar"
        data-collapsed={menuRecolhido ? 'true' : 'false'}
        onMouseOver={mostrarDica}
        onMouseLeave={esconderDica}
      >
        <div className="app-sidebar-brand">
          <img src="/icone.png" alt="" />
          <h1 className="brand-title">Skold Stock</h1>
          <button
            type="button"
            className="sidebar-toggle"
            onClick={() => { esconderDica(); alternarMenuRecolhido(); }}
            data-tooltip={menuRecolhido ? 'Expandir menu' : 'Recolher menu'}
            aria-label={menuRecolhido ? 'Expandir menu' : 'Recolher menu'}
            aria-expanded={!menuRecolhido}
          >
            {menuRecolhido ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
          </button>
        </div>

        <div
          className={`nav-scrim${menuAberto ? ' open' : ''}`}
          onClick={() => setMenuAberto(false)}
          aria-hidden="true"
        />

        <nav ref={sheetRef} id="menu-principal" aria-label="Menu principal" className={`app-sidebar-nav${menuAberto ? ' open' : ''}`}>
          <div
            className="drawer-close"
            onPointerDown={iniciarArraste}
            onPointerMove={moverArraste}
            onPointerUp={soltarArraste}
            onPointerCancel={soltarArraste}
          >
            <span className="sheet-grabber" aria-hidden="true" />
            <span className="nav-group-label" style={{ margin: 0 }}>Menu</span>
            <button type="button" onClick={() => setMenuAberto(false)} aria-label="Fechar menu">
              <X size={18} />
            </button>
          </div>

          <div className="nav-group-label">Dashboard</div>
          {temPermissaoAba('dashboard') && navItem(<LayoutDashboard size={18} />, 'Visão Geral', 'dashboard')}

          <div className="nav-group-label">Estoque</div>
          {temPermissaoAba('estoque') && navItem(<Package size={18} />, 'Controle de Estoque', 'estoque')}
          {temPermissaoAba('historico') && navItem(<ClipboardList size={18} />, 'Histórico', 'historico')}
          {navItem(<TrendingDown size={18} />, 'Produtos Parados', 'sem_venda')}

          <div className="nav-group-label">Vendas</div>
          {(temPermissaoAba('calculadora') || temPermissaoAba('simulador')) && navItem(<Calculator size={18} />, 'Simulador de Preço', 'simulador')}
          {navItem(<Receipt size={18} />, 'Baixa Venda Manual', 'venda_direta')}

          <div className="nav-group-label">Configurações</div>
          {temPermissaoAba('integracoes') && navItem(<Plug size={18} />, 'Integrações', 'integracoes')}
          {temPermissaoAba('plataformas') && navItem(<Store size={18} />, 'Plataformas de Venda', 'plataformas')}
          {(temPermissaoAba('insumos') || temPermissaoAba('cadastros')) && navItem(<Settings size={18} />, 'Cadastros e Config.', 'cadastros')}
          {(userRole === 'admin' || temPermissaoAba('usuarios')) && navItem(<Users size={18} />, 'Gestão de Usuários', 'usuarios')}

          {/* Rodapé com o usuário logado & logout */}
          <div className="user-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
              <span className="user-avatar" aria-hidden="true" title={usuario?.nome || undefined}>{iniciais || <User size={15} />}</span>
              <div className="user-info" style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                  <span style={{ fontSize: '13.5px', color: colors.textPrimary, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {usuario?.nome || 'Usuário'}
                  </span>
                  <span className="role-badge" style={{ backgroundColor: corPapel.bg, color: corPapel.fg, borderColor: corPapel.bd }}>
                    {userRole.toUpperCase()}
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: colors.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '2px' }}>
                  {usuario?.email || ''}
                </div>
              </div>
            </div>
            <div className="sidebar-actions">
              <button type="button" onClick={handleLogout} className="logout-btn" data-tooltip={menuRecolhido ? 'Sair' : undefined} aria-label="Sair da conta">
                <LogOut size={15} /> <span>Sair</span>
              </button>
              <div className="theme-switch" role="group" aria-label="Tema">
                <button type="button" aria-pressed={tema === 'light'} aria-label="Tema claro" title="Tema claro" onClick={() => trocarTema('light')}>
                  <Sun size={15} />
                </button>
                <button type="button" aria-pressed={tema === 'dark'} aria-label="Tema escuro" title="Tema escuro" onClick={() => trocarTema('dark')}>
                  <Moon size={15} />
                </button>
              </div>
            </div>
          </div>
        </nav>
      </header>

      {dica && (
        <div
          role="tooltip"
          className={`sidebar-tooltip${dica.imediata ? ' imediata' : ''}`}
          style={{ top: dica.top, left: dica.left }}
        >
          {dica.texto}
        </div>
      )}

      <nav className="tab-bar" aria-label="Atalhos">
        {abasRodape.map(aba => (
          <a
            key={aba.target}
            href={`/?view=${aba.target}`}
            className="tab-item"
            aria-current={isViewAtiva(aba.target) ? 'page' : undefined}
            onClick={(e) => irPara(e, aba.target)}
            onPointerDown={() => preCarregar(aba.target)}
          >
            {aba.icon}
            <span>{aba.label}</span>
          </a>
        ))}
        <button
          type="button"
          className="tab-item"
          onClick={() => setMenuAberto(true)}
          aria-label="Abrir menu completo"
          aria-expanded={menuAberto}
          aria-controls="menu-principal"
        >
          <Menu size={21} />
          <span>Menu</span>
        </button>
      </nav>

      <main style={contentStyle} className="app-content">
        <div key={view} className="page-enter">
        {view === 'dashboard' && <Dashboard />}

        {view === 'simulador' && <SimuladorPreco />}

        {view === 'historico' && <HistoricoEstoque />}

        {view === 'sem_venda' && <ProdutosSemVenda />}

        {view === 'venda_direta' && <VendaDireta mostrarMensagem={mostrarMensagem} carregarEstoqueGlobal={carregarEstoque} />}


        {view === 'almoxarifado' && (
          <div>
            <PageHeader title="Gestão de Almoxarifado" subtitle="Custos de embalagens e etiquetas usados no cálculo de margem." />
            <MessageBanner mensagem={mensagem} />

            {/* Seletor de Sub-Abas em Estoque */}
            <div
              style={{
                display: 'flex',
                gap: '8px',
                marginBottom: '24px',
                paddingBottom: '16px',
                borderBottom: `1px solid ${colors.border}`,
                flexWrap: 'wrap',
                alignItems: 'center',
              }}
            >
              <span style={{ fontSize: '13px', fontWeight: 600, color: colors.textMuted, marginRight: '4px' }}>
                Estoque:
              </span>

              <button
                type="button"
                onClick={() => mudarView('estoque')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 18px',
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '13.5px',
                  cursor: 'pointer',
                  border: `1px solid ${colors.border}`,
                  backgroundColor: colors.bgCard,
                  color: colors.textSecondary,
                }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><Package size={16} /> Produtos</span>
              </button>

              <button
                type="button"
                onClick={() => mudarView('almoxarifado')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 18px',
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '13.5px',
                  cursor: 'pointer',
                  border: '1px solid var(--positive)',
                  backgroundColor: 'color-mix(in srgb, var(--positive) 16%, transparent)',
                  color: 'var(--positive)',
                }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><Archive size={16} /> Almoxarifado</span>
              </button>
            </div>

            <div style={sectionGapStyle}>
              <div style={{ ...cardStyle }}>
                <h3 style={{ ...cardTitleStyle, display: "inline-flex", alignItems: "center", gap: "8px" }}><Tag size={18} /> Etiqueta de Envio Padrão</h3>
                {etiquetaPadrao ? (
                  <div style={{ display: 'flex', gap: '40px', marginTop: '18px', flexWrap: 'wrap' }}>
                    <div><p style={{ margin: '0 0 5px 0', color: colors.textSecondary, fontSize: '13px' }}>Custo do Rolo</p><strong style={{ color: colors.textPrimary, fontSize: '18px' }}>{formatarMoeda(etiquetaPadrao.valor_pacote)}</strong></div>
                    <div><p style={{ margin: '0 0 5px 0', color: colors.textSecondary, fontSize: '13px' }}>Qtd. no Rolo</p><strong style={{ color: colors.textPrimary, fontSize: '18px' }}>{etiquetaPadrao.qtd_unidades} un.</strong></div>
                    <div style={{ borderLeft: `1px solid ${colors.border}`, paddingLeft: '40px' }}><p style={{ margin: '0 0 5px 0', color: colors.textSecondary, fontSize: '13px' }}>Custo por Etiqueta</p><strong style={{ color: colors.success, fontSize: '20px' }}>{formatarMoeda(etiquetaPadrao.valor_pacote / etiquetaPadrao.qtd_unidades)}</strong></div>
                  </div>
                ) : (
                  insumosProntos
                    ? <p style={{ color: 'var(--negative)' }}>Nenhuma etiqueta configurada.</p>
                    : <div style={{ display: 'flex', gap: '40px', marginTop: '18px' }}><SkeletonBox width="110px" height="40px" /><SkeletonBox width="90px" height="40px" /><SkeletonBox width="120px" height="40px" /></div>
                )}
              </div>
            </div>

            <div style={cardStyle}>
              <h3 style={{ ...cardTitleStyle, display: "inline-flex", alignItems: "center", gap: "8px" }}><Package size={18} /> Embalagens e Caixas</h3>
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
                          <tr key={emb.id} style={{ backgroundColor: 'color-mix(in srgb, var(--accent) 10%, transparent)' }}>
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
                              >
                                Salvar
                              </button>
                              <button
                                onClick={cancelarEdicaoEmbalagem}
                                style={{ ...btnNeutralStyle, padding: '5px 10px', fontSize: '12px' }}
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
                          <td className="col-wrap" style={tableCellStyle}>{emb.nome}</td>
                          <td style={tableCellStyle}>{formatarMoeda(emb.custo_pacote)}</td>
                          <td style={tableCellStyle}>{emb.qtd_unidades} un.</td>
                          <td style={{ ...tableCellStyle, color: colors.cyan, fontWeight: 'bold' }}>{formatarMoeda(emb.custo_pacote / emb.qtd_unidades)}</td>
                          <td style={{ ...tableCellStyle, display: 'flex', gap: '6px' }}>
                            {podeEditar ? (
                              <>
                                <button
                                  onClick={() => iniciarEdicaoEmbalagem(emb)}
                                  style={{ ...btnNeutralStyle, padding: '5px 10px', fontSize: '12px' }}
                                >
                                  <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}><Pencil size={12} /> Editar</span>
                                </button>
                                <button
                                  onClick={() => excluirEmbalagem(emb.id, emb.nome)}
                                  style={{ ...btnDangerStyle, padding: '5px 10px', fontSize: '12px' }}
                                >
                                  Excluir
                                </button>
                              </>
                            ) : (
                              <span style={{ color: colors.textMuted, fontSize: '12px' }}><span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}><Lock size={12} /> Somente Leitura</span></span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {embalagens.length === 0 && (
                      insumosProntos
                        ? <tr><td colSpan={6} style={{ ...tableCellStyle, textAlign: 'center', color: colors.textMuted }}>Nenhuma embalagem cadastrada ainda.</td></tr>
                        : <LinhasSkeleton linhas={3} colunas={6} />
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
                icon={<Store size={18} />}
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
                        mostrarMensagem('Plataforma cadastrada com sucesso!');
                        carregarInsumos();
                        formElement.reset();
                        setNovasFaixas([{ de_valor: '0', ate_valor: '', taxa_percentual: '', taxa_fixa: '' }]);
                      })
                      .catch(err => mostrarMensagem('Erro: ' + (err.response?.data?.detail || 'Erro ao cadastrar'), 7000));
                }}>
                  <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '16px' }}>
                    <input name="nome" placeholder="Nome da Plataforma (Ex: Shopee, TikTok, Mercado Livre)" required style={{ ...inputStyle, flex: 2, marginBottom: 0, maxWidth: '100%', minWidth: '180px' }} />
                    <input name="icone" placeholder="Sigla (Ex: SH, TK, ML)" required style={{ ...inputStyle, flex: 1, marginBottom: 0, maxWidth: '100%', minWidth: '100px' }} />
                    <input name="taxa_extra" type="number" step="0.1" placeholder="Taxa Extra % (Ex: 6 para Frete Grátis)" defaultValue="0" style={{ ...inputStyle, flex: 1, marginBottom: 0, maxWidth: '100%', minWidth: '140px' }} />
                  </div>

                  <div style={{ backgroundColor: colors.bgCardAlt, padding: '16px', borderRadius: '10px', border: `1px solid ${colors.border}`, marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <div>
                        <label style={{ color: colors.accent, fontWeight: 700, fontSize: '13px' }}>
                          Faixas de Taxas Progressivas (De X até X → % + Taxa Fixa)
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

                        <span style={{ fontSize: '12px', color: colors.textMuted }}>Taxa %:</span>

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
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  <button
                    type="submit"
                    style={btnPurpleStyle}
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
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><Zap size={12} /> {temFaixas ? `${faixas.length} ${faixas.length === 1 ? 'faixa cadastrada' : 'faixas cadastradas'}` : 'Faixas dinâmicas ativas'}</span>
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
                                >
                                  <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}><Pencil size={12} /> Editar</span>
                                </button>
                                <button
                                  onClick={() => {
                                    if (window.confirm(`Tem certeza que deseja excluir a plataforma "${plat.nome}"?`)) {
                                      api.delete(`/plataformas/${plat.id}`)
                                        .then(() => {
                                          mostrarMensagem('Plataforma excluída com sucesso!');
                                          carregarInsumos();
                                          carregarEstoque();
                                        })
                                        .catch(err => mostrarMensagem('Erro ao excluir plataforma: ' + (err.response?.data?.detail || 'Erro inesperado'), 7000));
                                    }
                                  }}
                                  style={{ ...btnDangerStyle, padding: '6px 14px', fontSize: '12px', whiteSpace: 'nowrap' }}
                                >
                                  Excluir
                                </button>
                              </div>
                            ) : (
                              <span style={{ color: colors.textMuted, fontSize: '12px' }}><span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}><Lock size={12} /> Somente Leitura</span></span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {plataformas.length === 0 && (
                      insumosProntos
                        ? <tr><td colSpan={5} style={{ ...tableCellStyle, textAlign: 'center', color: colors.textMuted }}>Nenhuma plataforma cadastrada.</td></tr>
                        : <LinhasSkeleton linhas={3} colunas={5} />
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
              <div style={{ ...cardStyle }}>
                <h3 style={{ ...cardTitleStyle, display: "inline-flex", alignItems: "center", gap: "8px" }}><Lock size={18} /> Acesso Restrito ao Perfil Leitor</h3>
                <p style={{ color: colors.textSecondary, margin: '8px 0 0 0', fontSize: '14px' }}>
                  Sua conta possui perfil <strong>Leitor (Visualizador)</strong>. Para cadastrar novas embalagens, alterar custos de etiqueta ou cadastrar produtos, solicite autorização a um Administrador.
                </p>
              </div>
            ) : (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))', gap: '24px', marginBottom: '24px', alignItems: 'start' }}>
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
                  >
                    Atualizar Custo
                  </button>
                </form>
              </CollapsibleCard>
            </div>

            <div style={{ ...cardStyle, marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <h3 style={{ ...cardTitleStyle, margin: 0, display: "inline-flex", alignItems: "center", gap: "8px" }}><PackagePlus size={18} /> Cadastro de Novo Produto</h3>
                  <p style={{ ...cardDescStyle, margin: '4px 0 0 0' }}>Cadastre produtos individualmente ou faça upload em lote por planilha.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setModalImportarAberto(true)}
                  style={{ ...btnPurpleStyle, padding: '9px 16px', fontSize: '13.5px' }}
                >
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}><FileSpreadsheet size={15} /> Importar em Massa (Excel / CSV)</span>
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
                      mostrarMensagem('Produto cadastrado com sucesso!');
                      carregarEstoque();
                      formElement.reset();
                    })
                    .catch(err => mostrarMensagem('Erro: ' + (err.response?.data?.detail || 'Erro ao cadastrar'), 7000));
              }}>

                {/* Bloco 1: Identificação */}
                <div style={{ backgroundColor: colors.bgCardAlt, padding: '18px', borderRadius: '10px', border: `1px solid ${colors.border}`, marginBottom: '20px' }}>
                  <h4 style={{ margin: '0 0 12px 0', color: colors.accent, fontSize: '14px', fontWeight: 600 }}>
                    1. Identificação do Produto
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
                    2. Custos & Preço de Venda
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
                    3. Insumos & Canais de Venda
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
                >
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "8px", justifyContent: "center" }}><CheckCircle2 size={16} /> Finalizar Cadastro do Produto</span>
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

            {/* Seletor de Sub-Abas em Estoque */}
            <div
              style={{
                display: 'flex',
                gap: '8px',
                marginBottom: '24px',
                paddingBottom: '16px',
                borderBottom: `1px solid ${colors.border}`,
                flexWrap: 'wrap',
                alignItems: 'center',
              }}
            >
              <span style={{ fontSize: '13px', fontWeight: 600, color: colors.textMuted, marginRight: '4px' }}>
                Estoque:
              </span>

              <button
                type="button"
                onClick={() => mudarView('estoque')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 18px',
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '13.5px',
                  cursor: 'pointer',
                  border: `1px solid ${colors.accent}`,
                  backgroundColor: 'color-mix(in srgb, var(--accent) 16%, transparent)',
                  color: 'var(--accent-text)',
                }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><Package size={16} /> Produtos</span>
              </button>

              <button
                type="button"
                onClick={() => mudarView('almoxarifado')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 18px',
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '13.5px',
                  cursor: 'pointer',
                  border: `1px solid ${colors.border}`,
                  backgroundColor: colors.bgCard,
                  color: colors.textSecondary,
                }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><Archive size={16} /> Almoxarifado</span>
              </button>
            </div>

            <div style={cardStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', gap: '12px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0, flexWrap: 'wrap' }}>
                  <h3 style={{ ...cardTitleStyle, marginBottom: 0, fontSize: '16px' }}>Produtos Cadastrados</h3>
                  <span style={{ backgroundColor: 'color-mix(in srgb, var(--accent) 15%, transparent)', color: colors.accent, border: `1px solid ${colors.borderStrong}`, padding: '2px 8px', borderRadius: '10px', fontSize: '11.5px', fontWeight: 600 }}>
                    {produtosFiltrados.length} {produtosFiltrados.length === 1 ? 'SKU' : 'SKUs'} {buscaProduto || filtroStatus !== 'ativos' ? `(filtrado de ${produtosDetalhados.length})` : ''}
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', backgroundColor: 'color-mix(in srgb, var(--accent) 12%, transparent)', color: 'var(--accent-text)', border: '1px solid color-mix(in srgb, var(--accent) 30%, transparent)', padding: '2px 8px', borderRadius: '10px', fontSize: '11.5px', fontWeight: 600 }}>
                    <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: 'var(--accent-text)', display: 'inline-block' }}></span>
                    Cross-docking
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
                        border: filtroStatus === 'ativos' ? '1px solid color-mix(in srgb, var(--positive) 40%, transparent)' : '1px solid transparent',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: filtroStatus === 'ativos' ? 'color-mix(in srgb, var(--positive) 18%, transparent)' : 'transparent',
                        color: filtroStatus === 'ativos' ? 'var(--positive)' : colors.textMuted,
                      }}
                    >
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}><CheckCircle size={12} /> Ativos</span>
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
                        border: filtroStatus === 'inativos' ? '1px solid color-mix(in srgb, var(--warning) 40%, transparent)' : '1px solid transparent',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: filtroStatus === 'inativos' ? 'color-mix(in srgb, var(--warning) 18%, transparent)' : 'transparent',
                        color: filtroStatus === 'inativos' ? 'var(--warning)' : colors.textMuted,
                      }}
                    >
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}><PauseCircle size={12} /> Pausados</span>
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
                        border: filtroStatus === 'todos' ? '1px solid color-mix(in srgb, var(--accent) 40%, transparent)' : '1px solid transparent',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: filtroStatus === 'todos' ? 'color-mix(in srgb, var(--accent) 18%, transparent)' : 'transparent',
                        color: filtroStatus === 'todos' ? 'var(--accent-text)' : colors.textMuted,
                      }}
                    >
                      Todos
                    </button>
                  </div>

                  <input
                    value={buscaProduto}
                    onChange={e => setBuscaProduto(e.target.value)}
                    placeholder="Buscar por nome ou SKU..."
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
                          }}>
                            <td style={{ ...tableCellStyle, opacity: item.ativo === false ? 0.65 : 1 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                {item.ativo === false ? (
                                  <span style={{ fontSize: '10px', backgroundColor: 'color-mix(in srgb, var(--warning) 20%, transparent)', color: colors.amber, padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>PAUSADO</span>
                                ) : null}
                                <strong>{item.sku}</strong>
                              </div>
                            </td>
                            <td className="col-wrap" style={{ ...tableCellStyle, opacity: item.ativo === false ? 0.65 : 1 }}>{item.nome}</td>
                            <td style={{ ...tableCellStyle, opacity: item.ativo === false ? 0.65 : 1 }}>{formatarMoeda(item.custo_produto)}</td>
                            <td style={{
                              ...tableCellStyle,
                              opacity: item.ativo === false ? 0.65 : 1,
                              color: item.cross_docking ? 'var(--accent-text)' : (item.quantidade_estoque === 0 ? 'var(--negative)' : 'var(--positive)'),
                              fontWeight: 'bold'
                            }}>
                              {item.quantidade_estoque} un.
                            </td>
                            <td style={{ ...tableCellStyle, opacity: item.ativo === false ? 0.65 : 1 }}>{formatarMoeda(item.valor_estoque)}</td>
                            <td style={{ ...tableCellStyle, opacity: item.ativo === false ? 0.65 : 1 }}>
                              {(() => {
                                const shopee = item.analises_plataformas?.find((plat: any) => plat.plataforma_nome?.toLowerCase().includes('shopee'));
                                if (!shopee) return <span style={{ color: colors.textMuted, fontSize: '12px' }}>—</span>;
                                const mPct = shopee.margem_final * 100;
                                const isAlto = mPct >= 20;
                                const isMedio = mPct >= 10 && mPct < 20;
                                const bg = isAlto ? 'color-mix(in srgb, var(--positive) 18%, transparent)' : isMedio ? 'color-mix(in srgb, var(--warning) 18%, transparent)' : 'color-mix(in srgb, var(--negative) 18%, transparent)';
                                const textCol = isAlto ? 'var(--positive)' : isMedio ? 'var(--warning)' : 'var(--negative)';
                                const borderCol = isAlto ? 'color-mix(in srgb, var(--positive) 35%, transparent)' : isMedio ? 'color-mix(in srgb, var(--warning) 35%, transparent)' : 'color-mix(in srgb, var(--negative) 35%, transparent)';

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
                                        border: '1px solid var(--border-strong)',
                                        cursor: 'pointer',
                                        whiteSpace: 'nowrap',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        height: '28px',
                                        lineHeight: 1,
                                        backgroundColor: isMenuAberto ? 'var(--border-strong)' : 'var(--surface-neutral)',
                                        color: isMenuAberto ? 'var(--text-primary)' : 'var(--text-secondary)',
                                      }}
                                    >
                                      <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}><Settings size={12} /> Ações <ChevronDown size={11} /></span>
                                    </button>

                                    {isMenuAberto && (
                                      <div className="popover popover-right"
                                        style={{
                                          position: 'absolute',
                                          right: 0,
                                          top: '100%',
                                          marginTop: '4px',
                                          backgroundColor: colors.bgCard,
                                          border: `1px solid ${colors.borderStrong}`,
                                          borderRadius: '8px',
                                          boxShadow: 'var(--shadow-lg)',
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
                                          }}
                                        >
                                          <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}><Pencil size={12} /> Editar</span>
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
                                          }}
                                        >
                                          {item.ativo === false ? <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}><Play size={12} /> Ativar Produto</span> : <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}><Pause size={12} /> Pausar Produto</span>}
                                        </button>

                                        <div style={{ height: '1px', backgroundColor: colors.border, margin: '4px 0' }} />

                                        <button
                                          onClick={() => { setMenuAcoesAberto(null); excluirProduto(item.sku); }}
                                          style={{
                                            padding: '8px 14px',
                                            backgroundColor: 'transparent',
                                            border: 'none',
                                            color: 'var(--negative)',
                                            fontSize: '12.5px',
                                            fontWeight: 500,
                                            textAlign: 'left',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            width: '100%',
                                          }}
                                        >
                                          <Trash2 size={13} /> Excluir
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
                                    border: '1px solid color-mix(in srgb, var(--accent) 35%, transparent)',
                                    cursor: 'pointer',
                                    whiteSpace: 'nowrap',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    height: '28px',
                                    lineHeight: 1,
                                    backgroundColor: linhaExpandida === item.sku ? 'color-mix(in srgb, var(--accent) 30%, transparent)' : 'color-mix(in srgb, var(--accent) 14%, transparent)',
                                    color: 'var(--accent-text)',
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
                                <div className="row-expand" style={{ padding: '22px', backgroundColor: colors.bgCardAlt }}>
                                  {!item.analises_plataformas || item.analises_plataformas.length === 0 ? (
                                     <p style={{ color: 'var(--negative)' }}>Nenhuma plataforma vinculada a este produto.</p>
                                  ) : (
                                      item.analises_plataformas.map((ana: any, index: number) => (
                                        <div key={index} style={{ marginBottom: '16px', borderBottom: `1px solid ${colors.border}`, paddingBottom: '16px' }}>
                                          <h4 style={{ color: colors.textPrimary, margin: '0 0 16px 0', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <PlatformIcon nome={ana.plataforma_nome} icone={ana.icone} size={20} /> {ana.plataforma_nome}
                                          </h4>

                                          <div style={{ display: 'flex', gap: '28px', flexWrap: 'wrap', alignItems: 'center' }}>
                                            <div><p style={{ margin: '0 0 5px 0', color: colors.textSecondary, fontSize: '12.5px' }}>ROAS Mín.</p><strong style={{ color: 'var(--text-primary)' }}>{formatarNumero(ana.roas_minimo)}</strong></div>
                                            <div><p style={{ margin: '0 0 5px 0', color: colors.textSecondary, fontSize: '12.5px' }}>Taxa Plat.</p><strong style={{ color: 'var(--negative)' }}>{formatarMoeda(ana.taxa_plataforma_real)}</strong></div>
                                            <div><p style={{ margin: '0 0 5px 0', color: colors.textSecondary, fontSize: '12.5px' }}>Taxa Fixa</p><strong style={{ color: 'var(--negative)' }}>{formatarMoeda(ana.taxa_fixa)}</strong></div>
                                            <div><p style={{ margin: '0 0 5px 0', color: colors.textSecondary, fontSize: '12.5px' }}>Custo Emb.</p><strong style={{ color: 'var(--negative)' }}>{formatarMoeda(ana.custo_embalagem)}</strong></div>
                                            <div><p style={{ margin: '0 0 5px 0', color: colors.textSecondary, fontSize: '12.5px' }}>Custo Etiq.</p><strong style={{ color: 'var(--negative)' }}>{formatarMoeda(ana.custo_etiqueta)}</strong></div>

                                            <div style={{ borderLeft: `2px solid ${colors.borderStrong}`, paddingLeft: '20px' }}>
                                               <p style={{ margin: '0 0 5px 0', color: colors.textSecondary, fontSize: '11.5px' }}>Custo Total</p>
                                               <strong style={{ color: colors.amber, fontSize: '16px' }}>{formatarMoeda(ana.custo_total)}</strong>
                                            </div>

                                            <div style={{ borderLeft: `2px solid ${colors.borderStrong}`, paddingLeft: '20px' }}>
                                               <p style={{ margin: '0 0 5px 0', color: colors.textSecondary, fontSize: '11.5px' }}>Preço Venda</p>
                                               <strong style={{ color: colors.cyan, fontSize: '16px' }}>{formatarMoeda(item.preco_venda)}</strong>
                                            </div>

                                            <div style={{ borderLeft: `2px solid ${colors.borderStrong}`, paddingLeft: '20px' }}>
                                               <p style={{ margin: '0 0 5px 0', color: colors.textSecondary, fontSize: '11.5px' }}>Margem</p>
                                               <strong style={{ color: ana.margem_final > 0 ? colors.successText : colors.danger, fontSize: '16px' }}>{formatarNumero(ana.margem_final * 100)}%</strong>
                                            </div>

                                            <div style={{ borderLeft: `2px solid ${colors.borderStrong}`, paddingLeft: '20px' }}>
                                               <p style={{ margin: '0 0 5px 0', color: colors.textSecondary, fontSize: '11.5px' }}>Lucro Líquido</p>
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
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}><ChevronLeft size={13} /> Anterior</span>
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
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>Próxima <ChevronRight size={13} /></span>
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

        {(view === 'integracoes' || view === 'shopee' || view === 'tiktok') && (
          <Integracoes
            onEstoqueAtualizado={carregarEstoque}
            abaInicial={view === 'tiktok' ? 'tiktok' : 'shopee'}
          />
        )}
        </div>
      </main>

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
