import { useState } from 'react';
import { colors } from './theme';
import { IntegracaoShopee } from './IntegracaoShopee';
import { IntegracaoTikTok } from './IntegracaoTikTok';

interface IntegracoesProps {
  onEstoqueAtualizado?: () => void;
  abaInicial?: 'shopee' | 'tiktok';
}

export function Integracoes({ onEstoqueAtualizado, abaInicial = 'shopee' }: IntegracoesProps) {
  const [abaAtiva, setAbaAtiva] = useState<'shopee' | 'tiktok'>(abaInicial);

  return (
    <div>
      {/* Seletor de Plataforma em Sub-Abas */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '20px',
          paddingBottom: '16px',
          borderBottom: `1px solid ${colors.border}`,
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        <span style={{ fontSize: '13px', fontWeight: 600, color: colors.textMuted, marginRight: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Canal:
        </span>

        <button
          type="button"
          onClick={() => setAbaAtiva('shopee')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 18px',
            borderRadius: '8px',
            fontWeight: 600,
            fontSize: '13.5px',
            cursor: 'pointer',
            border: abaAtiva === 'shopee' ? '1px solid #ee4d2d' : `1px solid ${colors.border}`,
            backgroundColor: abaAtiva === 'shopee' ? 'rgba(238, 77, 45, 0.16)' : colors.bgCard,
            color: abaAtiva === 'shopee' ? '#ff6b4a' : colors.textSecondary,
            transition: 'all 0.15s ease-in-out',
          }}
        >
          <img src="/logos/shopee.png" alt="Shopee" style={{ width: 18, height: 18, objectFit: 'contain', borderRadius: 3 }} />
          Shopee
        </button>

        <button
          type="button"
          onClick={() => setAbaAtiva('tiktok')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 18px',
            borderRadius: '8px',
            fontWeight: 600,
            fontSize: '13.5px',
            cursor: 'pointer',
            border: abaAtiva === 'tiktok' ? '1px solid #00f2fe' : `1px solid ${colors.border}`,
            backgroundColor: abaAtiva === 'tiktok' ? 'rgba(0, 242, 254, 0.14)' : colors.bgCard,
            color: abaAtiva === 'tiktok' ? '#38bdf8' : colors.textSecondary,
            transition: 'all 0.15s ease-in-out',
          }}
        >
          <img src="/logos/tiktokshop.png" alt="TikTok" style={{ width: 18, height: 18, objectFit: 'contain', borderRadius: 3 }} />
          TikTok Shop
        </button>
      </div>

      {/* Conteúdo da Integração */}
      {abaAtiva === 'shopee' && (
        <IntegracaoShopee onEstoqueAtualizado={onEstoqueAtualizado} />
      )}

      {abaAtiva === 'tiktok' && (
        <IntegracaoTikTok onEstoqueAtualizado={onEstoqueAtualizado} />
      )}
    </div>
  );
}
