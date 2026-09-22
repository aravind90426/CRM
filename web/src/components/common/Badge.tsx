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
    case 'PROSPECT':
    case 'INTERESTED':
      return <Badge variant="success">{outcome.toUpperCase() === 'PROSPECT' ? 'Prospect' : outcome}</Badge>;
    case 'ACCEPTANCE':
      return <Badge variant="primary">Acceptance</Badge>;
    case 'CONVERTED':
      return <Badge variant="success">{outcome}</Badge>;
    case 'FOLLOW_UP':
      return <Badge variant="warning">{outcome}</Badge>;
    case 'NOT_ATTENDED':
      return (
        <Badge variant="danger" showDot={false}>
          <span style={{ marginRight: '4px' }}>🔴</span> Not Attended
        </Badge>
      );
    case 'NOT_INTERESTED':
    case 'WRONG_NUMBER':
    case 'JUNK':
      return <Badge variant="danger">{outcome.toUpperCase() === 'JUNK' ? 'Junk' : outcome}</Badge>;
    default:
      return <Badge variant="secondary">{outcome}</Badge>;
  }
};

export const CallStatusBadge: React.FC<{ status?: string }> = ({ status }) => {
  if (!status) return null;

  switch (status.toUpperCase()) {
    case 'NOT_ATTENDED':
    case 'MISSED':
    case 'NO_ANSWER':
    case 'FAILED':
    case 'REJECTED':
      return (
        <Badge variant="danger" showDot={false}>
          <span style={{ marginRight: '4px' }}>🔴</span> Not Attended
        </Badge>
      );
    case 'JUNK':
      return <Badge variant="warning">Junk</Badge>;
    case 'ACCEPTANCE':
    case 'ACCEPTABLE':
      return <Badge variant="primary">Acceptance</Badge>;
    case 'PROSPECT':
      return <Badge variant="success">Prospect</Badge>;
    case 'CONNECTED':
      return <Badge variant="success">Connected</Badge>;
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
