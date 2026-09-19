import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PhoneCall,
  PhoneForwarded,
  Clock,
  User,
  Calendar,
  Search,
  ExternalLink,
} from 'lucide-react';
import { callsApi } from '../../api';
import { Call } from '../../types';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { CallStatusBadge, OutcomeBadge } from '../../components/common/Badge';
import { getErrorMessage } from '../../api/client';

export const CallsHistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const [calls, setCalls] = useState<Call[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCalls();
  }, []);

  const loadCalls = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await callsApi.getCalls({ size: 100 });
      setCalls(data?.content || []);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.03em' }}>
            Organization Call Logs
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '2px' }}>
            Complete historical audit of all employee customer conversations and telephony metrics.
          </p>
        </div>

        <button
          onClick={() => navigate('/dialler')}
          className="btn btn-primary btn-md"
        >
          <PhoneCall size={18} />
          <span>Launch Dialler</span>
        </button>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {isLoading ? (
          <LoadingSpinner message="Retrieving call logs..." />
        ) : error ? (
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--danger)' }}>{error}</div>
        ) : calls.length === 0 ? (
          <div style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted)' }}>
            No calls recorded yet in the system.
          </div>
        ) : (
          <div className="table-container" style={{ border: 'none' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Customer / Lead</th>
                  <th>Caller / Employee</th>
                  <th>Duration</th>
                  <th>Call Status</th>
                  <th>Business Outcome</th>
                  <th>Discussion Notes</th>
                </tr>
              </thead>
              <tbody>
                {calls.map((c) => (
                  <tr key={c.id}>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>
                      {new Date(c.startTime).toLocaleString()}
                    </td>
                    <td>
                      {c.leadId ? (
                        <button
                          onClick={() => navigate(`/leads/${c.leadId}`)}
                          className="btn btn-ghost btn-sm"
                          style={{ padding: '4px 8px', fontWeight: 600, color: 'var(--primary)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        >
                          <span>{c.leadName || `Lead #${c.leadId}`}</span>
                          <ExternalLink size={12} />
                        </button>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>—</span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <User size={14} style={{ color: 'var(--primary)' }} />
                        <span style={{ fontWeight: 700 }}>{c.user?.name}</span>
                      </div>
                    </td>
                    <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{c.formattedDuration}</td>
                    <td><CallStatusBadge status={c.callStatus} /></td>
                    <td><OutcomeBadge outcome={c.businessOutcome} /></td>
                    <td style={{ color: 'var(--text-secondary)', maxWidth: '350px' }}>
                      {c.notes || '—'}
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
