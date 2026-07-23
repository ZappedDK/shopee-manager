import React, { useState, useEffect } from 'react';
import { PlatformIcon } from './PlatformIcon';
import { api } from './services/api';
import { Dashboard } from './Dashboard';
import { Login } from './Login';
import { PageHeader, MessageBanner, CollapsibleCard } from './ui';
import {
  colors, layoutStyle, sidebarStyle, contentStyle, sidebarGroupLabelStyle, menuItemStyle,
  cardStyle, sectionGapStyle, cardTitleStyle, cardDescStyle,
  inputStyle, btnStyle, btnSuccessStyle, btnPurpleStyle, btnDangerStyle, btnNeutralStyle,
  tableHeaderStyle, tableCellStyle,
} from './theme';

type View = 'dashboard' | 'cadastros' | 'estoque' | 'almoxarifado' | 'plataformas';

function App() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));
  const [usuario, setUsuario] = useState<any>(() => {
    const saved = localStorage.getItem('usuario');
    return saved ? JSON.parse(saved) : null;
  });

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
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    setToken(null);
    setUsuario(null);
  };

  const [plataformas, setPlataformas] = useState<any[]>([]);
  const [view, setView] = useState<View>('dashboard');


  const [embalagens, setEmbalagens] = useState<any[]>([]);
  const [configuracoes, setConfiguracoes] = useState<any[]>([]);
  const [mensagem, setMensagem] = useState('');

  const [produtosDetalhados, setProdutosDetalhados] = useState<any[]>([]);
  const [linhaExpandida, setLinhaExpandida] = useState<string | null>(null);
  const [buscaProduto, setBuscaProduto] = useState('');

  // Ajuste manual de estoque (antes ficava na Visão Geral)
  const [skuAjuste, setSkuAjuste] = useState('');
  const [novoEstoque, setNovoEstoque] = useState('');

  // Edição de plataforma
  const [editandoPlataforma, setEditandoPlataforma] = useState<any | null>(null);

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

  useEffect(() => {
    carregarEstoque();
  }, [view]);

  const carregarEstoque = () => {
    if (view === 'estoque') {
      api.get('/produtos/detalhados')
         .then(res => setProdutosDetalhados(res.data))
         .catch(err => console.error("Erro ao carregar estoque:", err));
    }
  };

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

  // --- AJUSTE MANUAL DE ESTOQUE (movido da Visão Geral) ---
  const ajustarEstoque = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.patch(`/produtos/${skuAjuste}/estoque`, {
        novo_estoque: Number(novoEstoque)
      });
      mostrarMensagem(`✅ Estoque do SKU ${skuAjuste} atualizado para ${res.data.novo_estoque} un.`);
      setSkuAjuste('');
      setNovoEstoque('');
      carregarEstoque();
    } catch (err) {
      mostrarMensagem('❌ Erro: SKU não encontrado.', 7000);
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

  const iniciarEdicaoPlataforma = (plat: any) => {
    setEditandoPlataforma({
      id: plat.id,
      nome: plat.nome,
      icone: plat.icone,
      taxa_plataforma: plat.taxa_plataforma,
      taxa_fixa: plat.taxa_fixa,
      taxa_extra: plat.taxa_extra ?? 0,
    });
  };

  const cancelarEdicaoPlataforma = () => setEditandoPlataforma(null);

  const salvarEdicaoPlataforma = async () => {
    if (!editandoPlataforma) return;
    try {
      const payload = {
        nome: editandoPlataforma.nome,
        icone: editandoPlataforma.icone,
        taxa_plataforma: Number(String(editandoPlataforma.taxa_plataforma).replace(',', '.')),
        taxa_fixa: Number(String(editandoPlataforma.taxa_fixa).replace(',', '.')),
        taxa_extra: Number(String(editandoPlataforma.taxa_extra).replace(',', '.')) || 0,
      };
      await api.put(`/plataformas/${editandoPlataforma.id}`, payload);
      mostrarMensagem('✅ Plataforma atualizada com sucesso!');
      setEditandoPlataforma(null);
      carregarInsumos();
      carregarEstoque();
    } catch (err: any) {
      mostrarMensagem('❌ ' + (err.response?.data?.detail || 'Erro ao atualizar plataforma.'), 7000);
    }
  };

  const toggleExpandir = (sku: string) => {
    setLinhaExpandida(linhaExpandida === sku ? null : sku);
  };

  const etiquetaPadrao = configuracoes.find(c => c.chave === 'etiqueta_padrao');

  const produtosFiltrados = produtosDetalhados.filter(item => {
    const termo = buscaProduto.trim().toLowerCase();
    if (!termo) return true;
    return item.nome?.toLowerCase().includes(termo) || item.sku?.toLowerCase().includes(termo);
  });

  // Item de menu com hover sutil (inline styles não têm :hover)
  const MenuItem = ({ icon, label, target }: { icon: string; label: string; target: View }) => {
    const ativo = view === target;
    return (
      <div
        style={menuItemStyle(ativo)}
        onClick={() => { setView(target); setMenuAberto(false); }}
        onMouseEnter={e => { if (!ativo) e.currentTarget.style.backgroundColor = 'rgba(148,163,184,0.08)'; }}
        onMouseLeave={e => { if (!ativo) e.currentTarget.style.backgroundColor = 'transparent'; }}
      >
        <span>{icon}</span><span>{label}</span>
      </div>
    );
  };

  if (!token) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div style={layoutStyle} className="app-layout">
      <div style={sidebarStyle} className="app-sidebar">
        <div style={{ marginBottom: '20px', textAlign: 'center' }} className="app-sidebar-brand">
          <img src="/logo.png" alt="Skold Stock Logo" style={{ width: '140px', marginBottom: '12px' }} />
          <h1
            className="brand-title"
            style={{
              fontSize: '22px',
              color: colors.textPrimary,
              fontWeight: 600,
              margin: 0,
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
          <MenuItem icon="📊" label="Visão Geral" target="dashboard" />
          <MenuItem icon="📦" label="Controle de Estoque" target="estoque" />
          <MenuItem icon="🧺" label="Almoxarifado" target="almoxarifado" />

          <div style={sidebarGroupLabelStyle}>Configurações</div>
          <MenuItem icon="🏪" label="Plataformas de Venda" target="plataformas" />
          <MenuItem icon="⚙️" label="Cadastros e Config." target="cadastros" />
        </div>

        {/* Rodapé com Informações do Usuário Logado & Logout */}
        <div style={{ marginTop: 'auto', paddingTop: '20px', borderTop: `1px solid ${colors.border}` }}>
          <div style={{ fontSize: '13px', color: colors.textPrimary, fontWeight: 600, marginBottom: '2px' }}>
            👤 {usuario?.nome || 'Usuário'}
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

        {view === 'almoxarifado' && (
          <div>
            <PageHeader title="Gestão de Almoxarifado" subtitle="Custos de embalagens e etiquetas usados no cálculo de margem." />
            <MessageBanner mensagem={mensagem} />

            <div style={sectionGapStyle}>
              <div style={{ ...cardStyle, borderLeft: '4px solid #10b981' }}>
                <h3 style={cardTitleStyle}>🏷️ Etiqueta de Envio Padrão</h3>
                {etiquetaPadrao ? (
                  <div style={{ display: 'flex', gap: '40px', marginTop: '18px', flexWrap: 'wrap' }}>
                    <div><p style={{ margin: '0 0 5px 0', color: colors.textSecondary, fontSize: '13px' }}>Custo do Rolo</p><strong style={{ color: colors.textPrimary, fontSize: '18px' }}>R$ {etiquetaPadrao.valor_pacote.toFixed(2)}</strong></div>
                    <div><p style={{ margin: '0 0 5px 0', color: colors.textSecondary, fontSize: '13px' }}>Qtd. no Rolo</p><strong style={{ color: colors.textPrimary, fontSize: '18px' }}>{etiquetaPadrao.qtd_unidades} un.</strong></div>
                    <div style={{ borderLeft: `1px solid ${colors.border}`, paddingLeft: '40px' }}><p style={{ margin: '0 0 5px 0', color: colors.textSecondary, fontSize: '13px' }}>Custo por Etiqueta</p><strong style={{ color: colors.success, fontSize: '20px' }}>R$ {(etiquetaPadrao.valor_pacote / etiquetaPadrao.qtd_unidades).toFixed(4)}</strong></div>
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
                    {embalagens.map(emb => (
                      <tr key={emb.id}>
                        <td style={tableCellStyle}>#{emb.id}</td>
                        <td style={tableCellStyle}>{emb.nome}</td>
                        <td style={tableCellStyle}>R$ {emb.custo_pacote.toFixed(2)}</td>
                        <td style={tableCellStyle}>{emb.qtd_unidades} un.</td>
                        <td style={{ ...tableCellStyle, color: colors.cyan, fontWeight: 'bold' }}>R$ {(emb.custo_pacote / emb.qtd_unidades).toFixed(2)}</td>
                        <td style={tableCellStyle}>
                          <button
                            onClick={() => excluirEmbalagem(emb.id, emb.nome)}
                            style={btnDangerStyle}
                            onMouseEnter={e => e.currentTarget.style.backgroundColor = colors.dangerHover}
                            onMouseLeave={e => e.currentTarget.style.backgroundColor = colors.danger}
                          >
                            Excluir
                          </button>
                        </td>
                      </tr>
                    ))}
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

                  const payload = {
                    nome: data.nome,
                    icone: data.icone,
                    taxa_plataforma: parseFloat(data.taxa_plataforma.replace(',', '.')),
                    taxa_fixa: parseFloat(data.taxa_fixa.replace(',', '.')),
                    taxa_extra: parseFloat(data.taxa_extra.replace(',', '.')) || 0.0
                  };

                  api.post('/plataformas/', payload)
                    .then(() => {
                      mostrarMensagem('✅ Plataforma cadastrada com sucesso!');
                      carregarInsumos();
                      formElement.reset();
                    })
                    .catch(err => mostrarMensagem('❌ Erro: ' + (err.response?.data?.detail || 'Erro ao cadastrar'), 7000));
              }}>
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '16px' }}>
                  <input name="nome" placeholder="Nome (Ex: Mercado Livre)" required style={{ ...inputStyle, flex: 2, marginBottom: 0, maxWidth: '100%', minWidth: '160px' }} />
                  <input name="icone" placeholder="Emoji (Ex: 🟨)" required style={{ ...inputStyle, flex: 1, marginBottom: 0, maxWidth: '100%', minWidth: '100px' }} />
                </div>

                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '20px' }}>
                  <input name="taxa_plataforma" type="number" step="0.001" placeholder="Taxa Padrão (Ex: 0.14 = 14%)" required style={{ ...inputStyle, flex: 1, marginBottom: 0, maxWidth: '100%', minWidth: '160px' }} />
                  <input name="taxa_fixa" type="number" step="0.01" placeholder="Taxa Fixa (R$)" required style={{ ...inputStyle, flex: 1, marginBottom: 0, maxWidth: '100%', minWidth: '160px' }} />
                  <input name="taxa_extra" type="number" step="0.001" placeholder="Taxa Extra (Ex: 0.06 = 6%)" defaultValue="0" style={{ ...inputStyle, flex: 1, marginBottom: 0, maxWidth: '100%', minWidth: '160px' }} />
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

            <div style={cardStyle}>
              <h3 style={cardTitleStyle}>Plataformas Ativas no Sistema</h3>
              <p style={cardDescStyle}>Taxas usadas automaticamente no cálculo de margem por produto.</p>

              <div className="table-scroll">
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={tableHeaderStyle}>Plataforma</th>
                      <th style={tableHeaderStyle}>Taxa Padrão</th>
                      <th style={tableHeaderStyle}>Taxa Fixa</th>
                      <th style={tableHeaderStyle}>Taxa Extra</th>
                      <th style={tableHeaderStyle}>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {plataformas.map(plat => {
                      const editando = editandoPlataforma && editandoPlataforma.id === plat.id;

                      if (editando) {
                        return (
                          <tr key={plat.id} style={{ backgroundColor: colors.bgCardAlt }}>
                            <td style={tableCellStyle}>
                              <div style={{ display: 'flex', gap: '8px' }}>
                                <input
                                  value={editandoPlataforma.icone}
                                  onChange={e => setEditandoPlataforma({ ...editandoPlataforma, icone: e.target.value })}
                                  style={{ ...inputStyle, width: '54px', marginBottom: 0, padding: '8px 10px', maxWidth: 'none' }}
                                />
                                <input
                                  value={editandoPlataforma.nome}
                                  onChange={e => setEditandoPlataforma({ ...editandoPlataforma, nome: e.target.value })}
                                  style={{ ...inputStyle, marginBottom: 0, padding: '8px 10px', maxWidth: 'none' }}
                                />
                              </div>
                            </td>
                            <td style={tableCellStyle}>
                              <input
                                type="number" step="0.001"
                                value={editandoPlataforma.taxa_plataforma}
                                onChange={e => setEditandoPlataforma({ ...editandoPlataforma, taxa_plataforma: e.target.value })}
                                style={{ ...inputStyle, width: '90px', marginBottom: 0, padding: '8px 10px', maxWidth: 'none' }}
                              />
                            </td>
                            <td style={tableCellStyle}>
                              <input
                                type="number" step="0.01"
                                value={editandoPlataforma.taxa_fixa}
                                onChange={e => setEditandoPlataforma({ ...editandoPlataforma, taxa_fixa: e.target.value })}
                                style={{ ...inputStyle, width: '90px', marginBottom: 0, padding: '8px 10px', maxWidth: 'none' }}
                              />
                            </td>
                            <td style={tableCellStyle}>
                              <input
                                type="number" step="0.001"
                                value={editandoPlataforma.taxa_extra}
                                onChange={e => setEditandoPlataforma({ ...editandoPlataforma, taxa_extra: e.target.value })}
                                style={{ ...inputStyle, width: '90px', marginBottom: 0, padding: '8px 10px', maxWidth: 'none' }}
                              />
                            </td>
                            <td style={{ ...tableCellStyle, display: 'flex', gap: '8px' }}>
                              <button
                                onClick={salvarEdicaoPlataforma}
                                style={btnSuccessStyle}
                                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#0d9668'}
                                onMouseLeave={e => e.currentTarget.style.backgroundColor = colors.success}
                              >
                                Salvar
                              </button>
                              <button
                                onClick={cancelarEdicaoPlataforma}
                                style={btnNeutralStyle}
                                onMouseEnter={e => e.currentTarget.style.backgroundColor = colors.slateHover}
                                onMouseLeave={e => e.currentTarget.style.backgroundColor = colors.slate}
                              >
                                Cancelar
                              </button>
                            </td>
                          </tr>
                        );
                      }

                      return (
                        <tr key={plat.id}>
                          <td style={tableCellStyle}>
                            <PlatformIcon nome={plat.nome} icone={plat.icone} size={22} /> <strong>{plat.nome}</strong>
                          </td>
                          <td style={tableCellStyle}>{(plat.taxa_plataforma * 100).toFixed(1)}%</td>
                          <td style={tableCellStyle}>R$ {plat.taxa_fixa.toFixed(2)}</td>
                          <td style={tableCellStyle}>{((plat.taxa_extra || 0) * 100).toFixed(1)}%</td>
                          <td style={tableCellStyle}>
                            <button
                              onClick={() => iniciarEdicaoPlataforma(plat)}
                              style={btnNeutralStyle}
                              onMouseEnter={e => e.currentTarget.style.backgroundColor = colors.slateHover}
                              onMouseLeave={e => e.currentTarget.style.backgroundColor = colors.slate}
                            >
                              Editar
                            </button>
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
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = colors.accentHover}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = colors.accent}
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
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#0d9668'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = colors.success}
                  >
                    Atualizar Custo
                  </button>
                </form>
              </CollapsibleCard>
            </div>

            <div style={{ ...cardStyle, marginBottom: '24px' }}>
              <h3 style={cardTitleStyle}>Novo Produto</h3>
              <p style={cardDescStyle}>Cadastre o SKU, preço, custo e vincule às plataformas onde ele é vendido.</p>
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
                    embalagem_id: Number(data.embalagem_id),
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
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                  <input name="sku" placeholder="SKU Idêntico à Shopee" required style={{ ...inputStyle, flex: 1, maxWidth: 'none', minWidth: '160px' }} />
                  <input name="nome" placeholder="Nome do Produto" required style={{ ...inputStyle, flex: 2, maxWidth: 'none', minWidth: '200px' }} />
                </div>

                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                  <input name="preco_venda" type="number" step="0.01" placeholder="Preço de Venda (R$)" required style={{ ...inputStyle, flex: 1, maxWidth: 'none', minWidth: '160px' }} />
                  <input name="custo_produto" type="number" step="0.01" placeholder="Custo da Mercadoria (R$)" required style={{ ...inputStyle, flex: 1, maxWidth: 'none', minWidth: '160px' }} />
                  <input name="quantidade_estoque" type="number" placeholder="Estoque Inicial" required style={{ ...inputStyle, flex: 1, maxWidth: 'none', minWidth: '160px' }} />
                </div>

                <div style={{ marginBottom: '18px' }}>
                  <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '10px', fontSize: '13.5px' }}>Selecione as Plataformas:</label>
                  <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                    {plataformas.map(plat => (
                      <label key={plat.id} style={{ color: colors.textPrimary, display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px' }}>
                        <input type="checkbox" name="plataformas" value={plat.id} />
                        <PlatformIcon nome={plat.nome} icone={plat.icone} size={18} /> {plat.nome}
                      </label>
                    ))}
                    {plataformas.length === 0 && (
                      <span style={{ color: colors.textMuted, fontSize: '13.5px' }}>Cadastre uma plataforma primeiro na aba "Plataformas de Venda".</span>
                    )}
                  </div>
                </div>

                <select name="embalagem_id" required style={{ ...inputStyle, maxWidth: '100%', color: colors.textSecondary }}>
                  <option value="">-- Vincule uma Embalagem --</option>
                  {embalagens.map(emb => <option key={emb.id} value={emb.id}>{emb.nome}</option>)}
                </select>

                <button
                  type="submit"
                  style={btnStyle}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = colors.accentHover}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = colors.accent}
                >
                  Cadastrar Produto Definitivo
                </button>
              </form>
            </div>
          </div>
        )}

        {view === 'estoque' && (
          <div>
            <PageHeader title="Controle de Estoque" subtitle="Consulte quantidades, custos e margem por plataforma." />
            <MessageBanner mensagem={mensagem} />

            <CollapsibleCard
              icon="⚙️"
              title="Ajuste Manual de Estoque"
              description="Corrija o inventário de um SKU após uma contagem física."
              buttonLabel="+ Ajuste de Estoque"
              style={sectionGapStyle}
            >
              <form onSubmit={ajustarEstoque} style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <input value={skuAjuste} onChange={e => setSkuAjuste(e.target.value)} placeholder="SKU" required style={{ ...inputStyle, flex: 2, minWidth: '160px', marginBottom: 0 }} />
                <input value={novoEstoque} onChange={e => setNovoEstoque(e.target.value)} type="number" placeholder="Qtd Real" required style={{ ...inputStyle, flex: 1, minWidth: '120px', marginBottom: 0 }} />
                <button
                  type="submit"
                  style={btnNeutralStyle}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = colors.slateHover}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = colors.slate}
                >
                  Atualizar
                </button>
              </form>
            </CollapsibleCard>

            <div style={cardStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', gap: '16px', flexWrap: 'wrap' }}>
                <h3 style={{ ...cardTitleStyle, marginBottom: 0 }}>Produtos Cadastrados</h3>
                <input
                  value={buscaProduto}
                  onChange={e => setBuscaProduto(e.target.value)}
                  placeholder="🔎 Buscar por nome ou SKU..."
                  style={{ ...inputStyle, marginBottom: 0, maxWidth: '280px' }}
                />
              </div>

              <div className="table-scroll">
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={tableHeaderStyle}>SKU</th>
                      <th style={tableHeaderStyle}>Produto</th>
                      <th style={tableHeaderStyle}>Custo Unit.</th>
                      <th style={tableHeaderStyle}>Estoque</th>
                      <th style={tableHeaderStyle}>Valor do Estoque</th>
                      <th style={tableHeaderStyle}>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {produtosFiltrados.map(item => {
                      return (
                        <React.Fragment key={item.sku}>
                          <tr style={{ backgroundColor: linhaExpandida === item.sku ? colors.bgCardAlt : 'transparent', transition: '0.2s' }}>
                            <td style={tableCellStyle}><strong>{item.sku}</strong></td>
                            <td style={tableCellStyle}>{item.nome}</td>
                            <td style={tableCellStyle}>R$ {item.custo_produto.toFixed(2)}</td>
                            <td style={{ ...tableCellStyle, color: item.quantidade_estoque <= 10 ? '#f87171' : colors.textPrimary, fontWeight: 'bold' }}>{item.quantidade_estoque} un.</td>
                            <td style={tableCellStyle}>R$ {item.valor_estoque ? item.valor_estoque.toFixed(2) : '0.00'}</td>
                            <td style={{ ...tableCellStyle, display: 'flex', gap: '8px' }}>
                              <button
                                onClick={() => toggleExpandir(item.sku)}
                                style={btnNeutralStyle}
                                onMouseEnter={e => e.currentTarget.style.backgroundColor = colors.slateHover}
                                onMouseLeave={e => e.currentTarget.style.backgroundColor = colors.slate}
                              >
                                {linhaExpandida === item.sku ? 'Ocultar' : '+ Info'}
                              </button>
                              <button
                                onClick={() => excluirProduto(item.sku)}
                                style={btnDangerStyle}
                                onMouseEnter={e => e.currentTarget.style.backgroundColor = colors.dangerHover}
                                onMouseLeave={e => e.currentTarget.style.backgroundColor = colors.danger}
                              >
                                Excluir
                              </button>
                            </td>
                          </tr>

                          {linhaExpandida === item.sku && (
                            <tr>
                              <td colSpan={6} style={{ padding: '0', borderBottom: `1px solid ${colors.border}` }}>
                                <div style={{ padding: '22px', backgroundColor: colors.bgCardAlt }}>
                                  {!item.analises_plataformas || item.analises_plataformas.length === 0 ? (
                                     <p style={{ color: '#f87171' }}>Nenhuma plataforma vinculada a este produto.</p>
                                  ) : (
                                      item.analises_plataformas.map((ana: any, index: number) => (
                                        <div key={index} style={{ marginBottom: '16px', borderBottom: `1px solid ${colors.border}`, paddingBottom: '16px' }}>
                                          <h4 style={{ color: colors.accent, margin: '0 0 16px 0', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <PlatformIcon nome={ana.plataforma_nome} icone={ana.icone} size={20} /> {ana.plataforma_nome}
                                          </h4>

                                          <div style={{ display: 'flex', gap: '28px', flexWrap: 'wrap', alignItems: 'center' }}>
                                            <div><p style={{ margin: '0 0 5px 0', color: colors.textSecondary, fontSize: '12.5px' }}>ROAS Mín.</p><strong style={{ color: colors.textPrimary }}>{ana.roas_minimo ? ana.roas_minimo.toFixed(2) : '0.00'}</strong></div>
                                            <div><p style={{ margin: '0 0 5px 0', color: colors.textSecondary, fontSize: '12.5px' }}>Taxa Plat.</p><strong style={{ color: colors.danger }}>R$ {ana.taxa_plataforma_real ? ana.taxa_plataforma_real.toFixed(2) : '0.00'}</strong></div>
                                            <div><p style={{ margin: '0 0 5px 0', color: colors.textSecondary, fontSize: '12.5px' }}>Taxa Fixa</p><strong style={{ color: colors.danger }}>R$ {ana.taxa_fixa ? ana.taxa_fixa.toFixed(2) : '0.00'}</strong></div>
                                            <div><p style={{ margin: '0 0 5px 0', color: colors.textSecondary, fontSize: '12.5px' }}>Custo Emb.</p><strong style={{ color: colors.danger }}>R$ {ana.custo_embalagem ? ana.custo_embalagem.toFixed(2) : '0.00'}</strong></div>
                                            <div><p style={{ margin: '0 0 5px 0', color: colors.textSecondary, fontSize: '12.5px' }}>Custo Etiq.</p><strong style={{ color: colors.danger }}>R$ {ana.custo_etiqueta ? ana.custo_etiqueta.toFixed(2) : '0.00'}</strong></div>

                                            <div style={{ borderLeft: `2px solid ${colors.borderStrong}`, paddingLeft: '20px' }}>
                                               <p style={{ margin: '0 0 5px 0', color: colors.textSecondary, fontSize: '11.5px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Custo Total</p>
                                               <strong style={{ color: colors.amber, fontSize: '16px' }}>R$ {ana.custo_total ? ana.custo_total.toFixed(2) : '0.00'}</strong>
                                            </div>

                                            <div style={{ borderLeft: `2px solid ${colors.borderStrong}`, paddingLeft: '20px' }}>
                                               <p style={{ margin: '0 0 5px 0', color: colors.textSecondary, fontSize: '11.5px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Preço Venda</p>
                                               <strong style={{ color: colors.cyan, fontSize: '16px' }}>R$ {item.preco_venda ? item.preco_venda.toFixed(2) : '0.00'}</strong>
                                            </div>

                                            <div style={{ borderLeft: `2px solid ${colors.borderStrong}`, paddingLeft: '20px' }}>
                                               <p style={{ margin: '0 0 5px 0', color: colors.textSecondary, fontSize: '11.5px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Margem</p>
                                               <strong style={{ color: ana.margem_final > 0 ? colors.successText : colors.danger, fontSize: '16px' }}>{(ana.margem_final * 100).toFixed(2)}%</strong>
                                            </div>

                                            <div style={{ borderLeft: `2px solid ${colors.borderStrong}`, paddingLeft: '20px' }}>
                                               <p style={{ margin: '0 0 5px 0', color: colors.textSecondary, fontSize: '11.5px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Lucro Líquido</p>
                                               <strong style={{ color: ana.lucro_liquido > 0 ? colors.success : colors.danger, fontSize: '18px' }}>R$ {ana.lucro_liquido ? ana.lucro_liquido.toFixed(2) : '0.00'}</strong>
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
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
