import React from 'react';
import MetricInfo from './ui/MetricInfo';

export interface StatCardProps {
  label?: string;
  title?: string;
  value: string | number | React.ReactNode;
  valueBadge?: string;
  topBadgeText?: string;
  icon?: React.ElementType | React.ReactElement | null; 
  theme?: 'blue' | 'green' | 'red' | 'purple' | 'orange';
  onClick?: () => void;
  info?: { title?: string; description: string };
}

const themeMap = {
  blue:   { color: '#3b7dd8', bg: '#eef4fd', border: 'rgba(59,125,216,0.18)',  borderHover: 'rgba(59,125,216,0.40)'  },
  green:  { color: '#2fa87a', bg: '#e8f7f1', border: 'rgba(47,168,122,0.18)',  borderHover: 'rgba(47,168,122,0.40)'  },
  red:    { color: '#e05c5c', bg: '#fdeaea', border: 'rgba(224,92,92,0.18)',   borderHover: 'rgba(224,92,92,0.40)'   },
  purple: { color: '#7c5cbf', bg: '#f0ebfa', border: 'rgba(124,92,191,0.18)', borderHover: 'rgba(124,92,191,0.40)' },
  orange: { color: '#d97c3a', bg: '#fdf0e5', border: 'rgba(217,124,58,0.18)', borderHover: 'rgba(217,124,58,0.40)' },
};

export const StatCard = ({ label, title, value, valueBadge, topBadgeText, icon: Icon, theme = 'blue', onClick, info }: StatCardProps) => {
  const displayLabel = label ?? title ?? '';
  const t = themeMap[theme] ?? themeMap['blue'];
  const [hovered, setHovered] = React.useState(false);
  const [focused, setFocused] = React.useState(false);

  const isInteractive = typeof onClick === 'function';

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isInteractive) return;
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
      e.preventDefault();
      onClick && onClick();
    }
  };
  const interactiveProps: any = isInteractive
    ? {
        role: 'button',
        tabIndex: 0,
        onClick: onClick,
        onKeyDown: handleKeyDown,
        onMouseEnter: () => setHovered(true),
        onMouseLeave: () => setHovered(false),
        onFocus: () => setFocused(true),
        onBlur: () => setFocused(false),
      }
    : {};

  // Compute styles while only applying hover/focus transforms when interactive.
  const baseBoxShadow = '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)';
  const hoverBoxShadow = '0 8px 32px rgba(0,0,0,0.10)';
  const focusRing = `0 0 0 4px ${t.borderHover}`;

  let boxShadow = baseBoxShadow;
  if (isInteractive && hovered) boxShadow = hoverBoxShadow;
  if (isInteractive && focused) boxShadow = `${focusRing}, ${boxShadow}`;

  const borderColor = isInteractive && hovered ? t.borderHover : t.border;
  const transform = isInteractive && hovered ? 'translateY(-4px)' : 'translateY(0)';

  return (
    <div
      {...interactiveProps}
      style={{
        width: '100%',
        textAlign: 'left',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflow: 'hidden',
        padding: '22px',
        borderRadius: '20px',
        border: `1.5px solid ${borderColor}`,
        background: '#ffffff',
        cursor: isInteractive ? 'pointer' : 'default',
        boxShadow,
        transform,
        transition: 'all 0.2s ease',
      }}
    >
      {info && (
        <div
          style={{ position: 'absolute', top: 10, right: 10 }}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <MetricInfo title={info.title} description={info.description} />
        </div>
      )}
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
          {Icon ? (
            React.isValidElement(Icon) ? (
              Icon
            ) : (
              React.createElement(Icon as React.ElementType, { size: 20, strokeWidth: 2 })
            )
          ) : (
            <span style={{ width: 12, height: 12, background: t.color, borderRadius: 6 }} />
          )}
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
        {displayLabel}
      </p>
    </div>
  );
};