import React from 'react';
import { colors } from './theme';

interface SkeletonBoxProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  style?: React.CSSProperties;
  className?: string;
}

export const SkeletonBox: React.FC<SkeletonBoxProps> = ({
  width = '100%',
  height = '20px',
  borderRadius = '6px',
  style,
  className = ''
}) => {
  return (
    <div
      className={`skeleton-box ${className}`}
      style={{
        width,
        height,
        borderRadius,
        ...style
      }}
    />
  );
};

// Componente para Cards de Estatística (Dashboard)
export const SkeletonStatCard: React.FC = () => {
  return (
    <div
      style={{
        backgroundColor: colors.bgCard,
        padding: '24px',
        borderRadius: '14px',
        border: `1px solid ${colors.border}`,
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <SkeletonBox width="60%" height="16px" />
        <SkeletonBox width="28px" height="28px" borderRadius="50%" />
      </div>
      <SkeletonBox width="80%" height="32px" borderRadius="8px" />
      <SkeletonBox width="45%" height="12px" />
    </div>
  );
};

// Componente para Tabelas Inteiras (Estoque, Histórico, Gestão de Usuários)
interface SkeletonTableProps {
  rows?: number;
  cols?: number;
  showHeader?: boolean;
}

export const SkeletonTable: React.FC<SkeletonTableProps> = ({
  rows = 5,
  cols = 6,
  showHeader = true
}) => {
  return (
    <div className="table-scroll" style={{ width: '100%' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        {showHeader && (
          <thead>
            <tr>
              {Array.from({ length: cols }).map((_, cIdx) => (
                <th key={cIdx} style={{ padding: '12px 10px', textAlign: 'left', borderBottom: `2px solid ${colors.border}` }}>
                  <SkeletonBox width={cIdx === 1 ? '70%' : '50%'} height="14px" />
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {Array.from({ length: rows }).map((_, rIdx) => (
            <tr key={rIdx} style={{ borderBottom: `1px solid ${colors.border}` }}>
              {Array.from({ length: cols }).map((_, cIdx) => (
                <td key={cIdx} style={{ padding: '14px 10px' }}>
                  <SkeletonBox
                    width={cIdx === 0 ? '60px' : cIdx === 1 ? '85%' : cIdx === cols - 1 ? '75px' : '65%'}
                    height="18px"
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// Componente para Lista em Cards (ex: Usuários ou Alertas)
interface SkeletonListProps {
  count?: number;
}

export const SkeletonList: React.FC<SkeletonListProps> = ({ count = 3 }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          style={{
            backgroundColor: colors.bgCardAlt,
            padding: '16px 20px',
            borderRadius: '10px',
            border: `1px solid ${colors.border}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
            <SkeletonBox width="38px" height="38px" borderRadius="50%" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
              <SkeletonBox width="50%" height="16px" />
              <SkeletonBox width="30%" height="12px" />
            </div>
          </div>
          <SkeletonBox width="80px" height="28px" borderRadius="6px" />
        </div>
      ))}
    </div>
  );
};
