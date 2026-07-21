import { useState, useEffect } from 'react';
import { api } from './services/api';

export function Dashboard() {
  const [skuFinanceiro, setSkuFinanceiro] = useState('');
  const [resultadoFinanceiro, setResultadoFinanceiro] = useState<any>(null);
  
  const [skuAjuste, setSkuAjuste] = useState('');
  const [novoEstoque, setNovoEstoque] = useState('');
  
  const [alertas, setAlertas] = useState<any[]>([]);
  const [mensagem, setMensagem] = useState('');

  useEffect(() => {
    carregarAlertas();
  }, []);

  const carregarAlertas = async () => {
    try {
      const res = await api.get('/produtos/alertas?limite=10');
      setAlertas(res.data);
    } catch (err) {
      console.error("Erro ao carregar alertas:", err);
    }
  };

  const consultarFinanceiro = async () => {
    try {
      const res = await api.get(`/produtos/${skuFinanceiro}/financeiro`);
      setResultadoFinanceiro(res.data);
    } catch (err) {
      alert("Produto não encontrado.");
    }
  };

  const ajustarEstoque = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.patch(`/produtos/${skuAjuste}/estoque`, {
        novo_estoque: Number(novoEstoque)
      });
      setMensagem(`✅ Estoque do SKU ${skuAjuste} atualizado para ${res.data.novo_estoque} un.`);
      setSkuAjuste('');
      setNovoEstoque('');
      carregarAlertas(); 
      setTimeout(() => setMensagem(''), 5000); 
    } catch (err) {
      setMensagem('❌ Erro: SKU não encontrado.');
    }
  };

  // Estilos Dark Mode reutilizáveis
  const cardStyle = { 
  backgroundColor: '#1e293b', 
  padding: '24px', 
  borderRadius: '12px', 
  border: '1px solid #334155', 
  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3)', 
  marginBottom: '24px',
  minHeight: '200px' // Garante altura mínima para não amassar o texto
};
  const inputStyle = { padding: '10px 14px', backgroundColor: '#0f172a', border: '1px solid #475569', color: '#f8fafc', borderRadius: '6px', outline: 'none', flex: 1 };
  const btnStyle = { padding: '10px 20px', backgroundColor: '#3b82f6', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', transition: '0.2s' };
  const h3Style = { marginTop: 0, color: '#e2e8f0' };

  return (
    <div>
      <h2 style={{ color: '#f8fafc', marginTop: 0, marginBottom: '24px', fontSize: '28px' }}>Visão Geral</h2>

      {mensagem && (
        <div style={{ padding: '16px', backgroundColor: '#064e3b', color: '#34d399', borderRadius: '8px', marginBottom: '24px', border: '1px solid #059669', fontWeight: '500' }}>
          {mensagem}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        
        {/* COLUNA ESQUERDA */}
        <div>
          {/* Radar de Estoque */}
          <div style={{ ...cardStyle, borderLeft: '4px solid #ef4444' }}>
            <h3 style={{ color: '#f87171', marginTop: 0, marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                ⚠️ Radar de Estoque Local
            </h3>
            <p style={{ fontSize: '14px', color: '#94a3b8', marginTop: '-10px', marginBottom: '16px' }}>Produtos com 10 ou menos unidades</p>
            
            {alertas.length === 0 ? (
              <p style={{ color: '#34d399', fontWeight: '500' }}>✅ Todos os produtos com estoque saudável.</p>
            ) : (
              <ul style={{ listStyleType: 'none', padding: 0, margin: 0 }}>
                {alertas.map(produto => (
                  <li key={produto.id} style={{ padding: '12px 0', borderBottom: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#cbd5e1' }}><strong style={{ color: '#f8fafc' }}>{produto.sku}</strong> - {produto.nome}</span>
                    <span style={{ color: '#fecaca', fontWeight: 'bold', backgroundColor: '#991b1b', padding: '4px 8px', borderRadius: '4px' }}>{produto.quantidade_estoque} un.</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Ajuste Manual */}
          <div style={cardStyle}>
            <h3 style={h3Style}>⚙️ Ajuste Manual de Estoque</h3>
            <p style={{ fontSize: '14px', color: '#94a3b8' }}>Corrija o inventário após contagem física.</p>
            <form onSubmit={ajustarEstoque} style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
              <input value={skuAjuste} onChange={e => setSkuAjuste(e.target.value)} placeholder="SKU" required style={{...inputStyle, flex: 2}} />
              <input value={novoEstoque} onChange={e => setNovoEstoque(e.target.value)} type="number" placeholder="Qtd Real" required style={{...inputStyle, flex: 1}} />
              <button type="submit" style={{ ...btnStyle, backgroundColor: '#475569' }}>Atualizar</button>
            </form>
          </div>
        </div>

        {/* COLUNA DIREITA */}
        <div>
          {/* Inteligência Financeira */}
          <div style={cardStyle}>
            <h3 style={h3Style}>📊 Simulador de Lucro por SKU</h3>
            <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
              <input onChange={(e) => setSkuFinanceiro(e.target.value)} placeholder="Digite o SKU" style={inputStyle} />
              <button onClick={consultarFinanceiro} style={btnStyle}>Calcular</button>
            </div>

            {resultadoFinanceiro && (
              <div style={{ marginTop: '24px', backgroundColor: '#0f172a', padding: '20px', borderRadius: '8px', border: '1px solid #334155' }}>
                <h4 style={{ margin: '0 0 16px 0', color: '#f8fafc', fontSize: '18px' }}>{resultadoFinanceiro.produto}</h4>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <span style={{ color: '#94a3b8' }}>Lucro Líquido:</span>
                  <strong style={{ color: '#34d399', fontSize: '18px' }}>R$ {resultadoFinanceiro.analise.lucro_liquido.toFixed(2)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <span style={{ color: '#94a3b8' }}>Margem de Lucro:</span>
                  <strong style={{ color: '#f8fafc' }}>{(resultadoFinanceiro.analise.margem_final * 100).toFixed(2)}%</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#94a3b8' }}>ROAS Mínimo:</span>
                  <strong style={{ color: '#f8fafc' }}>{resultadoFinanceiro.analise.roas_minimo.toFixed(2)}</strong>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}