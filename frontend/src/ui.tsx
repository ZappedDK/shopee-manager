import React, { useState } from 'react';
import {
  pageTitleStyle, pageSubtitleStyle, messageBannerStyle, sectionGapStyle,
  cardStyle, cardTitleStyle, cardDescStyle, colors,
  btnToggleClosedStyle, btnToggleOpenStyle,
} from './theme';

export function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div style={{ marginBottom: '32px' }}>
      <h2 style={pageTitleStyle}>{title}</h2>
      {subtitle && <p style={pageSubtitleStyle}>{subtitle}</p>}
    </div>
  );
}

export function MessageBanner({ mensagem }: { mensagem: string }) {
  if (!mensagem) return null;
  const isError = mensagem.includes('❌');
  return <div style={messageBannerStyle(isError)}>{mensagem}</div>;
}

export function SectionGap({ children }: { children: React.ReactNode }) {
  return <div style={sectionGapStyle}>{children}</div>;
}

interface CollapsibleCardProps {
  icon?: string;
  title: string;
  description?: string;
  buttonLabel: string;
  defaultOpen?: boolean;
  style?: React.CSSProperties;
  children: React.ReactNode;
}

/** Card com um botão que abre/fecha o conteúdo (formulário) — usado para deixar as telas de cadastro mais limpas. */
export function CollapsibleCard({ icon, title, description, buttonLabel, defaultOpen = false, style, children }: CollapsibleCardProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div style={{ ...cardStyle, ...style }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap' }}>
        <div>
          <h3 style={cardTitleStyle}>{icon} {title}</h3>
          {description && <p style={{ ...cardDescStyle, marginBottom: open ? '18px' : 0 }}>{description}</p>}
        </div>
        <button
          onClick={() => setOpen(o => !o)}
          style={open ? btnToggleOpenStyle : btnToggleClosedStyle}
          onMouseEnter={e => { if (!open) e.currentTarget.style.backgroundColor = 'rgba(59,130,246,0.12)'; else e.currentTarget.style.backgroundColor = colors.slateHover; }}
          onMouseLeave={e => { if (!open) e.currentTarget.style.backgroundColor = 'transparent'; else e.currentTarget.style.backgroundColor = colors.slate; }}
        >
          {open ? 'Fechar' : buttonLabel}
        </button>
      </div>
      {open && <div>{children}</div>}
    </div>
  );
}
