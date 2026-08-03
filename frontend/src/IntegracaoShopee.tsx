import React, { useState, useEffect } from 'react';
import { api } from './services/api';
import { PageHeader, MessageBanner } from './ui';
import {
  colors, cardStyle, cardTitleStyle, cardDescStyle,
  inputStyle, btnStyle, btnNeutralStyle
} from './theme';

interface IntegracaoShopeeProps {
  onEstoqueAtualizado?: () => void;
}

export function IntegracaoShopee({ onEstoqueAtualizado }: IntegracaoShopeeProps) {
  const [partnerId, setPartnerId] = useState<string>('');
  const [partnerKey, setPartnerKey] = useState<string>('');
  const [shopId, setShopId] = useState<string>('');
  const [ambiente, setAmbiente] = useState<string>('PRODUCAO');

  const [mostrarKey, setMostrarKey] = useState<boolean>(false);
  const [salvando, setSalvando] = useState<boolean>(false);
  const [mensagem, setMensagem] = useState<string>('');

  // Simulador de Venda
  const [produtos, setProdutos] = useState<any[]>([]);
  const [skuSimulado, setSkuSimulado] = useState<string>('');
  const [buscaSku, setBuscaSku] = useState<string>('');
  const [qtdSimulada, setQtdSimulada] = useState<number>(1);
  const [simulando, setSimulando] = useState<boolean>(false);
  const [copiado, setCopiado] = useState<boolean>(false);

  const produtosFiltrados = produtos.filter((p) => {
    if (!buscaSku.trim()) return true;
    const termo = buscaSku.toLowerCase();
    return (
      (p.sku && p.sku.toLowerCase().includes(termo)) ||
      (p.nome && p.nome.toLowerCase().includes(termo))
    );
  });

  const webhookUrl = `${window.location.protocol}//${window.location.host}/api/webhooks/shopee`;

  useEffect(() => {
    carregarConfiguracao();
    carregarProdutos();
  }, []);

  const carregarConfiguracao = async () => {
    try {
      const res = await api.get('/shopee/config');
      if (res.data) {
        setPartnerId(res.data.partner_id ? String(res.data.partner_id) : '');
        setPartnerKey(res.data.partner_key || '');
        setShopId(res.data.shop_id ? String(res.data.shop_id) : '');
        setAmbiente(res.data.ambiente || 'PRODUCAO');
      }
    } catch (err) {
      console.error('Erro ao carregar configurações da Shopee:', err);
    }
  };

  const carregarProdutos = async () => {
    try {
      const res = await api.get('/produtos/detalhados?limit=100');
      const lista = res.data?.produtos || res.data || [];
      setProdutos(lista);
      if (lista.length > 0) {
        setSkuSimulado(lista[0].sku);
      }
    } catch (err) {
      console.error('Erro ao carregar produtos para simulador:', err);
    }
  };

  const salvarConfiguracao = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSalvando(true);
      await api.post('/shopee/config', {
        partner_id: partnerId ? Number(partnerId) : null,
        partner_key: partnerKey,
        shop_id: shopId ? Number(shopId) : null,
        ambiente
      });
      setMensagem('✅ Credenciais da Shopee salvas com sucesso!');
      setTimeout(() => setMensagem(''), 5000);
    } catch (err: any) {
      setMensagem(`⚠️ ${err.response?.data?.detail || 'Erro ao salvar credenciais.'}`);
    } finally {
      setSalvando(false);
    }
  };

  const executarSimulacaoVenda = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!skuSimulado) return;

    try {
      setSimulando(true);
      const res = await api.post('/shopee/simular-venda', {
        sku: skuSimulado,
        quantidade: qtdSimulada
      });
      
      setMensagem(`🎉 ${res.data.mensagem} (Estoque anterior: ${res.data.estoque_anterior} ➔ Novo: ${res.data.novo_estoque})`);
      if (onEstoqueAtualizado) onEstoqueAtualizado();
      carregarProdutos();
      setTimeout(() => setMensagem(''), 6000);
    } catch (err: any) {
      setMensagem(`⚠️ ${err.response?.data?.detail || 'Erro ao simular venda.'}`);
    } finally {
      setSimulando(false);
    }
  };

  const copiarUrlWebhook = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 3000);
  };

  return (
    <div>
      <PageHeader
        title={(
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '10px' }}>
            <img src="/logos/shopee.png" alt="Shopee Logo" style={{ width: 28, height: 28, objectFit: 'contain', borderRadius: 4 }} />
            Integração Shopee Open Platform
          </span>
        )}
        subtitle="Receba notificações de vendas em tempo real e dê baixa automática no estoque do Skold Stock."
      />

      <MessageBanner mensagem={mensagem} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', alignItems: 'start', marginBottom: '24px' }}>
        {/* Card 1: Webhook Endpoint */}
        <div style={{ ...cardStyle, borderLeft: `4px solid ${colors.accent}` }}>
          <h3 style={cardTitleStyle}>🔗 URL do Webhook de Vendas</h3>
          <p style={cardDescStyle}>
            Cadastre o endereço abaixo no Portal do Desenvolvedor Shopee para receber avisos automáticos de novas vendas.
          </p>

          <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
            <input
              type="text"
              readOnly
              value={webhookUrl}
              style={{ ...inputStyle, flex: 1, margin: 0, fontFamily: 'monospace', fontSize: '13px', backgroundColor: colors.bgApp, color: '#60a5fa' }}
            />
            <button
              onClick={copiarUrlWebhook}
              style={{ ...btnNeutralStyle, padding: '8px 16px', fontSize: '13px', whiteSpace: 'nowrap' }}
            >
              {copiado ? '✅ Copiado!' : '📋 Copiar URL'}
            </button>
          </div>

          <div style={{ marginTop: '16px', padding: '12px 14px', backgroundColor: 'rgba(30, 41, 59, 0.7)', borderRadius: '8px', border: `1px solid ${colors.borderStrong}`, fontSize: '12.5px', color: colors.textSecondary }}>
            💡 <strong>Como funciona:</strong> Sempre que uma venda for concluída na Shopee, o pedido é lido, o SKU correspondente é localizado e a quantidade é abatida do estoque local instantaneamente.
          </div>
        </div>

        {/* Card 2: Credenciais da API */}
        <div style={cardStyle}>
          <h3 style={cardTitleStyle}>🔑 Credenciais da Loja Shopee</h3>
          <p style={cardDescStyle}>Informe os códigos de desenvolvedor para autenticar a leitura da API v2.</p>

          <form onSubmit={salvarConfiguracao} style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', color: colors.textSecondary, fontSize: '12.5px', marginBottom: '4px' }}>Partner ID:</label>
              <input
                type="number"
                placeholder="Ex: 1005829"
                value={partnerId}
                onChange={(e) => setPartnerId(e.target.value)}
                style={{ ...inputStyle, width: '100%', margin: 0 }}
              />
            </div>

            <div>
              <label style={{ display: 'block', color: colors.textSecondary, fontSize: '12.5px', marginBottom: '4px' }}>Partner Key:</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={mostrarKey ? 'text' : 'password'}
                  placeholder="Cole sua chave de parceiro Shopee"
                  value={partnerKey}
                  onChange={(e) => setPartnerKey(e.target.value)}
                  style={{ ...inputStyle, width: '100%', margin: 0, paddingRight: '40px' }}
                />
                <button
                  type="button"
                  onClick={() => setMostrarKey(!mostrarKey)}
                  style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: colors.textMuted, cursor: 'pointer', fontSize: '14px' }}
                >
                  {mostrarKey ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', color: colors.textSecondary, fontSize: '12.5px', marginBottom: '4px' }}>Shop ID (Código da Loja):</label>
                <input
                  type="number"
                  placeholder="Ex: 884912"
                  value={shopId}
                  onChange={(e) => setShopId(e.target.value)}
                  style={{ ...inputStyle, width: '100%', margin: 0 }}
                />
              </div>

              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', color: colors.textSecondary, fontSize: '12.5px', marginBottom: '4px' }}>Ambiente:</label>
                <select
                  value={ambiente}
                  onChange={(e) => setAmbiente(e.target.value)}
                  style={{ ...inputStyle, width: '100%', margin: 0, color: colors.textPrimary }}
                >
                  <option value="PRODUCAO">🟢 Produção</option>
                  <option value="SANDBOX">🧪 Testes (Sandbox)</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={salvando}
              style={{ ...btnStyle, marginTop: '6px', width: '100%' }}
            >
              {salvando ? 'Salvando...' : '💾 Salvar Credenciais Shopee'}
            </button>
          </form>
        </div>
      </div>

      {/* Card 3: Simulador de Vendas Shopee */}
      <div style={{ ...cardStyle, borderLeft: `4px solid ${colors.accent}` }}>
        <h3 style={cardTitleStyle}>🧪 Simulador de Baixa de Venda Shopee</h3>
        <p style={cardDescStyle}>
          Teste a baixa de estoque em tempo real selecionando um SKU do seu estoque e disparando uma venda simulada.
        </p>

        <form onSubmit={executarSimulacaoVenda} style={{ marginTop: '20px', display: 'flex', gap: '16px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: 2, minWidth: '280px' }}>
            <label style={{ display: 'block', color: colors.textSecondary, fontSize: '12.5px', marginBottom: '6px', fontWeight: 600 }}>
              🔍 Pesquisar & Selecionar SKU para Teste:
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <input
                type="text"
                placeholder="🔎 Pesquisar por SKU ou Nome do produto..."
                value={buscaSku}
                onChange={(e) => {
                  const val = e.target.value;
                  setBuscaSku(val);
                  const list = produtos.filter((p) =>
                    (p.sku && p.sku.toLowerCase().includes(val.toLowerCase())) ||
                    (p.nome && p.nome.toLowerCase().includes(val.toLowerCase()))
                  );
                  if (list.length > 0 && !list.some(p => p.sku === skuSimulado)) {
                    setSkuSimulado(list[0].sku);
                  }
                }}
                style={{ ...inputStyle, width: '100%', margin: 0, fontSize: '13px' }}
              />
              {produtosFiltrados.length > 0 ? (
                <select
                  value={skuSimulado}
                  onChange={(e) => setSkuSimulado(e.target.value)}
                  style={{ ...inputStyle, width: '100%', margin: 0, color: colors.textPrimary, fontWeight: 'bold', fontSize: '13px' }}
                >
                  {produtosFiltrados.map((p) => (
                    <option key={p.id} value={p.sku}>
                      {p.sku} — {p.nome} (Estoque: {p.quantidade_estoque} un.)
                    </option>
                  ))}
                </select>
              ) : (
                <div style={{ fontSize: '12px', color: '#ff6b6b', padding: '4px 0' }}>
                  Nenhum produto encontrado com "{buscaSku}".
                </div>
              )}
            </div>
          </div>

          <div style={{ flex: 1, minWidth: '120px' }}>
            <label style={{ display: 'block', color: colors.textSecondary, fontSize: '12.5px', marginBottom: '6px' }}>
              Qtd Vendida:
            </label>
            <input
              type="number"
              min="1"
              max="999"
              value={qtdSimulada}
              onChange={(e) => setQtdSimulada(Number(e.target.value))}
              style={{ ...inputStyle, width: '100%', margin: 0, fontWeight: 'bold' }}
            />
          </div>

          <button
            type="submit"
            disabled={simulando || !skuSimulado}
            style={{
              ...btnNeutralStyle,
              backgroundColor: 'rgba(59, 130, 246, 0.16)',
              border: `1px solid ${colors.borderStrong}`,
              color: '#60a5fa',
              padding: '10px 20px',
              fontSize: '13.5px',
              fontWeight: 500,
              opacity: (simulando || !skuSimulado) ? 0.6 : 1
            }}
            onMouseEnter={e => { if (!simulando && skuSimulado) e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.28)'; }}
            onMouseLeave={e => { if (!simulando && skuSimulado) e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.16)'; }}
          >
            {simulando ? 'Processando Venda...' : '🚀 Simular Venda Shopee Agora'}
          </button>
        </form>
      </div>
    </div>
  );
}
