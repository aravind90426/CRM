import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  PhoneCall,
  CalendarCheck,
  TrendingUp,
  Award,
  AlertCircle,
  PhoneForwarded,
  ArrowRight,
  Clock,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { dashboardApi, followUpsApi, callsApi } from '../../api';
import { DashboardSummary, FollowUp, Call } from '../../types';
import { StatCard } from '../../components/common/StatCard';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { FollowUpStatusBadge, CallStatusBadge, OutcomeBadge } from '../../components/common/Badge';
import { getErrorMessage } from '../../api/client';

export const UserHomePage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [urgentFollowUps, setUrgentFollowUps] = useState<FollowUp[]>([]);
  const [recentCalls, setRecentCalls] = useState<Call[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadUserHome();
  }, []);

  const loadUserHome = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [sumData, followUpData, callsData] = await Promise.all([
        dashboardApi.getUserDashboard(),
        followUpsApi.getFollowUps({ period: 'overdue', size: 5 }),
        callsApi.getCalls({ size: 5 }),
      ]);
      setSummary(sumData);
      setUrgentFollowUps(followUpData?.content || []);
      setRecentCalls(callsData?.content || []);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <LoadingSpinner message="Loading your personal sales workspace..." />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Personalized Welcome Banner */}
      <div
        className="card"
        style={{
          background: 'linear-gradient(135deg, rgba(30, 27, 75, 0.8) 0%, rgba(17, 24, 39, 0.9) 100%)',
          border: '1px solid rgba(99, 102, 241, 0.3)',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Sales Agent Workspace
            </span>
            <Sparkles size={16} style={{ color: '#fbbf24' }} />
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>
            Welcome back, {user?.name}!
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '4px' }}>
            You have <strong style={{ color: '#fff' }}>{summary?.assignedLeads ?? 0} leads</strong> assigned to you. Ready to connect and convert?
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            id="agent-start-calling-btn"
            onClick={() => navigate('/dialler')}
            className="btn btn-primary btn-lg"
          >
            <PhoneCall size={18} />
            <span>Launch Dialler</span>
          </button>
        </div>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid-cols-4">
        <StatCard
          title="My Assigned Leads"
          value={summary?.assignedLeads ?? 0}
          subtitle="Active pipeline"
          icon={<Users size={22} />}
          variant="primary"
        />
        <StatCard
          title="Calls Completed"
          value={summary?.totalCalls ?? 0}
          subtitle={`${summary?.connectedCalls ?? 0} Connected`}
          icon={<PhoneCall size={22} />}
          variant="success"
        />
        <StatCard
          title="Pending Follow-ups"
          value={summary?.pendingFollowUps ?? 0}
          subtitle={`${summary?.overdueFollowUps ?? 0} Overdue`}
          icon={<CalendarCheck size={22} />}
          variant={summary?.overdueFollowUps ? 'danger' : 'warning'}
        />
        <StatCard
          title="Conversions"
          value={summary?.convertedLeads ?? 0}
          subtitle="Deals closed"
          icon={<Award size={22} />}
          variant="warning"
        />
      </div>

      {/* Urgent Overdue Follow-ups Alert Banner if any */}
      {(summary?.overdueFollowUps ?? 0) > 0 && (
        <div
          style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 'var(--radius-md)',
            padding: '14px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <AlertCircle size={20} style={{ color: 'var(--danger)' }} />
            <div>
              <span style={{ fontWeight: 700, color: '#fca5a5' }}>
                Attention: You have {summary?.overdueFollowUps} overdue follow-up(s)!
              </span>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                Please review and follow up with these leads promptly to avoid losing momentum.
              </div>
            </div>
          </div>
          <button
            onClick={() => navigate('/follow-ups?period=overdue')}
            className="btn btn-danger btn-sm"
          >
            Review Overdue
          </button>
        </div>
      )}

      {/* Two Column Section: Recent Calls and Pending Follow-ups */}
      <div className="grid-cols-2">
        {/* Recent Call Logs */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Recent Customer Interactions</div>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>Calls logged from Dialler</p>
            </div>
            <button
              onClick={() => navigate('/dialler')}
              className="btn btn-ghost btn-sm"
              style={{ color: 'var(--primary)' }}
            >
              Log Call
            </button>
          </div>

          {recentCalls.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              No calls logged yet today. Use the Dialler to record your first conversation.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {recentCalls.map((call) => (
                <div
                  key={call.id}
                  style={{
                    padding: '12px 14px',
                    background: 'rgba(255, 255, 255, 0.02)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <CallStatusBadge status={call.callStatus} />
                      <OutcomeBadge outcome={call.businessOutcome} />
                    </div>
                    <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Clock size={13} />
                      <span>Duration: {call.formattedDuration}</span>
                      <span>•</span>
                      <span>{new Date(call.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                  {call.notes && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      "{call.notes}"
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actionable Follow-ups */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">My Actionable Follow-ups</div>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>Scheduled calls and touchpoints</p>
            </div>
            <button
              onClick={() => navigate('/follow-ups')}
              className="btn btn-ghost btn-sm"
              style={{ color: 'var(--primary)' }}
            >
              View All
            </button>
          </div>

          {urgentFollowUps.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              No pending overdue follow-ups. You're all caught up!
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {urgentFollowUps.map((fu) => (
                <div
                  key={fu.id}
                  style={{
                    padding: '12px 14px',
                    background: 'rgba(255, 255, 255, 0.02)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--text-primary)' }}>
                      {fu.leadName}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {fu.projectName} • {fu.leadPhone}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FollowUpStatusBadge status={fu.status} isOverdue={fu.isOverdue} />
                    <button
                      onClick={() => navigate(`/dialler?leadId=${fu.leadId}`)}
                      className="btn btn-primary btn-sm"
                      style={{ padding: '4px 8px' }}
                    >
                      <PhoneCall size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
