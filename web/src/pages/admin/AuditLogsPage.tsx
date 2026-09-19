import React, { useEffect, useState } from 'react';
import {
  FileText,
  Search,
  Clock,
  Shield,
  User,
  Filter,
} from 'lucide-react';
import { auditApi } from '../../api';
import { AuditLog } from '../../types';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { getErrorMessage } from '../../api/client';

export const AuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [entityFilter, setEntityFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');

  useEffect(() => {
    loadAuditLogs();
  }, [entityFilter, actionFilter]);

  const loadAuditLogs = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await auditApi.getAuditLogs({
        entityName: entityFilter || undefined,
        action: actionFilter || undefined,
        size: 50,
      });
      setLogs(data?.content || []);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const getActionBadge = (action: string) => {
    switch (action.toUpperCase()) {
      case 'CREATE':
        return <span className="badge badge-success">{action}</span>;
      case 'UPDATE':
      case 'OUTCOME_CHANGE':
        return <span className="badge badge-info">{action}</span>;
      case 'ASSIGN':
      case 'REASSIGN':
        return <span className="badge badge-primary">{action}</span>;
      case 'CONVERT':
        return <span className="badge badge-warning">{action}</span>;
      case 'DELETE':
        return <span className="badge badge-danger">{action}</span>;
      default:
        return <span className="badge badge-secondary">{action}</span>;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.03em' }}>
          System Audit Trail
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '2px' }}>
          Immutable activity stream recording entity creations, assignments, status transitions, and data modifications.
        </p>
      </div>

      {/* Filter Bar */}
      <div className="card" style={{ padding: '14px 20px', display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
        <select
          className="form-select"
          style={{ width: 'auto', minWidth: '160px' }}
          value={entityFilter}
          onChange={(e) => setEntityFilter(e.target.value)}
        >
          <option value="">All Entities</option>
          <option value="Lead">Lead</option>
          <option value="Project">Project</option>
          <option value="User">User</option>
          <option value="Call">Call</option>
          <option value="FollowUp">FollowUp</option>
          <option value="Sale">Sale</option>
          <option value="GoogleSheetsSync">GoogleSheetsSync</option>
        </select>

        <select
          className="form-select"
          style={{ width: 'auto', minWidth: '160px' }}
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
        >
          <option value="">All Actions</option>
          <option value="CREATE">Create</option>
          <option value="UPDATE">Update</option>
          <option value="ASSIGN">Assign</option>
          <option value="REASSIGN">Reassign</option>
          <option value="OUTCOME_CHANGE">Outcome Change</option>
          <option value="CONVERT">Convert</option>
          <option value="DELETE">Delete</option>
        </select>
      </div>

      {/* Logs Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {isLoading ? (
          <LoadingSpinner message="Retrieving historical audit stream..." />
        ) : error ? (
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--danger)' }}>{error}</div>
        ) : logs.length === 0 ? (
          <div style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted)' }}>
            No audit records found matching your filters.
          </div>
        ) : (
          <div className="table-container" style={{ border: 'none' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>User / Actor</th>
                  <th>Entity</th>
                  <th>Target ID</th>
                  <th>Action</th>
                  <th>Audit Details</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <User size={13} style={{ color: 'var(--primary)' }} />
                        <span style={{ fontWeight: 600 }}>{log.user?.name || 'System / Auto'}</span>
                      </div>
                    </td>
                    <td>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{log.entityName}</span>
                    </td>
                    <td style={{ fontFamily: 'monospace', color: 'var(--text-muted)' }}>#{log.entityId}</td>
                    <td>{getActionBadge(log.action)}</td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', maxWidth: '400px' }}>
                      {log.newValue || log.oldValue || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
