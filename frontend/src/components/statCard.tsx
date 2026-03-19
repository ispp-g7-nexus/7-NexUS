import { TrendingDown, TrendingUp } from 'lucide-react';
import React from 'react';

export interface StatCardProps {
  label: string;
  value: string | number;
  trend: string;
  icon: React.ElementType;
  theme: 'blue' | 'green' | 'red' | 'purple' | 'orange';
  onClick?: () => void;
}

const themeMap = {
  blue:   { color: '#3b7dd8', bg: '#eef4fd', border: 'rgba(59,125,216,0.18)',  borderHover: 'rgba(59,125,216,0.40)'  },
  green:  { color: '#2fa87a', bg: '#e8f7f1', border: 'rgba(47,168,122,0.18)',  borderHover: 'rgba(47,168,122,0.40)'  },
  red:    { color: '#e05c5c', bg: '#fdeaea', border: 'rgba(224,92,92,0.18)',   borderHover: 'rgba(224,92,92,0.40)'   },
  purple: { color: '#7c5cbf', bg: '#f0ebfa', border: 'rgba(124,92,191,0.18)', borderHover: 'rgba(124,92,191,0.40)' },
  orange: { color: '#d97c3a', bg: '#fdf0e5', border: 'rgba(217,124,58,0.18)', borderHover: 'rgba(217,124,58,0.40)' },
};

export const StatCard = ({ label, value, trend, icon: Icon, theme, onClick }: StatCardProps) => {
  const t = themeMap[theme];
  const isNegative = trend.startsWith('-');
  const TrendIcon = isNegative ? TrendingDown : TrendingUp;

  const [hovered, setHovered] = React.useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        // Tamaño: ocupa todo el ancho de su celda en el grid
        width: '100%',
        textAlign: 'left',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflow: 'hidden',
        padding: '22px',
        borderRadius: '20px',
        border: `1.5px solid ${hovered ? t.borderHover : t.border}`,
        background: '#ffffff',
        cursor: 'pointer',
        boxShadow: hovered
          ? '0 8px 32px rgba(0,0,0,0.10)'
          : '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)',
        transform: hovered ? 'translateY(-4px)' : 'translateY(0)',
        transition: 'all 0.2s ease',
      }}
    >
      {/* Acento inferior en hover */}
      <span style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        height: '3px',
        background: t.color,
        borderRadius: '0 0 20px 20px',
        opacity: hovered ? 1 : 0,
        transition: 'opacity 0.2s ease',
      }} />

      {/* Icono */}
      <div style={{
        width: '40px', height: '40px',
        borderRadius: '12px',
        background: t.bg, color: t.color,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: '16px',
        transform: hovered ? 'scale(1.1) rotate(-4deg)' : 'scale(1) rotate(0deg)',
        transition: 'transform 0.2s ease',
      }}>
        <Icon size={20} strokeWidth={2} />
      </div>

      {/* Trend pill - solo mostrar si hay trend */}
      {trend && (
        <span style={{
          position: 'absolute', top: '18px', right: '18px',
          display: 'flex', alignItems: 'center', gap: '3px',
          fontSize: '11px', fontWeight: 700,
          padding: '3px 9px', borderRadius: '999px',
          background: isNegative ? '#fdeaea' : '#e8f7f1',
          color: isNegative ? '#e05c5c' : '#2fa87a',
        }}>
          <TrendIcon size={11} strokeWidth={2.5} />
          {trend}
        </span>
      )}

      {/* Valor */}
      <div style={{
        fontFamily: "'DM Serif Display', serif",
        fontSize: '38px', lineHeight: 1,
        color: '#1c1a17', letterSpacing: '-1px',
      }}>
        {value}
      </div>

      {/* Etiqueta */}
      <p style={{
        fontSize: '11px', fontWeight: 600,
        color: '#9c9690', textTransform: 'uppercase',
        letterSpacing: '0.8px', marginTop: '5px',
        fontFamily: "'DM Sans', sans-serif",
      }}>
        {label}
      </p>
    </button>
  );
};
