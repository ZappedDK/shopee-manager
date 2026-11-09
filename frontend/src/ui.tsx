import React, { useEffect, useId, useState } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, ChevronDown } from 'lucide-react';
import {
  pageTitleStyle, pageSubtitleStyle, messageBannerStyle, sectionGapStyle,
  cardStyle, cardTitleStyle, cardDescStyle,
  btnToggleClosedStyle, btnToggleOpenStyle,
} from './theme';

export function PageHeader({ title, subtitle }: { title: React.ReactNode; subtitle?: string }) {
  return (
    <div style={{ marginBottom: '22px' }}>
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
    <div
      key={mensagem}
      role={isError ? 'alert' : 'status'}
      className="banner-enter"
      style={{ ...messageBannerStyle(isError), display: 'flex', alignItems: 'center', gap: '10px' }}
    >
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
  const contentId = useId();

  return (
    <div style={{ ...cardStyle, ...style }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap' }}>
        <div style={{ minWidth: 0, flex: '1 1 260px' }}>
          <h3 style={{ ...cardTitleStyle, display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            {icon}
            <span>{title}</span>
          </h3>
          {description && <p style={{ ...cardDescStyle, marginBottom: 0 }}>{description}</p>}
        </div>
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          aria-expanded={open}
          aria-controls={contentId}
          style={open ? btnToggleOpenStyle : btnToggleClosedStyle}
        >
          {open ? 'Fechar' : buttonLabel}
          <ChevronDown
            size={14}
            style={{
              transform: open ? 'rotate(180deg)' : 'none',
              transition: 'transform 240ms cubic-bezier(0.23, 1, 0.32, 1)',
            }}
          />
        </button>
      </div>
      <div id={contentId} className="collapse" data-open={open} inert={!open}>
        <div className="collapse-inner">
          <div style={{ paddingTop: '20px' }}>{children}</div>
        </div>
      </div>
    </div>
  );
}

/**
 * Barra fina no topo da tela enquanto há requisições ao servidor.
 * Só aparece se a espera passar de 150ms — respostas rápidas (ou do cache)
 * não piscam nada na tela.
 */
export function BarraProgresso() {
  const [ativo, setAtivo] = useState(false);

  useEffect(() => {
    let timer: number | undefined;
    const onCarregando = (e: Event) => {
      const n = (e as CustomEvent<number>).detail;
      window.clearTimeout(timer);
      if (n > 0) timer = window.setTimeout(() => setAtivo(true), 150);
      else setAtivo(false);
    };
    window.addEventListener('api-carregando', onCarregando);
    return () => {
      window.removeEventListener('api-carregando', onCarregando);
      window.clearTimeout(timer);
    };
  }, []);

  return (
    <div className="top-progress" data-ativo={ativo} role="progressbar" aria-hidden={!ativo} aria-label="Carregando">
      <span />
    </div>
  );
}
