import React from 'react';

export interface StatCardProps {
  label: string;
  value: string | number | React.ReactNode;
  valueBadge?: string;
  topBadgeText?: string;
  icon: React.ElementType;
  theme: 'blue' | 'green' | 'red' | 'purple' | 'orange';
  highlighted?: boolean;
  onClick?: () => void;
}

const themeMap = {
  blue:   { color: '#3b7dd8', bg: '#eef4fd', border: 'rgba(59,125,216,0.18)',  borderHover: 'rgba(59,125,216,0.40)'  },
  green:  { color: '#2fa87a', bg: '#e8f7f1', border: 'rgba(47,168,122,0.18)',  borderHover: 'rgba(47,168,122,0.40)'  },
  red:    { color: '#e05c5c', bg: '#fdeaea', border: 'rgba(224,92,92,0.18)',   borderHover: 'rgba(224,92,92,0.40)'   },
  purple: { color: '#7c5cbf', bg: '#f0ebfa', border: 'rgba(124,92,191,0.18)', borderHover: 'rgba(124,92,191,0.40)' },
  orange: { color: '#d97c3a', bg: '#fdf0e5', border: 'rgba(217,124,58,0.18)', borderHover: 'rgba(217,124,58,0.40)' },
};

export const StatCard = ({ label, value, valueBadge, topBadgeText, icon: Icon, theme, highlighted = false, onClick }: StatCardProps) => {
  const t = themeMap[theme];
  const [hovered, setHovered] = React.useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: '100%',
        textAlign: 'left',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflow: 'hidden',
        padding: '22px',
        borderRadius: '20px',
        border: `1.5px solid ${hovered ? t.borderHover : t.border}`,
        background: highlighted ? t.bg : '#ffffff',
        cursor: 'pointer',
        boxShadow: hovered
          ? '0 8px 32px rgba(0,0,0,0.10)'
          : '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)',
        transform: hovered ? 'translateY(-4px)' : 'translateY(0)',
        transition: 'all 0.2s ease',
      }}
    >
      <span style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        height: '3px',
        background: t.color,
        borderRadius: '0 0 20px 20px',
        opacity: hovered ? 1 : 0,
        transition: 'opacity 0.2s ease',
      }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <div style={{
          width: '40px', height: '40px',
          borderRadius: '12px',
          background: t.bg, color: t.color,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transform: hovered ? 'scale(1.1) rotate(-4deg)' : 'scale(1) rotate(0deg)',
          transition: 'transform 0.2s ease',
        }}>
          <Icon size={20} strokeWidth={2} />
        </div>
        {topBadgeText && (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '999px',
            background: '#ef4444',
            color: '#ffffff',
            fontSize: '11px',
            fontWeight: 700,
            padding: '4px 10px',
            lineHeight: 1.2,
          }}>
            {topBadgeText}
          </span>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        <div style={{
          fontFamily: 'inherit',
          fontSize: '38px', lineHeight: 1,
          color: '#1c1a17', letterSpacing: '-1px',
          fontWeight: 500,
        }}>
          {value}
        </div>
        {valueBadge && (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: '22px',
            height: '22px',
            padding: '0 8px',
            borderRadius: '999px',
            background: '#ef4444',
            color: '#ffffff',
            fontSize: '11px',
            fontWeight: 700,
            lineHeight: 1,
          }}>
            {valueBadge}
          </span>
        )}
      </div>

      <p style={{
        fontSize: '11px', fontWeight: 600,
        color: '#9c9690', textTransform: 'uppercase',
        letterSpacing: '0.8px', marginTop: '5px',
        fontFamily: 'inherit',
      }}>
        {label}
      </p>
    </button>
  );
};