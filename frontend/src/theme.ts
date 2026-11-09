import type { CSSProperties } from 'react';

/*
 * Design tokens — Skold Stock (linguagem inspirada no Mercury)
 * ----------------------------------------------------------------
 * Cada cor aponta para uma CSS custom property definida em index.css,
 * com um valor para o tema claro (:root) e outro para o escuro
 * ([data-theme="dark"]). Trocar o tema = trocar o atributo no <html>;
 * nenhum componente precisa saber qual tema está ativo.
 *
 * Estados interativos (hover, :active, foco) vivem no CSS, nunca em
 * onMouseEnter/Leave.
 */

// --- PALETA (semântica) ---
export const colors = {
  bgApp: 'var(--bg-app)',
  bgSidebar: 'var(--bg-sidebar)',
  bgCard: 'var(--bg-card)',
  bgCardAlt: 'var(--bg-sunken)',
  bgInput: 'var(--bg-input)',
  border: 'var(--border)',
  borderStrong: 'var(--border-strong)',
  textPrimary: 'var(--text-primary)',
  textSecondary: 'var(--text-secondary)',
  textMuted: 'var(--text-muted)',
  accent: 'var(--accent)',
  accentHover: 'var(--accent-hover)',
  success: 'var(--positive)',
  successBg: 'var(--positive-bg)',
  successBorder: 'var(--positive-border)',
  successText: 'var(--positive)',
  danger: 'var(--negative)',
  dangerHover: 'var(--negative)',
  dangerBg: 'var(--negative-bg)',
  dangerBorder: 'var(--negative-border)',
  dangerText: 'var(--negative)',
  purple: 'var(--purple)',
  purpleHover: 'var(--purple)',
  amber: 'var(--warning)',
  cyan: 'var(--info)',
  slate: 'var(--surface-neutral)',
  slateHover: 'var(--surface-neutral-hover)',
};

/** Mistura uma cor de token com transparência — funciona nos dois temas. */
export const tint = (cssColor: string, pct: number) =>
  `color-mix(in srgb, ${cssColor} ${pct}%, transparent)`;

export const radius = { sm: '6px', md: '8px', lg: '12px', xl: '16px' };

export const fontStack =
  "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI Variable Text', 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";

// --- LAYOUT ---
export const layoutStyle: CSSProperties = {
  display: 'flex',
  minHeight: '100dvh',
  width: '100%',
  backgroundColor: colors.bgApp,
  fontFamily: fontStack,
};

export const sidebarStyle: CSSProperties = {
  width: '248px',
  flexShrink: 0,
  color: colors.textPrimary,
  padding: '18px 12px',
  display: 'flex',
  flexDirection: 'column',
  height: '100dvh',
  position: 'sticky',
  top: 0,
  boxSizing: 'border-box',
};

// Conteúdo usa toda a largura disponível (sem coluna centralizada com
// sobras laterais). O teto de 2200px só evita linhas absurdas em ultrawide.
export const contentStyle: CSSProperties = {
  flex: 1,
  minWidth: 0,
  padding: '28px clamp(20px, 2.4vw, 40px) 48px',
  maxWidth: '2200px',
};

export const sidebarGroupLabelStyle: CSSProperties = {
  fontSize: '12px',
  fontWeight: 500,
  color: colors.textMuted,
  margin: '18px 10px 4px',
};

/** Mantido por compatibilidade — o menu lateral usa a classe .nav-item (index.css). */
export const menuItemStyle = (ativo: boolean): CSSProperties => ({
  padding: '7px 10px',
  borderRadius: radius.md,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  fontSize: '14px',
  backgroundColor: ativo ? colors.bgCard : 'transparent',
  color: ativo ? colors.textPrimary : colors.textSecondary,
  fontWeight: 500,
});

// --- CARDS / SECTIONS ---
export const cardStyle: CSSProperties = {
  backgroundColor: colors.bgCard,
  padding: '24px',
  borderRadius: radius.lg,
  border: `1px solid ${colors.border}`,
  boxShadow: 'var(--shadow-card)',
};

export const sectionGapStyle: CSSProperties = {
  marginBottom: '20px',
};

// --- TYPOGRAPHY / HEADER ---
export const pageTitleStyle: CSSProperties = {
  color: colors.textPrimary,
  margin: 0,
  fontSize: '26px',
  lineHeight: 1.2,
  fontWeight: 500,
  letterSpacing: '-0.025em',
};

export const pageSubtitleStyle: CSSProperties = {
  color: colors.textSecondary,
  margin: '6px 0 0 0',
  fontSize: '14px',
  lineHeight: 1.5,
};

export const cardTitleStyle: CSSProperties = {
  marginTop: 0,
  marginBottom: '4px',
  color: colors.textPrimary,
  fontSize: '15px',
  fontWeight: 600,
  letterSpacing: '-0.01em',
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
};

export const cardDescStyle: CSSProperties = {
  fontSize: '13.5px',
  lineHeight: 1.5,
  color: colors.textSecondary,
  margin: '0 0 18px 0',
};

