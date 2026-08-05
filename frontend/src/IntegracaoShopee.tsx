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

export function IntegracaoShopee({}: IntegracaoShopeeProps) {
  const [partnerId, setPartnerId] = useState<string>('');
  const [partnerKey, setPartnerKey] = useState<string>('');
  const [shopId, setShopId] = useState<string>('');
  const [ambiente, setAmbiente] = useState<string>('PRODUCAO');

  const [mostrarKey, setMostrarKey] = useState<boolean>(false);
  const [salvando, setSalvando] = useState<boolean>(false);
  const [mensagem, setMensagem] = useState<string>('');
  const [copiado, setCopiado] = useState<boolean>(false);

  const webhookUrl = `${window.location.protocol}//${window.location.host}/api/webhooks/shopee`;

  useEffect(() => {
    carregarConfiguracao();
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
            Cole esta URL no painel de desenvolvedor da Shopee (Open Platform) na seção Push Notifications (Order Status Update).
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
    </div>
  );
}
