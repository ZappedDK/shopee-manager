import React, { useState, useEffect } from 'react';
import { api } from './services/api';
import { PageHeader, MessageBanner } from './ui';
import { SeletorProdutoSearchable } from './components/SeletorProdutoSearchable';
import {
  colors, cardStyle, cardTitleStyle, cardDescStyle,
  inputStyle, btnStyle, btnNeutralStyle
} from './theme';

interface IntegracaoTikTokProps {
  onEstoqueAtualizado?: () => void;
}

export function IntegracaoTikTok({ onEstoqueAtualizado }: IntegracaoTikTokProps) {
  const [appKey, setAppKey] = useState<string>('');
  const [appSecret, setAppSecret] = useState<string>('');
  const [shopCipher, setShopCipher] = useState<string>('');
  const [ambiente, setAmbiente] = useState<string>('PRODUCAO');

  const [mostrarSecret, setMostrarSecret] = useState<boolean>(false);
  const [salvando, setSalvando] = useState<boolean>(false);
  const [mensagem, setMensagem] = useState<string>('');

  // Simulador de Venda
  const [produtos, setProdutos] = useState<any[]>([]);
  const [skuSimulado, setSkuSimulado] = useState<string>('');
  const [qtdSimulada, setQtdSimulada] = useState<number>(1);
  const [simulando, setSimulando] = useState<boolean>(false);
  const [copiado, setCopiado] = useState<boolean>(false);

  const webhookUrl = `${window.location.protocol}//${window.location.host}/api/webhooks/tiktok`;

  useEffect(() => {
    carregarConfiguracao();
    carregarProdutos();
  }, []);

  const carregarConfiguracao = async () => {
    try {
      const res = await api.get('/tiktok/config');
      if (res.data) {
        setAppKey(res.data.app_key || '');
        setAppSecret(res.data.app_secret || '');
        setShopCipher(res.data.shop_cipher || '');
        setAmbiente(res.data.ambiente || 'PRODUCAO');
      }
    } catch (err) {
      console.error('Erro ao carregar configurações do TikTok Shop:', err);
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
      console.error('Erro ao carregar produtos para simulador TikTok:', err);
    }
  };

  const salvarConfiguracao = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSalvando(true);
      await api.post('/tiktok/config', {
        app_key: appKey,
        app_secret: appSecret,
        shop_cipher: shopCipher,
        ambiente
      });
      setMensagem('✅ Credenciais do TikTok Shop salvas com sucesso!');
      setTimeout(() => setMensagem(''), 5000);
    } catch (err: any) {
      setMensagem(`⚠️ ${err.response?.data?.detail || 'Erro ao salvar credenciais do TikTok.'}`);
    } finally {
      setSalvando(false);
    }
  };

  const executarSimulacaoVenda = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!skuSimulado) return;

    try {
      setSimulando(true);
      const res = await api.post('/tiktok/simular-venda', {
        sku: skuSimulado,
        quantidade: qtdSimulada
      });
      
      setMensagem(`🎉 ${res.data.mensagem} (Estoque anterior: ${res.data.estoque_anterior} ➔ Novo: ${res.data.novo_estoque})`);
      if (onEstoqueAtualizado) onEstoqueAtualizado();
      carregarProdutos();
      setTimeout(() => setMensagem(''), 6000);
    } catch (err: any) {
      setMensagem(`⚠️ ${err.response?.data?.detail || 'Erro ao simular venda do TikTok.'}`);
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
            <img src="/logos/tiktokshop.png" alt="TikTok Shop Logo" style={{ width: 28, height: 28, objectFit: 'contain', borderRadius: 4 }} />
            Integração TikTok Shop
          </span>
        )}
        subtitle="Receba notificações de vendas do TikTok em tempo real e dê baixa automática no estoque do Skold Stock."
      />

      <MessageBanner mensagem={mensagem} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', alignItems: 'start', marginBottom: '24px' }}>
        {/* Card 1: Webhook Endpoint */}
        <div style={{ ...cardStyle, borderLeft: `4px solid ${colors.accent}` }}>
          <h3 style={cardTitleStyle}>🔗 URL do Webhook de Vendas TikTok</h3>
          <p style={cardDescStyle}>
            Cadastre o endereço abaixo no Partner Center da TikTok Shop para receber notificações de novos pedidos.
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
            💡 <strong>Como funciona:</strong> Ao confirmar uma venda no TikTok Shop, o webhook aciona o Skold Stock, lê o Seller SKU e realiza a redução do estoque automaticamente no banco de dados.
          </div>
        </div>

        {/* Card 2: Credenciais da API */}
        <div style={cardStyle}>
          <h3 style={cardTitleStyle}>🔑 Credenciais da App TikTok Shop</h3>
          <p style={cardDescStyle}>Configure a App Key e App Secret geradas no TikTok Shop Partner Center.</p>

          <form onSubmit={salvarConfiguracao} style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', color: colors.textSecondary, fontSize: '12.5px', marginBottom: '4px' }}>App Key:</label>
              <input
                type="text"
                placeholder="Ex: 6a8f1e92..."
                value={appKey}
                onChange={(e) => setAppKey(e.target.value)}
                style={{ ...inputStyle, width: '100%', margin: 0 }}
              />
            </div>

            <div>
              <label style={{ display: 'block', color: colors.textSecondary, fontSize: '12.5px', marginBottom: '4px' }}>App Secret:</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={mostrarSecret ? 'text' : 'password'}
                  placeholder="Cole sua App Secret do TikTok"
                  value={appSecret}
                  onChange={(e) => setAppSecret(e.target.value)}
                  style={{ ...inputStyle, width: '100%', margin: 0, paddingRight: '40px' }}
                />
                <button
                  type="button"
                  onClick={() => setMostrarSecret(!mostrarSecret)}
                  style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: colors.textMuted, cursor: 'pointer', fontSize: '14px' }}
                >
                  {mostrarSecret ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', color: colors.textSecondary, fontSize: '12.5px', marginBottom: '4px' }}>Shop Cipher / Shop ID:</label>
                <input
                  type="text"
                  placeholder="Ex: GSP_123456"
                  value={shopCipher}
                  onChange={(e) => setShopCipher(e.target.value)}
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
              {salvando ? 'Salvando...' : '💾 Salvar Credenciais TikTok'}
            </button>
          </form>
        </div>
      </div>

      {/* Card 3: Simulador de Vendas TikTok Shop */}
      <div style={{ ...cardStyle, borderLeft: `4px solid ${colors.accent}` }}>
        <h3 style={cardTitleStyle}>🧪 Simulador de Baixa de Venda TikTok Shop</h3>
        <p style={cardDescStyle}>
          Teste a baixa de estoque em tempo real selecionando um SKU do seu estoque e disparando uma venda simulada do TikTok.
        </p>

        <form onSubmit={executarSimulacaoVenda} style={{ marginTop: '20px', display: 'flex', gap: '16px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: 2, minWidth: '280px' }}>
            <label style={{ display: 'block', color: colors.textSecondary, fontSize: '12.5px', marginBottom: '6px', fontWeight: 600 }}>
              📦 Selecionar Produto para Simulação:
            </label>
            <SeletorProdutoSearchable
              produtos={produtos}
              skuSelecionado={skuSimulado}
              onSelectSku={(sku) => setSkuSimulado(sku)}
              colors={colors}
              inputStyle={inputStyle}
            />
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
            {simulando ? 'Processando Venda...' : '🚀 Simular Venda TikTok Shop Agora'}
          </button>
        </form>
      </div>
    </div>
  );
}