// --- FORM ELEMENTS ---
export const inputStyle: CSSProperties = {
  display: 'block',
  marginBottom: '14px',
  padding: '9px 12px',
  backgroundColor: colors.bgInput,
  border: `1px solid ${colors.borderStrong}`,
  color: colors.textPrimary,
  borderRadius: radius.md,
  width: '100%',
  maxWidth: '420px',
  outline: 'none',
  fontSize: '14px',
  boxSizing: 'border-box',
  boxShadow: 'var(--shadow-input)',
};

// Sem `transition` aqui: o index.css define as transições por propriedade.
export const btnBase: CSSProperties = {
  padding: '8px 14px',
  minHeight: '36px',
  borderRadius: radius.md,
  fontWeight: 500,
  fontSize: '13.5px',
  lineHeight: 1.2,
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '6px',
  whiteSpace: 'nowrap',
  boxSizing: 'border-box',
};

/** Primário — ação principal da tela (sólido, índigo). */
export const btnStyle: CSSProperties = {
  ...btnBase,
  backgroundColor: colors.accent,
  color: 'var(--on-accent)',
  border: '1px solid var(--accent-border)',
  boxShadow: 'var(--shadow-btn-primary)',
};

/** Confirmar/salvar — mesmo peso visual do primário (o Mercury não usa botão verde). */
export const btnSuccessStyle: CSSProperties = {
  ...btnStyle,
};

/** Secundário — superfície com borda. */
export const btnPurpleStyle: CSSProperties = {
  ...btnBase,
  backgroundColor: colors.bgCard,
  color: colors.textPrimary,
  border: `1px solid ${colors.borderStrong}`,
  boxShadow: 'var(--shadow-input)',
};

export const btnDangerStyle: CSSProperties = {
  ...btnBase,
  padding: '6px 12px',
  minHeight: '32px',
  fontSize: '13px',
  backgroundColor: colors.bgCard,
  color: colors.danger,
  border: `1px solid ${tint('var(--negative)', 35)}`,
};

export const btnNeutralStyle: CSSProperties = {
  ...btnBase,
  padding: '6px 12px',
  minHeight: '32px',
  fontSize: '13px',
  backgroundColor: colors.bgCard,
  color: colors.textPrimary,
  border: `1px solid ${colors.borderStrong}`,
  boxShadow: 'var(--shadow-input)',
};

// Botões para cards recolhíveis
export const btnToggleClosedStyle: CSSProperties = {
  ...btnPurpleStyle,
  fontSize: '13px',
};

export const btnToggleOpenStyle: CSSProperties = {
  ...btnPurpleStyle,
  fontSize: '13px',
  color: colors.textSecondary,
};

/** @deprecated Hover agora é feito via CSS (index.css). Mantido só por compatibilidade. */
export const hoverIn = (bg: string) => (e: React.MouseEvent<HTMLButtonElement>) => {
  e.currentTarget.style.backgroundColor = bg;
};

// --- TABLE ---
export const tableHeaderStyle: CSSProperties = {
  position: 'sticky',
  top: 0,
  zIndex: 10,
  backgroundColor: colors.bgCard,
  padding: '10px 12px',
  textAlign: 'left',
  borderBottom: `1px solid ${colors.border}`,
  color: colors.textMuted,
  fontSize: '12.5px',
  fontWeight: 500,
  whiteSpace: 'nowrap',
};

export const tableCellStyle: CSSProperties = {
  padding: '12px 12px',
  borderBottom: `1px solid ${colors.border}`,
  color: colors.textPrimary,
  fontSize: '13.5px',
};

// --- MESSAGE BANNER ---
export const messageBannerStyle = (isError: boolean): CSSProperties => ({
  padding: '12px 16px',
  backgroundColor: isError ? colors.dangerBg : colors.successBg,
  color: isError ? colors.dangerText : colors.successText,
  borderRadius: radius.md,
  marginBottom: '20px',
  border: `1px solid ${isError ? colors.dangerBorder : colors.successBorder}`,
  fontSize: '14px',
  fontWeight: 500,
});

/**
 * Formata um valor numérico para Moeda em Real Brasileiro (BRL)
 * Exemplo: 1234.56 -> "R$ 1.234,56"
 * Exemplo (semSimbolo = true): 1234.56 -> "1.234,56"
 */
export function formatarMoeda(valor: number | null | undefined, semSimbolo: boolean = false): string {
  if (valor === null || valor === undefined || isNaN(valor)) {
    return semSimbolo ? '0,00' : 'R$ 0,00';
  }

  const formatado = valor.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return semSimbolo ? formatado : `R$ ${formatado}`;
}

/**
 * Formata um número decimal com pontuação brasileira
 * Exemplo: 12.3456 -> "12,35"
 */
export function formatarNumero(valor: number | null | undefined, casasDecimais: number = 2): string {
  if (valor === null || valor === undefined || isNaN(valor)) {
    return '0,00';
  }

  return valor.toLocaleString('pt-BR', {
    minimumFractionDigits: casasDecimais,
    maximumFractionDigits: casasDecimais,
  });
}
