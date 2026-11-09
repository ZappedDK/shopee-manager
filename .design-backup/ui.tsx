import React, { useState } from 'react';
import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import {
  pageTitleStyle, pageSubtitleStyle, messageBannerStyle, sectionGapStyle,
  cardStyle, cardTitleStyle, cardDescStyle, colors,
  btnToggleClosedStyle, btnToggleOpenStyle,
} from './theme';

export function PageHeader({ title, subtitle }: { title: React.ReactNode; subtitle?: string }) {
  return (
    <div style={{ marginBottom: '32px' }}>
      <h2 style={pageTitleStyle}>{title}</h2>
      {subtitle && <p style={pageSubtitleStyle}>{subtitle}</p>}
    </div>
  );
}

export function MessageBanner({ mensagem }: { mensagem: string }) {
  if (!mensagem) return null;
  const isError = mensagem.includes('❌') || mensagem.toLowerCase().includes('erro');
  const isWarning = mensagem.includes('⚠️') || mensagem.toLowerCase().includes('aviso');
  const textoLimpo = mensagem.replace(/^[✅❌⚠️ℹ️\s]+/, '').trim();
  const Icon = isError ? XCircle : (isWarning ? AlertTriangle : CheckCircle2);

  return (
    <div style={{ ...messageBannerStyle(isError), display: 'flex', alignItems: 'center', gap: '10px' }}>
      <Icon size={18} style={{ flexShrink: 0 }} />
      <span>{textoLimpo}</span>
    </div>
  );
}

export function SectionGap({ children }: { children: React.ReactNode }) {
  return <div style={sectionGapStyle}>{children}</div>;
}

interface CollapsibleCardProps {
  icon?: React.ReactNode;
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
          <h3 style={{ ...cardTitleStyle, display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            {icon}
            <span>{title}</span>
          </h3>
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
