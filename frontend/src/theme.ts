import type { CSSProperties } from 'react';

// --- PALETA ---
export const colors = {
  bgApp: '#0b1220',
  bgSidebar: '#111a2c',
  bgCard: '#161f2e',
  bgCardAlt: '#0f1729',
  bgInput: '#0b1220',
  border: '#243247',
  borderStrong: '#334155',
  textPrimary: '#f1f5f9',
  textSecondary: '#94a3b8',
  textMuted: '#64748b',
  accent: '#3b82f6',
  accentHover: '#2563eb',
  success: '#10b981',
  successBg: '#062a20',
  successBorder: '#0f5132',
  successText: '#34d399',
  danger: '#ef4444',
  dangerHover: '#dc2626',
  dangerBg: '#2c1212',
  dangerBorder: '#7f1d1d',
  dangerText: '#fca5a5',
  purple: '#8b5cf6',
  purpleHover: '#7c3aed',
  amber: '#f59e0b',
  cyan: '#38bdf8',
  slate: '#475569',
  slateHover: '#334155',
};

// --- LAYOUT ---
export const layoutStyle: CSSProperties = {
  display: 'flex',
  minHeight: '100vh',
  width: '100vw',
  backgroundColor: colors.bgApp,
  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
};

export const sidebarStyle: CSSProperties = {
  width: '264px',
  flexShrink: 0,
  backgroundColor: colors.bgSidebar,
  color: colors.textPrimary,
  padding: '32px 18px',
  display: 'flex',
  flexDirection: 'column',
  borderRight: `1px solid ${colors.border}`,
};

export const contentStyle: CSSProperties = {
  flex: 1,
  padding: '44px 48px',
  overflowY: 'auto',
  maxWidth: '1320px',
};

export const sidebarGroupLabelStyle: CSSProperties = {
  fontSize: '11px',
  fontWeight: 700,
  letterSpacing: '0.08em',
  color: colors.textMuted,
  textTransform: 'uppercase',
  margin: '18px 4px 8px 4px',
};

export const menuItemStyle = (ativo: boolean): CSSProperties => ({
  padding: '11px 14px',
  borderRadius: '8px',
  cursor: 'pointer',
  marginBottom: '4px',
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  fontSize: '14.5px',
  backgroundColor: ativo ? 'rgba(59,130,246,0.15)' : 'transparent',
  color: ativo ? '#ffffff' : colors.textSecondary,
  fontWeight: ativo ? 600 : 500,
  borderLeft: ativo ? `3px solid ${colors.accent}` : '3px solid transparent',
  transition: 'background-color 0.15s, color 0.15s',
});

// --- CARDS / SECTIONS ---
export const cardStyle: CSSProperties = {
  backgroundColor: colors.bgCard,
  padding: '28px',
  borderRadius: '14px',
  border: `1px solid ${colors.border}`,
  boxShadow: '0 4px 10px -4px rgba(0,0,0,0.35)',
};

export const sectionGapStyle: CSSProperties = {
  marginBottom: '28px',
};

// --- TYPOGRAPHY / HEADER ---
export const pageTitleStyle: CSSProperties = {
  color: colors.textPrimary,
  margin: 0,
  fontSize: '26px',
  fontWeight: 700,
  letterSpacing: '-0.01em',
};

export const pageSubtitleStyle: CSSProperties = {
  color: colors.textSecondary,
  margin: '6px 0 0 0',
  fontSize: '14.5px',
};

export const cardTitleStyle: CSSProperties = {
  marginTop: 0,
  marginBottom: '4px',
  color: colors.textPrimary,
  fontSize: '16px',
  fontWeight: 600,
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
};

export const cardDescStyle: CSSProperties = {
  fontSize: '13.5px',
  color: colors.textSecondary,
  margin: '0 0 18px 0',
};

// --- FORM ELEMENTS ---
export const inputStyle: CSSProperties = {
  display: 'block',
  marginBottom: '14px',
  padding: '10px 14px',
  backgroundColor: colors.bgInput,
  border: `1px solid ${colors.borderStrong}`,
  color: colors.textPrimary,
  borderRadius: '8px',
  width: '100%',
  maxWidth: '420px',
  outline: 'none',
  fontSize: '14px',
  boxSizing: 'border-box',
};

export const btnBase: CSSProperties = {
  padding: '10px 20px',
  color: '#fff',
  border: 'none',
  borderRadius: '8px',
  fontWeight: 600,
  fontSize: '14px',
  cursor: 'pointer',
  transition: 'background-color 0.15s, transform 0.05s',
};

export const btnStyle: CSSProperties = { ...btnBase, backgroundColor: colors.accent };
export const btnSuccessStyle: CSSProperties = { ...btnBase, backgroundColor: colors.success };
export const btnPurpleStyle: CSSProperties = { ...btnBase, backgroundColor: colors.purple };
export const btnDangerStyle: CSSProperties = { ...btnBase, padding: '7px 14px', fontSize: '13px', backgroundColor: colors.danger };
export const btnNeutralStyle: CSSProperties = { ...btnBase, padding: '7px 14px', fontSize: '13px', backgroundColor: colors.slate };

// Botão "fantasma" usado nos cards recolhíveis (fechado = contorno, aberto = preenchido)
export const btnToggleClosedStyle: CSSProperties = {
  padding: '9px 16px',
  fontSize: '13.5px',
  fontWeight: 600,
  borderRadius: '8px',
  cursor: 'pointer',
  border: `1px solid ${colors.accent}`,
  backgroundColor: 'transparent',
  color: colors.accent,
  whiteSpace: 'nowrap',
  transition: 'background-color 0.15s, color 0.15s',
};
export const btnToggleOpenStyle: CSSProperties = { ...btnBase, padding: '9px 16px', fontSize: '13.5px', backgroundColor: colors.slate, whiteSpace: 'nowrap' };

// Hover helpers (inline styles don't support :hover, so we mutate on mouse events)
export const hoverIn = (bg: string) => (e: React.MouseEvent<HTMLButtonElement>) => {
  e.currentTarget.style.backgroundColor = bg;
};

// --- TABLE ---
export const tableHeaderStyle: CSSProperties = {
  padding: '12px 14px',
  textAlign: 'left',
  borderBottom: `2px solid ${colors.border}`,
  color: colors.textMuted,
  fontSize: '12px',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  fontWeight: 600,
};

export const tableCellStyle: CSSProperties = {
  padding: '14px',
  borderBottom: `1px solid ${colors.border}`,
  color: colors.textPrimary,
  fontSize: '14px',
};

// --- MESSAGE BANNER ---
export const messageBannerStyle = (isError: boolean): CSSProperties => ({
  padding: '14px 18px',
  backgroundColor: isError ? colors.dangerBg : colors.successBg,
  color: isError ? colors.dangerText : colors.successText,
  borderRadius: '10px',
  marginBottom: '24px',
  border: `1px solid ${isError ? colors.dangerBorder : colors.successBorder}`,
  fontSize: '14px',
  fontWeight: 500,
});
