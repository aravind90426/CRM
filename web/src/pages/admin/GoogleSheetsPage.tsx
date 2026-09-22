import React, { useEffect, useState } from 'react';
import {
  FileSpreadsheet,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  Database,
  ShieldAlert,
  Users,
  Briefcase,
  UserCheck,
  PhoneCall,
  CalendarCheck,
  TrendingUp,
  Layers,
  History,
} from 'lucide-react';
import { sheetsApi } from '../../api';
import { GoogleSheetsSyncLog, GoogleSheetsSyncSummary } from '../../types';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { getErrorMessage } from '../../api/client';

export const GoogleSheetsPage: React.FC = () => {
  const [history, setHistory] = useState<GoogleSheetsSyncLog[]>([]);
  const [latestStatus, setLatestStatus] = useState<GoogleSheetsSyncLog | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    loadSyncData();
  }, []);

  const loadSyncData = async () => {
    setIsLoading(true);
    setFeedback(null);
    try {
      const [statusRes, historyRes] = await Promise.all([
        sheetsApi.getSyncStatus(),
        sheetsApi.getSyncHistory({ size: 50 }),
      ]);
      setLatestStatus(statusRes);
      setHistory(historyRes?.content || []);
    } catch (err) {
      setFeedback({ type: 'error', message: getErrorMessage(err) });
    } finally {
      setIsLoading(false);
    }
  };

  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return 'Never';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch (e) {
      return dateStr;
    }
  };

  const summary: GoogleSheetsSyncSummary = latestStatus?.summary || {
    users: latestStatus?.usersCount || 0,
    projects: latestStatus?.projectsCount || 0,
    leads: latestStatus?.leadsCount || 0,
    assignments: latestStatus?.assignmentsCount || 0,
    calls: latestStatus?.callsCount || 0,
    followUps: latestStatus?.followupsCount || 0,
    sales: latestStatus?.salesCount || 0,
  };

  const metricCards = [
    { label: 'Users', count: summary.users, icon: <Users size={18} color="#38bdf8" />, bg: 'rgba(56, 189, 248, 0.1)' },
    { label: 'Projects', count: summary.projects, icon: <Briefcase size={18} color="#a855f7" />, bg: 'rgba(168, 85, 247, 0.1)' },
    { label: 'Leads', count: summary.leads, icon: <Layers size={18} color="#34d399" />, bg: 'rgba(52, 211, 153, 0.1)' },
    { label: 'Assignments', count: summary.assignments, icon: <UserCheck size={18} color="#fbbf24" />, bg: 'rgba(251, 191, 36, 0.1)' },
    { label: 'Calls', count: summary.calls, icon: <PhoneCall size={18} color="#f472b6" />, bg: 'rgba(244, 114, 182, 0.1)' },
    { label: 'Follow Ups', count: summary.followUps, icon: <CalendarCheck size={18} color="#60a5fa" />, bg: 'rgba(96, 165, 250, 0.1)' },
    { label: 'Sales', count: summary.sales, icon: <TrendingUp size={18} color="#4ade80" />, bg: 'rgba(74, 222, 128, 0.1)' },
  ];

  const hasHistory = history.length > 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.03em', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <History size={26} color="var(--primary)" />
            Google Sync History
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '3px' }}>
            Read-only audit log and execution history of database synchronizations with Google Sheets.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={loadSyncData}
            disabled={isLoading}
            className="btn btn-outline btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.75rem',
            padding: '4px 10px',
            borderRadius: '12px',
            background: 'rgba(16, 185, 129, 0.15)',
            color: '#34d399',
            fontWeight: 700,
            border: '1px solid rgba(16, 185, 129, 0.3)',
          }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} />
            ADMIN AUDIT TRAIL
          </span>
        </div>
      </div>

      {/* Feedback Alerts */}
      {feedback && (
        <div
          style={{
            padding: '14px 18px',
            borderRadius: 'var(--radius-md)',
            background: feedback.type === 'success' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
            color: feedback.type === 'success' ? '#6ee7b7' : '#fca5a5',
            border: `1px solid ${feedback.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            fontSize: '0.9rem',
          }}
        >
          {feedback.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
          <span style={{ fontWeight: 500 }}>{feedback.message}</span>
        </div>
      )}

      {/* Latest Sync Status Banner (Only if applicable) */}
      {latestStatus && latestStatus.id && (
        <div
          className="card"
          style={{
            background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.95) 100%)',
            border: '1px solid var(--border-subtle)',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)',
          }}
        >
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  background: latestStatus.status === 'SUCCESS' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                  color: latestStatus.status === 'SUCCESS' ? '#10b981' : '#f87171',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <FileSpreadsheet size={26} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>Latest Synchronization Status</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', marginTop: '2px' }}>
                  {latestStatus.errorMessage || (latestStatus.status === 'SUCCESS' ? 'CRM database synchronized cleanly with Google Sheets.' : 'Synchronization details')}
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock size={16} color="var(--text-muted)" />
                <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                  Timestamp:{' '}
                  <strong style={{ color: 'var(--text-primary)' }}>
                    {formatDateTime(latestStatus.completedAt || latestStatus.startedAt)}
                  </strong>
                </span>
              </div>

              <span
                className={`badge ${
                  latestStatus.status === 'SUCCESS'
                    ? 'badge-success'
                    : latestStatus.status === 'IN_PROGRESS'
                    ? 'badge-warning'
                    : 'badge-danger'
                }`}
              >
                <span className="badge-dot" />
                {latestStatus.status === 'SUCCESS' ? 'Successful' : latestStatus.status}
              </span>

              {latestStatus.recordsSynced !== undefined && (
                <span style={{ fontSize: '0.8125rem', color: '#10b981', fontWeight: 700 }}>
                  {latestStatus.recordsSynced} records synced
                </span>
              )}
            </div>
          </div>

          {/* Metric Breakdown Cards */}
          <div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                gap: '10px',
              }}
            >
              {metricCards.map((m, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '12px 14px',
                    borderRadius: '10px',
                    background: 'rgba(15, 23, 42, 0.6)',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{m.label}</span>
                    <div style={{ padding: '4px', borderRadius: '6px', background: m.bg }}>
                      {m.icon}
                    </div>
                  </div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                    {m.count.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Synchronization Execution History Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 700 }}>Synchronization History (Sync Log)</h3>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Historical sync audit records from database table <code style={{ color: '#10b981' }}>google_sheets_sync_logs</code>
            </p>
          </div>

          <button
            onClick={loadSyncData}
            disabled={isLoading}
            className="btn btn-outline btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>

        {isLoading ? (
          <LoadingSpinner message="Loading synchronization records..." />
        ) : !hasHistory ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <FileSpreadsheet size={40} style={{ opacity: 0.3, margin: '0 auto 12px' }} />
            <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px' }}>
              No Synchronization History
            </h4>
            <p style={{ fontSize: '0.85rem', maxWidth: '420px', margin: '0 auto' }}>
              No synchronization operations have been logged yet. Any Push or Pull operations triggered from Google Sheets will be audited and displayed here.
            </p>
          </div>
        ) : (
          <div className="table-container" style={{ border: 'none' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Sync Code</th>
                  <th>Triggered By</th>
                  <th>Status</th>
                  <th>Records</th>
                  <th>Breakdown (U / P / L / A / C / F / S)</th>
                  <th>Message</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.id}>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', whiteSpace: 'nowrap' }}>
                      {formatDateTime(h.startedAt)}
                    </td>
                    <td>
                      <span style={{ fontFamily: 'monospace', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                        {h.syncCode || h.syncId || `SYNC-${h.id}`}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 600 }}>{h.triggeredBy?.name || 'Admin'}</span>
                    </td>
                    <td>
                      <span className={`badge ${h.status === 'SUCCESS' ? 'badge-success' : 'badge-danger'}`}>
                        <span className="badge-dot" />
                        {h.status}
                      </span>
                    </td>
                    <td style={{ fontWeight: 700, color: '#10b981', whiteSpace: 'nowrap' }}>
                      {h.recordsSynced || 0} rows
                    </td>
                    <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                      <span title="Users">{h.usersCount || 0}u</span> /{' '}
                      <span title="Projects">{h.projectsCount || 0}p</span> /{' '}
                      <span title="Leads">{h.leadsCount || 0}l</span> /{' '}
                      <span title="Assignments">{h.assignmentsCount || 0}a</span> /{' '}
                      <span title="Calls">{h.callsCount || 0}c</span> /{' '}
                      <span title="Follow Ups">{h.followupsCount || 0}f</span> /{' '}
                      <span title="Sales">{h.salesCount || 0}s</span>
                    </td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', maxWidth: '300px' }}>
                      {h.errorMessage ? (
                        <span style={{ color: '#f87171' }}>{h.errorMessage}</span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>Synchronized cleanly</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Informational Notes */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '16px',
        }}
      >
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--primary)', fontWeight: 700, marginBottom: '8px' }}>
            <Database size={20} />
            <span style={{ fontSize: '1rem' }}>MySQL Database — Source of Truth</span>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
            All operations take place inside MySQL first. Google Sheets synchronizations are recorded here as an audit trail for data integrity and monitoring.
          </p>
        </div>

        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#ec4899', fontWeight: 700, marginBottom: '8px' }}>
            <ShieldAlert size={20} />
            <span style={{ fontSize: '1rem' }}>Secure Audit Logging</span>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
            Each push and pull event logs timestamps, record counts per entity, triggered user, and error descriptions if any sync phase encounters validation issues.
          </p>
        </div>
      </div>
    </div>
  );
};
