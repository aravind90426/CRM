import React, { ReactNode } from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: ReactNode;
  variant?: 'primary' | 'success' | 'warning' | 'info' | 'danger';
  trend?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  variant = 'primary',
  trend,
}) => {
  const getGlowColor = () => {
    switch (variant) {
      case 'success': return 'var(--success-glow)';
      case 'warning': return 'rgba(245, 158, 11, 0.3)';
      case 'danger': return 'rgba(239, 68, 68, 0.3)';
      case 'info': return 'rgba(14, 165, 233, 0.3)';
      default: return 'var(--primary-glow)';
    }
  };

  const getIconColor = () => {
    switch (variant) {
      case 'success': return 'var(--success)';
      case 'warning': return 'var(--warning)';
      case 'danger': return 'var(--danger)';
      case 'info': return 'var(--info)';
      default: return 'var(--primary)';
    }
  };

  return (
    <div
      className="card stat-card"
      style={{
        position: 'relative',
        overflow: 'hidden',
        boxShadow: `0 4px 20px -2px ${getGlowColor()}`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {title}
          </div>
          <div style={{ fontSize: '1.875rem', fontWeight: 800, marginTop: '6px', color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
            {value}
          </div>
          {(subtitle || trend) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {trend && <span style={{ color: variant === 'danger' ? 'var(--danger)' : 'var(--success)', fontWeight: 600 }}>{trend}</span>}
              {subtitle && <span>{subtitle}</span>}
            </div>
          )}
        </div>
        <div
          style={{
            padding: '10px',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(255, 255, 255, 0.05)',
            color: getIconColor(),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {icon}
        </div>
      </div>
    </div>
  );
};
