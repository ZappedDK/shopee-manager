import React, { useState, useEffect } from 'react';
import { api } from './services/api';
import { Dashboard } from './Dashboard';

function App() {
  const [view, setView] = useState<'dashboard' | 'cadastros' | 'estoque' | 'almoxarifado'>('dashboard');
  
  const [embalagens, setEmbalagens] = useState<any[]>([]);
  const [configuracoes, setConfiguracoes] = useState<any[]>([]);
  const [mensagem, setMensagem] = useState('');
  
  const [produtosDetalhados, setProdutosDetalhados] = useState<any[]>([]);
  const [linhaExpandida, setLinhaExpandida] = useState<string | null>(null);

  useEffect(() => {
    carregarInsumos();
  }, []);

  const carregarInsumos = () => {
    api.get('/embalagens/').then(res => setEmbalagens(res.data)).catch(() => {});
    api.get('/configuracoes/').then(res => setConfiguracoes(res.data)).catch(() => {});
  };

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

  const gerenciarFormulario = async (e: React.FormEvent<HTMLFormElement>, rota: string, sucessoMsg: string) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());
    
    Object.keys(data).forEach(key => {
      if (['custo_pacote', 'qtd_unidades', 'valor_pacote', 'preco_venda', 'custo_produto', 'quantidade_estoque', 'embalagem_id'].includes(key)) {
        data[key] = Number(data[key]);
      }
    });

    try {
      await api.post(rota, data);
      setMensagem(`✅ ${sucessoMsg}`);
      e.currentTarget.reset();
      
      if (rota === '/embalagens/' || rota === '/configuracoes/') carregarInsumos();
      setTimeout(() => setMensagem(''), 5000);
    } catch (err) {
      setMensagem('❌ Erro na operação. Verifique os dados.');
    }
  };

  // --- NOVAS FUNÇÕES DE EXCLUSÃO ---
  const excluirProduto = async (sku: string) => {
    if (!window.confirm(`⚠️ Tem certeza que deseja excluir o produto SKU: ${sku}?`)) return;
    try {
      await api.delete(`/produtos/${sku}`);
      setMensagem(`✅ Produto ${sku} excluído com sucesso!`);
      carregarEstoque(); // Atualiza a tabela
      setTimeout(() => setMensagem(''), 5000);
    } catch (err) {
      setMensagem('❌ Erro ao excluir produto.');
    }
  };

  const excluirEmbalagem = async (id: number, nome: string) => {
    if (!window.confirm(`⚠️ Tem certeza que deseja excluir a embalagem "${nome}"?`)) return;
    try {
      await api.delete(`/embalagens/${id}`);
      setMensagem(`✅ Embalagem excluída com sucesso!`);
      carregarInsumos(); // Atualiza a tabela
      setTimeout(() => setMensagem(''), 5000);
    } catch (err: any) {
      // Pega a mensagem de erro da trava de segurança do Back-end
      const erroBackend = err.response?.data?.detail || 'Erro ao excluir.';
      setMensagem(`❌ ${erroBackend}`);
      setTimeout(() => setMensagem(''), 7000);
    }
  };

  const toggleExpandir = (sku: string) => {
    setLinhaExpandida(linhaExpandida === sku ? null : sku);
  };

  const etiquetaPadrao = configuracoes.find(c => c.chave === 'etiqueta_padrao');

  // Estilos
  const layoutStyle = { display: 'flex', minHeight: '100vh', width: '100vw', backgroundColor: '#0f172a' };
  const sidebarStyle = { width: '260px', backgroundColor: '#1e293b', color: '#f8fafc', padding: '30px 20px', display: 'flex', flexDirection: 'column' as const, borderRight: '1px solid #334155' };
  const contentStyle = { flex: 1, padding: '40px', overflowY: 'auto' as const };
  
  const menuItemStyle = (ativo: boolean) => ({
    padding: '12px 16px', borderRadius: '8px', cursor: 'pointer', marginBottom: '8px',
    backgroundColor: ativo ? '#3b82f6' : 'transparent', color: ativo ? '#ffffff' : '#cbd5e1',
    fontWeight: ativo ? 'bold' : 'normal', transition: '0.2s'
  });
  
  const cardStyle = { backgroundColor: '#1e293b', padding: '24px', borderRadius: '12px', border: '1px solid #334155', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3)', marginBottom: '24px' };
  const inputStyle = { display: 'block', marginBottom: '16px', padding: '10px 14px', backgroundColor: '#0f172a', border: '1px solid #475569', color: '#f8fafc', borderRadius: '6px', width: '100%', maxWidth: '400px', outline: 'none' };
  const btnStyle = { padding: '10px 20px', backgroundColor: '#3b82f6', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', transition: '0.2s' };
  const btnDangerStyle = { ...btnStyle, backgroundColor: '#ef4444' };
  
  const tableHeaderStyle = { padding: '12px', textAlign: 'left' as const, borderBottom: '2px solid #334155', color: '#94a3b8' };
  const tableCellStyle = { padding: '12px', borderBottom: '1px solid #334155', color: '#f8fafc' };

  return (
    <div style={layoutStyle}>
      <div style={sidebarStyle}>
        <div style={{ marginBottom: '40px', textAlign: 'center' }}>
          <img src="/logo.png" alt="Logo" style={{ width: '150px', marginBottom: '10px' }} />
          <h1 style={{ fontSize: '18px', color: '#f8fafc' }}>Estoque Compra Certa</h1>
        </div>
        <div style={menuItemStyle(view === 'dashboard')} onClick={() => setView('dashboard')}>📊 Visão Geral</div>
        <div style={menuItemStyle(view === 'estoque')} onClick={() => setView('estoque')}>📦 Controle de Estoque</div>
        <div style={menuItemStyle(view === 'almoxarifado')} onClick={() => setView('almoxarifado')}>🧺 Almoxarifado</div>
        <div style={menuItemStyle(view === 'cadastros')} onClick={() => setView('cadastros')}>⚙️ Cadastros e Config.</div>
      </div>

      <div style={contentStyle}>
        {view === 'dashboard' && <Dashboard />}
        
        {view === 'almoxarifado' && (
          <div>
            <h2 style={{ color: '#f8fafc', marginTop: 0, marginBottom: '24px', fontSize: '28px' }}>Gestão de Almoxarifado</h2>
            {mensagem && <div style={{ padding: '16px', backgroundColor: mensagem.includes('❌') ? '#7f1d1d' : '#064e3b', color: mensagem.includes('❌') ? '#fca5a5' : '#34d399', borderRadius: '8px', marginBottom: '24px', border: `1px solid ${mensagem.includes('❌') ? '#b91c1c' : '#059669'}` }}>{mensagem}</div>}
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', marginBottom: '24px' }}>
              <div style={{ ...cardStyle, borderLeft: '4px solid #10b981', marginBottom: 0 }}>
                <h3 style={{ marginTop: 0, color: '#e2e8f0', marginBottom: '16px' }}>🏷️ Etiqueta de Envio Padrão</h3>
                {etiquetaPadrao ? (
                  <div style={{ display: 'flex', gap: '40px' }}>
                    <div><p style={{ margin: '0 0 5px 0', color: '#94a3b8', fontSize: '14px' }}>Custo do Rolo</p><strong style={{ color: '#f8fafc', fontSize: '18px' }}>R$ {etiquetaPadrao.valor_pacote.toFixed(2)}</strong></div>
                    <div><p style={{ margin: '0 0 5px 0', color: '#94a3b8', fontSize: '14px' }}>Qtd. no Rolo</p><strong style={{ color: '#f8fafc', fontSize: '18px' }}>{etiquetaPadrao.qtd_unidades} un.</strong></div>
                    <div style={{ borderLeft: '1px solid #334155', paddingLeft: '40px' }}><p style={{ margin: '0 0 5px 0', color: '#94a3b8', fontSize: '14px' }}>Custo por Etiqueta</p><strong style={{ color: '#10b981', fontSize: '20px' }}>R$ {(etiquetaPadrao.valor_pacote / etiquetaPadrao.qtd_unidades).toFixed(4)}</strong></div>
                  </div>
                ) : (
                  <p style={{ color: '#f87171' }}>Nenhuma etiqueta configurada.</p>
                )}
              </div>
            </div>

            <div style={cardStyle}>
              <h3 style={{ marginTop: 0, color: '#e2e8f0', marginBottom: '16px' }}>📦 Embalagens e Caixas</h3>
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
                      <td style={{ ...tableCellStyle, color: '#38bdf8', fontWeight: 'bold' }}>R$ {(emb.custo_pacote / emb.qtd_unidades).toFixed(2)}</td>
                      <td style={tableCellStyle}>
                        <button onClick={() => excluirEmbalagem(emb.id, emb.nome)} style={{ padding: '6px 12px', backgroundColor: '#ef4444', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Excluir</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {view === 'cadastros' && (
          <div>
            <h2 style={{ color: '#f8fafc', marginTop: 0, marginBottom: '24px', fontSize: '28px' }}>Cadastros do Sistema</h2>
            {mensagem && <div style={{ padding: '16px', backgroundColor: '#064e3b', color: '#34d399', borderRadius: '8px', marginBottom: '24px', border: '1px solid #059669' }}>{mensagem}</div>}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
              <div style={cardStyle}>
                <h3 style={{ marginTop: 0, color: '#e2e8f0', marginBottom: '16px' }}>1. Nova Embalagem</h3>
                <form onSubmit={(e) => gerenciarFormulario(e, '/embalagens/', 'Embalagem salva!')}>
                  <input name="nome" placeholder="Nome (Ex: Caixa P)" required style={inputStyle} />
                  <input name="custo_pacote" type="number" step="0.01" placeholder="Custo do Pacote (R$)" required style={inputStyle} />
                  <input name="qtd_unidades" type="number" placeholder="Unidades no pacote" required style={inputStyle} />
                  <button type="submit" style={btnStyle}>Salvar Embalagem</button>
                </form>
              </div>

              <div style={cardStyle}>
                <h3 style={{ marginTop: 0, color: '#e2e8f0', marginBottom: '16px' }}>2. Custo da Etiqueta</h3>
                <form onSubmit={(e) => gerenciarFormulario(e, '/configuracoes/', 'Etiqueta atualizada!')}>
                  <input type="hidden" name="chave" value="etiqueta_padrao" />
                  <input name="valor_pacote" type="number" step="0.01" placeholder="Custo do Rolo (R$)" required style={inputStyle} />
                  <input name="qtd_unidades" type="number" placeholder="Quantas etiquetas?" required style={inputStyle} />
                  <button type="submit" style={{...btnStyle, backgroundColor: '#10b981'}}>Atualizar Custo</button>
                </form>
              </div>
            </div>

            <div style={cardStyle}>
              <h3 style={{ marginTop: 0, color: '#e2e8f0', marginBottom: '16px' }}>3. Novo Produto</h3>
              <form onSubmit={(e) => gerenciarFormulario(e, '/produtos/', 'Produto cadastrado!')}>
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                  <input name="sku" placeholder="SKU Idêntico à Shopee" required style={{...inputStyle, flex: 1, maxWidth: 'none'}} />
                  <input name="nome" placeholder="Nome do Produto" required style={{...inputStyle, flex: 2, maxWidth: 'none'}} />
                </div>
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                  <input name="preco_venda" type="number" step="0.01" placeholder="Preço de Venda (R$)" required style={{...inputStyle, flex: 1, maxWidth: 'none'}} />
                  <input name="custo_produto" type="number" step="0.01" placeholder="Custo da Mercadoria (R$)" required style={{...inputStyle, flex: 1, maxWidth: 'none'}} />
                  <input name="quantidade_estoque" type="number" placeholder="Estoque Inicial" required style={{...inputStyle, flex: 1, maxWidth: 'none'}} />
                </div>
                <select name="embalagem_id" required style={{...inputStyle, maxWidth: '100%', color: '#94a3b8'}}>
                  <option value="">-- Vincule uma Embalagem --</option>
                  {embalagens.map(emb => <option key={emb.id} value={emb.id}>{emb.nome}</option>)}
                </select>
                <button type="submit" style={btnStyle}>Cadastrar Produto Definitivo</button>
              </form>
            </div>
          </div>
        )}

        {view === 'estoque' && (
          <div>
            <h2 style={{ color: '#f8fafc', marginTop: 0, marginBottom: '24px', fontSize: '28px' }}>Controle de Estoque</h2>
            {mensagem && <div style={{ padding: '16px', backgroundColor: '#064e3b', color: '#34d399', borderRadius: '8px', marginBottom: '24px', border: '1px solid #059669' }}>{mensagem}</div>}
            
            <div style={cardStyle}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={tableHeaderStyle}>SKU</th>
                    <th style={tableHeaderStyle}>Produto</th>
                    <th style={tableHeaderStyle}>Estoque</th>
                    <th style={tableHeaderStyle}>Custo</th>
                    <th style={tableHeaderStyle}>Venda</th>
                    <th style={tableHeaderStyle}>Margem</th>
                    <th style={tableHeaderStyle}>Lucro</th>
                    <th style={tableHeaderStyle}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {produtosDetalhados.map(item => {
                    const margemPercentual = isNaN(item.metricas.margem_final) ? '0.00' : (item.metricas.margem_final * 100).toFixed(2);
                    
                    return (
                      <React.Fragment key={item.sku}>
                        <tr style={{ backgroundColor: linhaExpandida === item.sku ? '#334155' : 'transparent', transition: '0.2s' }}>
                          <td style={tableCellStyle}><strong>{item.sku}</strong></td>
                          <td style={tableCellStyle}>{item.nome}</td>
                          <td style={{ ...tableCellStyle, color: item.quantidade_estoque <= 10 ? '#f87171' : '#f8fafc', fontWeight: 'bold' }}>{item.quantidade_estoque} un.</td>
                          <td style={tableCellStyle}>R$ {item.custo_produto.toFixed(2)}</td>
                          <td style={tableCellStyle}>R$ {item.preco_venda.toFixed(2)}</td>
                          <td style={{ ...tableCellStyle, color: Number(margemPercentual) > 0 ? '#34d399' : '#f87171' }}>{margemPercentual}%</td>
                          <td style={{ ...tableCellStyle, color: item.metricas.lucro_liquido > 0 ? '#34d399' : '#f87171', fontWeight: 'bold' }}>R$ {item.metricas.lucro_liquido.toFixed(2)}</td>
                          <td style={{ ...tableCellStyle, display: 'flex', gap: '8px' }}>
                            <button onClick={() => toggleExpandir(item.sku)} style={{ padding: '6px 12px', backgroundColor: '#475569', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>{linhaExpandida === item.sku ? 'Ocultar' : '+ Info'}</button>
                            <button onClick={() => excluirProduto(item.sku)} style={{ padding: '6px 12px', backgroundColor: '#ef4444', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Excluir</button>
                          </td>
                        </tr>

                        {linhaExpandida === item.sku && (
                          <tr>
                            <td colSpan={8} style={{ padding: '0', borderBottom: '1px solid #334155' }}>
                              <div style={{ padding: '20px', backgroundColor: '#0f172a', display: 'flex', gap: '30px', flexWrap: 'wrap' }}>
                                <div><p style={{ margin: '0 0 5px 0', color: '#94a3b8', fontSize: '13px' }}>Valor do Estoque</p><strong style={{ color: '#f8fafc' }}>R$ {item.valor_estoque.toFixed(2)}</strong></div>
                                <div><p style={{ margin: '0 0 5px 0', color: '#94a3b8', fontSize: '13px' }}>ROAS Mínimo</p><strong style={{ color: '#f8fafc' }}>{isNaN(item.metricas.roas_minimo) ? '0.00' : item.metricas.roas_minimo.toFixed(2)}</strong></div>
                                <div><p style={{ margin: '0 0 5px 0', color: '#94a3b8', fontSize: '13px' }}>Taxa Plataforma</p><strong style={{ color: '#ef4444' }}>R$ {item.metricas.taxa_plataforma?.toFixed(2) || '0.00'}</strong></div>
                                <div><p style={{ margin: '0 0 5px 0', color: '#94a3b8', fontSize: '13px' }}>Taxa Fixa</p><strong style={{ color: '#ef4444' }}>R$ {item.metricas.taxa_fixa?.toFixed(2) || '3.00'}</strong></div>
                                <div><p style={{ margin: '0 0 5px 0', color: '#94a3b8', fontSize: '13px' }}>Custo Embalagem</p><strong style={{ color: '#ef4444' }}>R$ {item.metricas.custo_embalagem?.toFixed(2) || '0.00'}</strong></div>
                                <div><p style={{ margin: '0 0 5px 0', color: '#94a3b8', fontSize: '13px' }}>Custo Etiqueta</p><strong style={{ color: '#ef4444' }}>R$ {item.metricas.custo_etiqueta?.toFixed(2) || '0.00'}</strong></div>
                                <div style={{ borderLeft: '2px solid #334155', paddingLeft: '20px' }}><p style={{ margin: '0 0 5px 0', color: '#94a3b8', fontSize: '13px' }}>Custo Total da Venda</p><strong style={{ color: '#f59e0b' }}>R$ {item.metricas.custo_total?.toFixed(2) || '0.00'}</strong></div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
              {produtosDetalhados.length === 0 && <p style={{ textAlign: 'center', color: '#94a3b8', marginTop: '20px' }}>Nenhum produto cadastrado ainda.</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;