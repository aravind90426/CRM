import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Briefcase,
  PhoneCall,
  CalendarCheck,
  TrendingUp,
  Award,
  ArrowUpRight,
  PlusCircle,
  PhoneForwarded,
  AlertTriangle,
  Clock,
  LogIn,
  LogOut,
} from 'lucide-react';
import { dashboardApi, projectsApi, attendanceApi } from '../../api';
import { DashboardSummary, Project } from '../../types';
import { StatCard } from '../../components/common/StatCard';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { getErrorMessage } from '../../api/client';
import { useAuth } from '../../context/AuthContext';

// ─── Inline Attendance Widget ────────────────────────────────────────────────
const AdminAttendanceWidget: React.FC = () => {
  const [attendance, setAttendance] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<'clockIn' | 'clockOut' | null>(null);
  const [liveDuration, setLiveDuration] = useState('0h 0m');

  const fetchToday = useCallback(async () => {
    try {
      const data = await attendanceApi.getTodayAttendance();
      setAttendance(data);
    } catch (e) {
      console.warn('Failed to load attendance:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchToday();
  }, [fetchToday]);

  // Live duration ticker
  useEffect(() => {
    if (attendance?.clockInTime && !attendance?.clockOutTime) {
      const update = () => {
        const start = new Date(attendance.clockInTime).getTime();
        const diffMins = Math.max(0, Math.floor((Date.now() - start) / 60000));
        setLiveDuration(`${Math.floor(diffMins / 60)}h ${diffMins % 60}m`);
      };
      update();
      const id = setInterval(update, 60000);
      return () => clearInterval(id);
    } else if (attendance?.durationMinutes) {
      setLiveDuration(`${Math.floor(attendance.durationMinutes / 60)}h ${attendance.durationMinutes % 60}m`);
    } else {
      setLiveDuration('0h 0m');
    }
  }, [attendance]);

  const handleClockIn = async () => {
    setActionLoading('clockIn');
    try {
      const updated = await attendanceApi.clockIn();
      setAttendance(updated);
    } catch (err: any) {
      alert(err?.response?.data?.message || err.message || 'Clock in failed.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleClockOut = async () => {
    if (!window.confirm('Are you sure you want to clock out for today?')) return;
    setActionLoading('clockOut');
    try {
      const updated = await attendanceApi.clockOut();
      setAttendance(updated);
    } catch (err: any) {
      alert(err?.response?.data?.message || err.message || 'Clock out failed.');
    } finally {
      setActionLoading(null);
    }
  };

  const formatTime = (t?: string) => {
    if (!t) return '--:--';
    try { return new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }
    catch { return '--:--'; }
  };

  const isClockedIn = !!attendance?.clockInTime;
  const isClockedOut = !!attendance?.clockOutTime;

  // Status badge
  const statusLabel = isClockedOut
    ? (attendance?.status === 'HALF_DAY' ? 'Half Day' : 'Completed')
    : isClockedIn ? 'Working' : 'Not Clocked In';

  const statusStyle: React.CSSProperties = isClockedOut
    ? { background: '#FEE2E2', color: '#991B1B', border: '1px solid #FECACA' }
    : isClockedIn
    ? { background: '#DCFCE7', color: '#166534', border: '1px solid #86EFAC' }
    : { background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)' };

  return (
    <div
      style={{
        background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
        borderRadius: '16px',
        padding: '20px 24px',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: '20px',
        boxShadow: '0 6px 24px rgba(79, 70, 229, 0.3)',
      }}
    >
      {/* Left: Icon + Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: '0 0 auto' }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Clock size={20} color="#fff" />
        </div>
        <div>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Today's Attendance
          </div>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              marginTop: 4,
              padding: '2px 10px',
              borderRadius: 999,
              fontSize: '0.75rem',
              fontWeight: 700,
              ...statusStyle,
            }}
          >
            {statusLabel}
          </div>
        </div>
      </div>

      {/* Middle: Metrics Strip */}
      {!loading && (
        <div
          style={{
            flex: 1,
            minWidth: 240,
            display: 'flex',
            alignItems: 'center',
            gap: 0,
            background: '#fff',
            borderRadius: 12,
            padding: '10px 0',
          }}
        >
          {[
            { label: 'Clock In', value: formatTime(attendance?.clockInTime) },
            { label: 'Clock Out', value: formatTime(attendance?.clockOutTime) },
            { label: 'Duration', value: liveDuration },
          ].map((item, idx, arr) => (
            <React.Fragment key={item.label}>
              <div style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ fontSize: '0.6875rem', color: '#6B7280', fontWeight: 500, marginBottom: 2 }}>{item.label}</div>
                <div style={{ fontSize: '1rem', fontWeight: 800, color: '#111827' }}>{item.value}</div>
              </div>
              {idx < arr.length - 1 && (
                <div style={{ width: 1, height: 28, background: '#E5E7EB' }} />
              )}
            </React.Fragment>
          ))}
        </div>
      )}

      {/* Right: Action Buttons */}
      <div style={{ display: 'flex', gap: 10, flex: '0 0 auto' }}>
        {/* Clock In button */}
        <button
          id="admin-clock-in-btn"
          onClick={handleClockIn}
          disabled={isClockedIn || actionLoading !== null}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '9px 18px',
            borderRadius: 10,
            border: '1.5px solid',
            fontSize: '0.8125rem',
            fontWeight: 700,
            cursor: isClockedIn ? 'default' : 'pointer',
            transition: 'all 0.2s',
            ...(isClockedIn
              ? { background: '#DCFCE7', borderColor: '#86EFAC', color: '#166534' }
              : { background: 'rgba(255,255,255,0.95)', borderColor: 'rgba(255,255,255,0.6)', color: '#334155' }),
            opacity: isClockedIn ? 0.85 : 1,
          }}
        >
          <LogIn size={15} />
          {actionLoading === 'clockIn' ? 'Punching...' : isClockedIn ? 'Clocked In' : 'Clock In'}
        </button>

        {/* Clock Out button */}
        <button
          id="admin-clock-out-btn"
          onClick={handleClockOut}
          disabled={!isClockedIn || isClockedOut || actionLoading !== null}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '9px 18px',
            borderRadius: 10,
            border: '1.5px solid',
            fontSize: '0.8125rem',
            fontWeight: 700,
            cursor: (!isClockedIn || isClockedOut) ? 'default' : 'pointer',
            transition: 'all 0.2s',
            background: '#FEE2E2',
            borderColor: '#FECACA',
            color: '#991B1B',
            opacity: (!isClockedIn || isClockedOut) ? 0.5 : 1,
          }}
        >
          <LogOut size={15} />
          {actionLoading === 'clockOut' ? 'Processing...' : isClockedOut ? 'Clocked Out' : 'Clock Out'}
        </button>
      </div>
    </div>
  );
};
// ─────────────────────────────────────────────────────────────────────────────

