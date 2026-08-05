import React, { useState, useEffect } from 'react';
import { api } from './services/api';
import { PageHeader, MessageBanner } from './ui';
import {
  colors, cardStyle, cardTitleStyle, cardDescStyle,
  inputStyle, btnStyle, btnNeutralStyle
} from './theme';

interface IntegracaoTikTokProps {
  onEstoqueAtualizado?: () => void;
}

export function IntegracaoTikTok({}: IntegracaoTikTokProps) {
  const [appKey, setAppKey] = useState<string>('');
  const [appSecret, setAppSecret] = useState<string>('');
  const [shopCipher, setShopCipher] = useState<string>('');
  const [ambiente, setAmbiente] = useState<string>('PRODUCAO');

  const [mostrarSecret, setMostrarSecret] = useState<boolean>(false);
  const [salvando, setSalvando] = useState<boolean>(false);
  const [mensagem, setMensagem] = useState<string>('');
  const [copiado, setCopiado] = useState<boolean>(false);

  const webhookUrl = `${window.location.protocol}//${window.location.host}/api/webhooks/tiktok`;

  useEffect(() => {
    carregarConfiguracao();
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
      setMensagem(`⚠️ ${err.response?.data?.detail || 'Erro ao salvar credenciais.'}`);
    } finally {
      setSalvando(false);
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
            Integração TikTok Shop Partner API
          </span>
        )}
        subtitle="Receba os webhooks de vendas do TikTok Shop e dê baixa imediata no estoque do Skold Stock."
      />

      <MessageBanner mensagem={mensagem} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', alignItems: 'start', marginBottom: '24px' }}>
        {/* Card 1: Webhook Endpoint */}
        <div style={{ ...cardStyle, borderLeft: `4px solid ${colors.accent}` }}>
          <h3 style={cardTitleStyle}>🔗 URL do Webhook do TikTok Shop</h3>
          <p style={cardDescStyle}>
            Cole esta URL no TikTok Shop Partner Center na seção Webhooks / Event Notifications (Order Status Change).
          </p>

          <div style={{ marginTop: '16px', display: 'flex', gap: '10px' }}>
            <input
              type="text"
              readOnly
              value={webhookUrl}
              style={{ ...inputStyle, width: '100%', margin: 0, fontSize: '13px', backgroundColor: colors.bgInput, color: colors.textSecondary }}
            />
            <button
              onClick={copiarUrlWebhook}
              style={{
                ...btnNeutralStyle,
                whiteSpace: 'nowrap',
                backgroundColor: copiado ? colors.successBg : 'rgba(59, 130, 246, 0.16)',
                color: copiado ? colors.successText : '#60a5fa',
                border: `1px solid ${copiado ? colors.successBorder : colors.borderStrong}`
              }}
            >
              {copiado ? '✓ Copiado!' : '📋 Copiar'}
            </button>
          </div>

          <div style={{ marginTop: '16px', fontSize: '12.5px', color: colors.textMuted, lineHeight: '1.5', backgroundColor: colors.bgInput, padding: '12px 14px', borderRadius: '8px', border: `1px solid ${colors.border}` }}>
            💡 <strong>Como funciona:</strong> Quando uma venda for concluída no TikTok Shop, o webhook avisa o sistema e o produto tem seu estoque baixado na hora.
          </div>
        </div>

        {/* Card 2: Credenciais da API */}
        <div style={cardStyle}>
          <h3 style={cardTitleStyle}>🔑 Credenciais do App TikTok Shop</h3>
          <p style={cardDescStyle}>Informe sua App Key e App Secret para validar a assinatura SHA256 dos Webhooks.</p>

          <form onSubmit={salvarConfiguracao} style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', color: colors.textSecondary, fontSize: '12.5px', marginBottom: '4px' }}>App Key:</label>
              <input
                type="text"
                placeholder="Ex: 6a8f1b2c3d4e"
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
                  placeholder="Cole seu App Secret do TikTok"
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
                <label style={{ display: 'block', color: colors.textSecondary, fontSize: '12.5px', marginBottom: '4px' }}>Shop Cipher (Opcional):</label>
                <input
                  type="text"
                  placeholder="Ex: ROW_123456"
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
    </div>
  );
}
