import React from 'react';

interface BadgeProps {
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'secondary';
  children: React.ReactNode;
  showDot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({ variant = 'secondary', children, showDot = true }) => {
  return (
    <span className={`badge badge-${variant}`}>
      {showDot && <span className="badge-dot" />}
      {children}
    </span>
  );
};

export const StatusBadge: React.FC<{ status?: string }> = ({ status }) => {
  if (!status) return null;

  switch (status.toUpperCase()) {
    case 'NEW':
      return <Badge variant="info">{status}</Badge>;
    case 'CONTACTED':
    case 'IN_PROGRESS':
      return <Badge variant="primary">{status}</Badge>;
    case 'FOLLOW_UP':
      return <Badge variant="warning">{status}</Badge>;
    case 'CONVERTED':
      return <Badge variant="success">{status}</Badge>;
    case 'CLOSED':
      return <Badge variant="secondary">{status}</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
};

export const OutcomeBadge: React.FC<{ outcome?: string }> = ({ outcome }) => {
  if (!outcome) return <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>—</span>;

  switch (outcome.toUpperCase()) {
    case 'INTERESTED':
      return <Badge variant="primary">{outcome}</Badge>;
    case 'CONVERTED':
      return <Badge variant="success">{outcome}</Badge>;
    case 'FOLLOW_UP':
      return <Badge variant="warning">{outcome}</Badge>;
    case 'NOT_INTERESTED':
    case 'WRONG_NUMBER':
    case 'JUNK':
      return <Badge variant="danger">{outcome}</Badge>;
    default:
      return <Badge variant="secondary">{outcome}</Badge>;
  }
};

export const CallStatusBadge: React.FC<{ status?: string }> = ({ status }) => {
  if (!status) return null;

  switch (status.toUpperCase()) {
    case 'CONNECTED':
      return <Badge variant="success">{status}</Badge>;
    case 'MISSED':
      return <Badge variant="danger">{status}</Badge>;
    case 'NO_ANSWER':
      return <Badge variant="warning">{status}</Badge>;
    case 'BUSY':
      return <Badge variant="info">{status}</Badge>;
    case 'FAILED':
      return <Badge variant="danger">{status}</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
};

export const FollowUpStatusBadge: React.FC<{ status?: string; isOverdue?: boolean }> = ({ status, isOverdue }) => {
  if (isOverdue && status !== 'COMPLETED') {
    return <Badge variant="danger">OVERDUE</Badge>;
  }
  if (!status) return null;

  switch (status.toUpperCase()) {
    case 'COMPLETED':
      return <Badge variant="success">COMPLETED</Badge>;
    case 'PENDING':
      return <Badge variant="warning">PENDING</Badge>;
    case 'CANCELLED':
      return <Badge variant="secondary">CANCELLED</Badge>;
    case 'MISSED':
      return <Badge variant="danger">MISSED</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
};
