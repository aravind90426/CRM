import React, { useState, useEffect } from 'react';
import {
  Settings,
  Lock,
  User,
  Shield,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  LogOut,
  FileSpreadsheet,
  Clock,
  ArrowRight,
  Send,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { authApi, sheetsApi, shiftsApi } from '../../api';
import { getErrorMessage } from '../../api/client';
import { GoogleSheetsSyncLog, GoogleSheetsSyncSummary, ShiftChangeRequest, ShiftOption } from '../../types';
import { Modal } from '../../components/common/Modal';

export const SettingsPage: React.FC = () => {
  const { user, isAdmin, logout, refreshUser } = useAuth();
  const navigate = useNavigate();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Shift Change Request state
  const [shiftRequests, setShiftRequests] = useState<ShiftChangeRequest[]>([]);
  const [availableShifts, setAvailableShifts] = useState<ShiftOption[]>([]);
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [selectedShift, setSelectedShift] = useState('SHIFT_0930_1830');
  const [shiftReason, setShiftReason] = useState('');
  const [shiftModalError, setShiftModalError] = useState<string | null>(null);
  const [isShiftSubmitting, setIsShiftSubmitting] = useState(false);

  // Google Sheets Sync status (Admin only)
  const [syncStatus, setSyncStatus] = useState<GoogleSheetsSyncLog | null>(null);

  useEffect(() => {
    loadShiftData();
    if (isAdmin) {
      loadSyncStatus();
    }
  }, [isAdmin]);

  const loadShiftData = async () => {
    try {
      const [shifts, myRequests] = await Promise.all([
        shiftsApi.getAvailableShifts(),
        shiftsApi.getMyShiftRequests(),
      ]);
      setAvailableShifts(shifts || []);
      setShiftRequests(myRequests || []);
    } catch (e) {
      // Non-blocking
    }
  };

  const loadSyncStatus = async () => {
    try {
      const res = await sheetsApi.getSyncStatus();
      setSyncStatus(res);
    } catch (e) {
      // Non-blocking
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setFeedback({ type: 'error', message: 'New passwords do not match.' });
      return;
    }
    if (newPassword.length < 6) {
      setFeedback({ type: 'error', message: 'New password must be at least 6 characters.' });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);
    try {
      await authApi.changePassword({ currentPassword, newPassword });
      setFeedback({ type: 'success', message: 'Password updated successfully!' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setFeedback({ type: 'error', message: getErrorMessage(err) });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = async () => {
    if (window.confirm('Are you sure you want to sign out of your account?')) {
      try {
        await logout();
      } catch (e) {
        console.warn('Logout error:', e);
      }
      navigate('/login', { replace: true });
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
      });
    } catch (e) {
      return dateStr;
    }
  };

  const summary: GoogleSheetsSyncSummary = syncStatus?.summary || {
    users: syncStatus?.usersCount || 0,
    projects: syncStatus?.projectsCount || 0,
    leads: syncStatus?.leadsCount || 0,
    assignments: syncStatus?.assignmentsCount || 0,
    calls: syncStatus?.callsCount || 0,
    followUps: syncStatus?.followupsCount || 0,
    sales: syncStatus?.salesCount || 0,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '800px' }}>
      <div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.03em' }}>
          Account Settings
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '2px' }}>
          Manage your personal security credentials, profile, and system configurations.
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

      {/* Profile Overview Card */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">Profile Information</div>
          <User size={18} style={{ color: 'var(--primary)' }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Full Name</div>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>{user?.name}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Email Address</div>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>{user?.email}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>System Role</div>
            <div style={{ marginTop: '4px' }}>
              <span className={`badge ${isAdmin ? 'badge-primary' : 'badge-neutral'}`}>
                {isAdmin ? 'ADMINISTRATOR' : 'CALLING AGENT'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Work Shift Card */}
      <div className="card">
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock size={18} style={{ color: 'var(--primary)' }} />
            <div className="card-title">Work Shift</div>
          </div>
          <button
            id="request-shift-change-btn"
            onClick={() => {
              setShiftModalError(null);
              setIsShiftModalOpen(true);
            }}
            disabled={shiftRequests.some((r) => r.status === 'PENDING')}
            className="btn btn-outline btn-sm"
            style={{ fontSize: '0.8125rem' }}
          >
            {shiftRequests.some((r) => r.status === 'PENDING') ? 'Shift Change Pending' : 'Request Shift Change'}
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginTop: '12px' }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Current Assigned Shift</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>{user?.shiftDisplayName || '10:00 AM – 07:00 PM'}</span>
            </div>
          </div>

          {shiftRequests.length > 0 && (
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Latest Request Status</div>
              <div style={{ marginTop: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  className={`badge ${
                    shiftRequests[0].status === 'APPROVED'
                      ? 'badge-success'
                      : shiftRequests[0].status === 'PENDING'
                      ? 'badge-warning'
                      : 'badge-danger'
                  }`}
                >
                  {shiftRequests[0].status === 'PENDING' ? 'Pending Admin Approval' : shiftRequests[0].status}
                </span>
                <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                  (Target: {shiftRequests[0].requestedShiftDisplayName})
                </span>
              </div>
            </div>
          )}
        </div>

        {shiftRequests.some((r) => r.status === 'PENDING') && (
          <div style={{ marginTop: '14px', padding: '10px 14px', background: 'rgba(234, 179, 8, 0.1)', border: '1px solid rgba(234, 179, 8, 0.3)', borderRadius: 'var(--radius-sm)', fontSize: '0.8125rem', color: '#fde047' }}>
            A shift change request to <strong>{shiftRequests.find((r) => r.status === 'PENDING')?.requestedShiftDisplayName}</strong> is currently pending administrator review.
          </div>
        )}
      </div>

      {/* Request Shift Change Modal */}
      <Modal
        isOpen={isShiftModalOpen}
        onClose={() => setIsShiftModalOpen(false)}
        title="Request Shift Change"
      >
        {shiftModalError && (
          <div style={{ padding: '10px 14px', background: 'var(--danger-light)', color: '#fca5a5', borderRadius: 'var(--radius-md)', marginBottom: '16px', fontSize: '0.8125rem' }}>
            {shiftModalError}
          </div>
        )}
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setShiftModalError(null);
            setIsShiftSubmitting(true);
            try {
              await shiftsApi.createShiftChangeRequest({
                requestedShift: selectedShift,
                reason: shiftReason || undefined,
              });
              setIsShiftModalOpen(false);
              setShiftReason('');
              await loadShiftData();
              if (refreshUser) await refreshUser();
            } catch (err) {
              setShiftModalError(getErrorMessage(err));
            } finally {
              setIsShiftSubmitting(false);
            }
          }}
        >
          <div className="form-group">
            <label className="form-label">Current Shift</label>
            <input
              type="text"
              className="form-input"
              value={user?.shiftDisplayName || '10:00 AM – 07:00 PM'}
              disabled
              style={{ opacity: 0.7 }}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Requested Work Shift *</label>
            <select
              id="requested-shift-select"
              className="form-select"
              value={selectedShift}
              onChange={(e) => setSelectedShift(e.target.value)}
              required
            >
              {availableShifts.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.displayName} {s.isDefault ? '(Default)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Reason for Request (Optional)</label>
            <textarea
              id="shift-reason-input"
              className="form-input"
              rows={3}
              placeholder="e.g. Requesting morning shift to align with commute schedule..."
              value={shiftReason}
              onChange={(e) => setShiftReason(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
            <button type="button" onClick={() => setIsShiftModalOpen(false)} className="btn btn-secondary btn-sm">Cancel</button>
            <button id="submit-shift-request-btn" type="submit" className="btn btn-primary btn-sm" disabled={isShiftSubmitting}>
              {isShiftSubmitting ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ADMIN-ONLY GOOGLE SHEETS SYNC SECTION */}
      {isAdmin && (
        <div
          className="card"
          style={{
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.07) 0%, rgba(15, 23, 42, 0.9) 100%)',
            border: '1px solid rgba(16, 185, 129, 0.35)',
            padding: '24px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '10px',
                  background: 'rgba(16, 185, 129, 0.15)',
                  color: '#10b981',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <FileSpreadsheet size={22} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>Google Sync History</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>
                  View synchronization records and history of CRM data into external Google Sheets.
                </p>
              </div>
            </div>

            <button
              onClick={() => navigate('/admin/google-sheets')}
              className="btn btn-outline btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <span>View Sync History</span>
              <ArrowRight size={14} />
            </button>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '12px',
              padding: '14px',
              background: 'rgba(15, 23, 42, 0.6)',
              borderRadius: '10px',
              border: '1px solid var(--border-subtle)',
              marginBottom: '18px',
            }}
          >
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Last Sync</div>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
                {formatDateTime(syncStatus?.completedAt || syncStatus?.startedAt)}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Status</div>
              <div style={{ marginTop: '4px' }}>
                <span className={`badge ${syncStatus?.status === 'SUCCESS' ? 'badge-success' : 'badge-neutral'}`}>
                  {syncStatus?.status === 'SUCCESS' ? 'Successful' : syncStatus?.status || 'IDLE'}
                </span>
              </div>
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, marginBottom: '8px' }}>
              Records Synced
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              <span className="badge badge-neutral" style={{ padding: '6px 10px', fontSize: '0.8rem' }}>
                Users: <strong style={{ color: 'var(--text-primary)', marginLeft: '4px' }}>{summary.users}</strong>
              </span>
              <span className="badge badge-neutral" style={{ padding: '6px 10px', fontSize: '0.8rem' }}>
                Projects: <strong style={{ color: 'var(--text-primary)', marginLeft: '4px' }}>{summary.projects}</strong>
              </span>
              <span className="badge badge-neutral" style={{ padding: '6px 10px', fontSize: '0.8rem' }}>
                Leads: <strong style={{ color: 'var(--text-primary)', marginLeft: '4px' }}>{summary.leads}</strong>
              </span>
              <span className="badge badge-neutral" style={{ padding: '6px 10px', fontSize: '0.8rem' }}>
                Assignments: <strong style={{ color: 'var(--text-primary)', marginLeft: '4px' }}>{summary.assignments}</strong>
              </span>
              <span className="badge badge-neutral" style={{ padding: '6px 10px', fontSize: '0.8rem' }}>
                Calls: <strong style={{ color: 'var(--text-primary)', marginLeft: '4px' }}>{summary.calls}</strong>
              </span>
              <span className="badge badge-neutral" style={{ padding: '6px 10px', fontSize: '0.8rem' }}>
                Follow Ups: <strong style={{ color: 'var(--text-primary)', marginLeft: '4px' }}>{summary.followUps}</strong>
              </span>
              <span className="badge badge-neutral" style={{ padding: '6px 10px', fontSize: '0.8rem' }}>
                Sales: <strong style={{ color: 'var(--text-primary)', marginLeft: '4px' }}>{summary.sales}</strong>
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Password Reset Form Card */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">Change Password</div>
          <KeyRound size={18} style={{ color: 'var(--primary)' }} />
        </div>

        <form onSubmit={handleChangePassword}>
          <div className="form-group" style={{ marginBottom: '14px' }}>
            <label className="form-label">Current Password</label>
            <input
              type="password"
              className="form-input"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div className="form-group">
              <label className="form-label">New Password</label>
              <input
                type="password"
                className="form-input"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Confirm New Password</label>
              <input
                type="password"
                className="form-input"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
            <button
              type="submit"
              className="btn btn-primary btn-md"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Updating...' : 'Change Password'}
            </button>
          </div>
        </form>
      </div>

      {/* Session Management & Logout Card */}
      <div className="card" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>Active Session</div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '3px' }}>
            Signed in as <strong style={{ color: 'var(--text-primary)' }}>{user?.email}</strong>. Ready to switch accounts or end session?
          </div>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="btn btn-danger btn-md"
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <LogOut size={16} />
          <span>Sign Out</span>
        </button>
      </div>

    </div>
  );
};
