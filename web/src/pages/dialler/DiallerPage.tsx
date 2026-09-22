import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  PhoneCall,
  PhoneOff,
  Clock,
  User,
  Phone,
  Briefcase,
  CalendarCheck,
  CheckCircle2,
  AlertCircle,
  Play,
  Square,
  ArrowRight,
} from 'lucide-react';
import { leadsApi, callsApi, followUpsApi } from '../../api';
import { LeadSummary, LeadDetail } from '../../types';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { StatusBadge, OutcomeBadge } from '../../components/common/Badge';
import { getErrorMessage } from '../../api/client';

export const DiallerPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [leads, setLeads] = useState<LeadSummary[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState<number | null>(() => {
    const lId = searchParams.get('leadId');
    return lId ? Number(lId) : null;
  });
  const [selectedLead, setSelectedLead] = useState<LeadDetail | null>(null);

  // Call Workflow State
  const [isCalling, setIsCalling] = useState(false);
  const [callStartTime, setCallStartTime] = useState<Date | null>(null);
  const [callDuration, setCallDuration] = useState(0); // in seconds
  const timerRef = useRef<number | null>(null);

  // Form State
  const [notes, setNotes] = useState('');

  const [isLoadingLeads, setIsLoadingLeads] = useState(true);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    loadLeads();
  }, []);

  useEffect(() => {
    if (selectedLeadId) {
      loadLeadDetail(selectedLeadId);
    }
  }, [selectedLeadId]);

  // Live Timer
  useEffect(() => {
    if (isCalling) {
      timerRef.current = window.setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isCalling]);

  const loadLeads = async () => {
    setIsLoadingLeads(true);
    try {
      const data = await leadsApi.getLeads({ size: 50 });
      setLeads(data.content);
      if (!selectedLeadId && data.content.length > 0) {
        setSelectedLeadId(data.content[0].id);
      }
    } catch (err) {
      setFeedback({ type: 'error', message: getErrorMessage(err) });
    } finally {
      setIsLoadingLeads(false);
    }
  };

  const loadLeadDetail = async (leadId: number) => {
    setIsLoadingDetail(true);
    try {
      const data = await leadsApi.getLeadById(leadId);
      setSelectedLead(data);
    } catch (err) {
      console.error('Failed to load selected lead', err);
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const handleStartCall = () => {
    setIsCalling(true);
    setCallStartTime(new Date());
    setCallDuration(0);
    setFeedback(null);
  };

  const handleEndCall = async () => {
    setIsCalling(false);
    const duration = callDuration;
    const start = callStartTime || new Date();
    const end = new Date();
    const leadId = selectedLeadId;

    if (!leadId && !selectedLead) {
      setCallDuration(0);
      setCallStartTime(null);
      return;
    }

    try {
      setIsSaving(true);
      await callsApi.logCall({
        leadId: leadId || undefined,
        phoneNumber: selectedLead?.phone,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        durationSeconds: duration,
        isConnected: duration > 0,
        notes: notes.trim() || undefined,
      });

      setFeedback({
        type: 'success',
        message: `Call ended and automatically logged! Status calculated from duration (${formatTimer(duration)}).`,
      });

      // Reset timer and notes
      setCallDuration(0);
      setCallStartTime(null);
      setNotes('');

      // Refresh lead details
      if (leadId) {
        loadLeadDetail(leadId);
      }
    } catch (err) {
      setFeedback({ type: 'error', message: getErrorMessage(err) });
    } finally {
      setIsSaving(false);
    }
  };

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Page Title */}
      <div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.03em' }}>
          Dialler + Call Logger
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '2px' }}>
          Interactive sales dialler console. Track call duration, record status, log business outcomes, and schedule follow-ups.
        </p>
      </div>

      {feedback && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: 'var(--radius-md)',
            background: feedback.type === 'success' ? 'var(--success-light)' : 'var(--danger-light)',
            border: `1px solid ${feedback.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
            color: feedback.type === 'success' ? '#6ee7b7' : '#fca5a5',
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

      {/* Main Grid: Left Column (Lead Selector & Customer Profile) - Right Column (Live Call Timer & Logging Form) */}
      <div className="grid-cols-2">
        {/* Left Column: Lead Selector & Customer Demographics */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Lead Picker */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">Select Customer Lead</div>
              <User size={18} style={{ color: 'var(--primary)' }} />
            </div>

            {isLoadingLeads ? (
              <LoadingSpinner message="Loading assigned leads..." size={24} />
            ) : leads.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                No leads available in your queue.
              </div>
            ) : (
              <div className="form-group" style={{ margin: 0 }}>
                <select
                  id="dialler-lead-select"
                  className="form-select"
                  value={selectedLeadId || ''}
                  onChange={(e) => setSelectedLeadId(Number(e.target.value))}
                >
                  {leads.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name} — {l.phone} ({l.projectName || l.project?.name || '—'})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Customer Profile Card */}
          {selectedLead && (
            <div className="card" style={{ flex: 1 }}>
              <div className="card-header">
                <div className="card-title">Customer Snapshot</div>
                <button
                  onClick={() => navigate(`/leads/${selectedLead.id}`)}
                  className="btn btn-ghost btn-sm"
                  style={{ color: 'var(--primary)', fontSize: '0.75rem' }}
                >
                  <span>Full History</span>
                  <ArrowRight size={13} />
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '0.875rem' }}>
                <div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                    {selectedLead.name}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    <Briefcase size={14} />
                    <span>{selectedLead.projectName || selectedLead.project?.name || '—'}</span>
                  </div>
                </div>

                <div
                  style={{
                    padding: '12px 14px',
                    background: 'rgba(255, 255, 255, 0.03)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Phone size={16} style={{ color: 'var(--primary)' }} />
                    <a
                      href={`tel:${selectedLead.phone}`}
                      style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--primary)', letterSpacing: '0.02em' }}
                    >
                      {selectedLead.phone}
                    </a>
                  </div>
                  <StatusBadge status={selectedLead.status} />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Current Owner:</span>
                  <span style={{ fontWeight: 700 }}>{selectedLead.currentOwner?.name || 'Unassigned'}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Previous Calls:</span>
                  <span style={{ fontWeight: 700 }}>{selectedLead.callSummary.totalCalls} ({selectedLead.callSummary.connectedCalls} connected)</span>
                </div>

                {selectedLead.additionalInfo && (
                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', background: 'rgba(255, 255, 255, 0.02)', padding: '8px 12px', borderRadius: 'var(--radius-sm)' }}>
                    "{selectedLead.additionalInfo}"
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Live Call Timer & Interaction Form */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Live Call Console */}
          <div
            style={{
              padding: '24px',
              background: isCalling
                ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(16, 185, 129, 0.15) 100%)'
                : 'rgba(15, 23, 42, 0.6)',
              border: `1px solid ${isCalling ? 'rgba(99, 102, 241, 0.5)' : 'var(--border-subtle)'}`,
              borderRadius: 'var(--radius-lg)',
              textAlign: 'center',
              boxShadow: isCalling ? '0 0 25px var(--primary-glow)' : 'none',
              transition: 'var(--transition)',
            }}
          >
            <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: isCalling ? '#34d399' : 'var(--text-muted)', marginBottom: '8px' }}>
              {isCalling ? '● Live Call in Progress' : 'Telephony Timer Console'}
            </div>

            <div
              id="live-call-timer-display"
              style={{
                fontSize: '3.5rem',
                fontWeight: 900,
                fontFamily: 'monospace',
                color: isCalling ? '#fff' : 'var(--text-secondary)',
                letterSpacing: '0.05em',
                marginBottom: '16px',
              }}
            >
              {formatTimer(callDuration)}
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '14px' }}>
              {!isCalling ? (
                <button
                  id="start-call-timer-btn"
                  type="button"
                  onClick={handleStartCall}
                  className="btn btn-success btn-lg"
                  disabled={!selectedLeadId}
                  style={{ minWidth: '160px' }}
                >
                  <Play size={18} />
                  <span>Start Call</span>
                </button>
              ) : (
                <button
                  id="end-call-timer-btn"
                  type="button"
                  onClick={handleEndCall}
                  className="btn btn-danger btn-lg"
                  style={{ minWidth: '160px' }}
                >
                  <Square size={18} />
                  <span>End Call</span>
                </button>
              )}
            </div>
          </div>

          {/* Call Discussion Notes */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className="form-group">
              <label className="form-label">Discussion Notes (Optional)</label>
              <textarea
                id="dialler-call-notes"
                className="form-textarea"
                placeholder="Type client notes, questions or feedback while on call..."
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <div
              style={{
                padding: '12px 16px',
                background: 'rgba(59, 130, 246, 0.05)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid rgba(59, 130, 246, 0.2)',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                fontSize: '0.8125rem',
                color: 'var(--text-secondary)',
              }}
            >
              <span style={{ fontSize: '1.25rem' }}>⚡</span>
              <div>
                <strong style={{ color: 'var(--text-primary)' }}>Automatic Call Status Active:</strong> When the call ends, the status (Not Attended, Junk, Acceptance, Prospect) is calculated and saved automatically without manual selection.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