export const AdminDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [sumData, projData] = await Promise.all([
        dashboardApi.getAdminDashboard(),
        projectsApi.getProjects(),
      ]);
      setSummary(sumData);
      setProjects(Array.isArray(projData) ? projData : ((projData as any)?.content || []));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <LoadingSpinner message="Aggregating organization metrics..." />;
  }

  if (error) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '32px' }}>
        <AlertTriangle size={36} style={{ color: 'var(--danger)', margin: '0 auto 12px' }} />
        <h3 style={{ marginBottom: '8px' }}>Failed to Load Dashboard</h3>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>{error}</p>
        <button onClick={loadDashboardData} className="btn btn-primary btn-sm">Retry</button>
      </div>
    );
  }

  const connectedRate = summary?.totalCalls
    ? Math.round((summary.connectedCalls / summary.totalCalls) * 100)
    : 0;

  const conversionRate = summary?.totalLeads
    ? Math.round((summary.convertedLeads / summary.totalLeads) * 100)
    : 0;

  // callsToday comes from backend; fall back gracefully
  const callsToday = (summary as any)?.callsToday ?? 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header Banner */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.03em' }}>
            Executive Dashboard
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '4px' }}>
            Welcome back, {user?.name}. Real-time organization performance &amp; agent activity.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            id="admin-new-lead-btn"
            onClick={() => navigate('/leads')}
            className="btn btn-primary btn-sm"
          >
            <PlusCircle size={16} />
            <span>Manage Leads</span>
          </button>
        </div>
      </div>

      {/* Attendance Widget */}
      <AdminAttendanceWidget />

      {/* Row 1: KPI Stats Grid */}
      <div className="grid-cols-4">
        <StatCard
          title="Total Pipeline Leads"
          value={summary?.totalLeads ?? 0}
          subtitle={`${summary?.assignedLeads ?? 0} assigned • ${summary?.unassignedLeads ?? 0} unassigned`}
          icon={<Users size={22} />}
          variant="primary"
          onClick={() => navigate('/leads')}
        />
        <StatCard
          title="Calls Today"
          value={callsToday}
          subtitle={`${connectedRate}% connect rate (${summary?.connectedCalls ?? 0} connected)`}
          icon={<PhoneCall size={22} />}
          variant="success"
          onClick={() => navigate('/admin/calls')}
        />
        <StatCard
          title="Interested Prospects"
          value={summary?.interestedLeads ?? 0}
          subtitle="Qualified high-intent leads"
          icon={<TrendingUp size={22} />}
          variant="info"
          onClick={() => navigate('/leads')}
        />
        <StatCard
          title="Sales Converted"
          value={summary?.convertedLeads ?? 0}
          subtitle={`${conversionRate}% conversion rate`}
          icon={<Award size={22} />}
          variant="warning"
          onClick={() => navigate('/admin/reports')}
        />
      </div>

      {/* Row 2: Secondary Metric Highlights */}
      <div className="grid-cols-3">
        <div className="card">
          <div className="card-header">
            <div className="card-title">Call Performance Breakdown</div>
            <PhoneForwarded size={18} style={{ color: 'var(--primary)' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', marginBottom: '4px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Connected Calls</span>
                <span style={{ fontWeight: 700, color: 'var(--success)' }}>{summary?.connectedCalls ?? 0}</span>
              </div>
              <div style={{ height: '6px', borderRadius: '3px', background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                <div style={{ width: `${connectedRate}%`, height: '100%', background: 'var(--success)' }} />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', marginBottom: '4px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>No Answer / Missed</span>
                <span style={{ fontWeight: 700, color: 'var(--warning)' }}>{(summary?.noAnswerCalls ?? 0) + (summary?.missedCalls ?? 0)}</span>
              </div>
              <div style={{ height: '6px', borderRadius: '3px', background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                <div style={{ width: summary?.totalCalls ? `${(((summary.noAnswerCalls + summary.missedCalls) / summary.totalCalls) * 100)}%` : '0%', height: '100%', background: 'var(--warning)' }} />
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-title">Follow-up Health</div>
            <CalendarCheck size={18} style={{ color: 'var(--warning)' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Pending Follow-ups</span>
              <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--warning)' }}>{summary?.pendingFollowUps ?? 0}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Overdue Follow-ups</span>
              <span style={{ fontSize: '1.25rem', fontWeight: 800, color: (summary?.overdueFollowUps ?? 0) > 0 ? 'var(--danger)' : 'var(--success)' }}>
                {summary?.overdueFollowUps ?? 0}
              </span>
            </div>
            <button
              onClick={() => navigate('/follow-ups')}
              className="btn btn-secondary btn-sm"
              style={{ width: '100%', marginTop: '6px' }}
            >
              Open Follow-ups Console
            </button>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-title">Active Projects</div>
            <Briefcase size={18} style={{ color: 'var(--info)' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              {(projects || []).filter(p => p.status === 'ACTIVE').length || (projects || []).length}
            </div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
              Total commercial &amp; residential sales campaigns active.
            </div>
            <button
              onClick={() => navigate('/admin/projects')}
              className="btn btn-secondary btn-sm"
              style={{ width: '100%', marginTop: '10px' }}
            >
              Manage Projects
            </button>
          </div>
        </div>
      </div>

      {/* Row 3: Active Projects Table */}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Project Campaigns Overview</div>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Projects currently receiving inbound and outbound leads
            </p>
          </div>
          <button
            onClick={() => navigate('/admin/projects')}
            className="btn btn-secondary btn-sm"
          >
            <span>View All Projects</span>
            <ArrowUpRight size={14} />
          </button>
        </div>

        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Project Name</th>
                <th>Description</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {(projects || []).map((proj) => (
                <tr key={proj.id}>
                  <td style={{ fontWeight: 700 }}>{proj.name}</td>
                  <td style={{ color: 'var(--text-secondary)', maxWidth: '300px' }}>{proj.description || '—'}</td>
                  <td>
                    <span className={`badge ${proj.status === 'ACTIVE' ? 'badge-success' : 'badge-secondary'}`}>
                      <span className="badge-dot" />
                      {proj.status}
                    </span>
                  </td>
                  <td>
                    <button
                      onClick={() => navigate(`/leads?projectId=${proj.id}`)}
                      className="btn btn-ghost btn-sm"
                      style={{ color: 'var(--primary)' }}
                    >
                      View Leads
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
