import React, { useEffect, useState } from 'react';
import {
  Sheet,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  Database,
  ShieldAlert,
  ArrowRight,
} from 'lucide-react';
import { sheetsApi } from '../../api';
import { GoogleSheetsSyncLog } from '../../types';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { getErrorMessage } from '../../api/client';

export const GoogleSheetsPage: React.FC = () => {
  const [history, setHistory] = useState<GoogleSheetsSyncLog[]>([]);
  const [latestStatus, setLatestStatus] = useState<GoogleSheetsSyncLog | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    loadSyncData();
  }, []);

  const loadSyncData = async () => {
    setIsLoading(true);
    try {
      const [statusRes, historyRes] = await Promise.all([
        sheetsApi.getSyncStatus(),
        sheetsApi.getSyncHistory({ size: 20 }),
      ]);
      setLatestStatus(statusRes);
      setHistory(historyRes?.content || []);
    } catch (err) {
      setFeedback({ type: 'error', message: getErrorMessage(err) });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTriggerSync = async () => {
    setIsSyncing(true);
    setFeedback(null);
    try {
      const result = await sheetsApi.triggerSync();
      setFeedback({
        type: 'success',
        message: `Synchronization completed successfully! Synchronized ${result.recordsSynced} records to Google Sheets.`,
      });
      loadSyncData();
    } catch (err) {
      setFeedback({ type: 'error', message: getErrorMessage(err) });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.03em' }}>
          Google Sheets Synchronization
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '2px' }}>
          Admin-only controlled data sync console. MySQL database remains the authoritative primary source of truth.
        </p>
      </div>

      {feedback && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: 'var(--radius-md)',
            background: feedback.type === 'success' ? 'var(--success-light)' : 'var(--danger-light)',
            color: feedback.type === 'success' ? '#6ee7b7' : '#fca5a5',
            border: `1px solid ${feedback.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '0.875rem',
          }}
        >
          {feedback.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Sync Control Card */}
      <div
        className="card"
        style={{
          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(15, 23, 42, 0.8) 100%)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '20px',
          padding: '28px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
          <div
            style={{
              width: '54px',
              height: '54px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 15px var(--success-glow)',
            }}
          >
            <Sheet size={28} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Controlled Google Sheets Sync</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '4px', maxWidth: '520px' }}>
              Pushes live lead demographics, ownership assignment trails, and conversion records into your configured external Google Spreadsheet.
            </p>
          </div>
        </div>

        <button
          id="trigger-google-sheets-sync-btn"
          onClick={handleTriggerSync}
          disabled={isSyncing}
          className="btn btn-success btn-lg"
          style={{ minWidth: '220px' }}
        >
          <RefreshCw size={18} className={isSyncing ? 'animate-spin' : ''} />
          <span>{isSyncing ? 'Synchronizing CRM...' : 'Sync to Google Sheets'}</span>
        </button>
      </div>

      {/* Architecture & Truth Banner */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '14px',
        }}
      >
        <div className="card" style={{ padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary)', fontWeight: 700, marginBottom: '6px' }}>
            <Database size={18} />
            <span>Primary Source of Truth</span>
          </div>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
            MySQL is the authoritative repository. All mutations occur within transactional database boundaries before any export occurs.
          </p>
        </div>

        <div className="card" style={{ padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ec4899', fontWeight: 700, marginBottom: '6px' }}>
            <ShieldAlert size={18} />
            <span>Admin-Only Security Guard</span>
          </div>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
            Normal sales users are strictly denied access via Spring Security role checks (`@PreAuthorize("hasRole('ADMIN')")`).
          </p>
        </div>
      </div>

      {/* Historical Sync Executions */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 700 }}>Synchronization History</h3>
        </div>

        {isLoading ? (
          <LoadingSpinner message="Loading sync history..." />
        ) : history.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
            No synchronization runs recorded yet.
          </div>
        ) : (
          <div className="table-container" style={{ border: 'none' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Triggered By</th>
                  <th>Status</th>
                  <th>Records Synced</th>
                  <th>Status Message</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.id}>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>
                      {new Date(h.startedAt).toLocaleString()}
                    </td>
                    <td>
                      <span style={{ fontWeight: 600 }}>{h.triggeredBy?.name || 'Administrator'}</span>
                    </td>
                    <td>
                      <span className={`badge ${h.status === 'SUCCESS' ? 'badge-success' : 'badge-danger'}`}>
                        <span className="badge-dot" />
                        {h.status}
                      </span>
                    </td>
                    <td style={{ fontWeight: 700 }}>{h.recordsSynced} rows</td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>
                      {h.errorMessage || 'Exported successfully to Google Drive'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  );
};
