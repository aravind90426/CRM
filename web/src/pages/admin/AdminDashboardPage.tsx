import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Briefcase,
  PhoneCall,
  CalendarCheck,
  TrendingUp,
  Award,
  ArrowUpRight,
  ShieldCheck,
  PlusCircle,
  PhoneForwarded,
  AlertTriangle,
} from 'lucide-react';
import { dashboardApi, projectsApi } from '../../api';
import { DashboardSummary, Project } from '../../types';
import { StatCard } from '../../components/common/StatCard';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { getErrorMessage } from '../../api/client';

export const AdminDashboardPage: React.FC = () => {
  const navigate = useNavigate();
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
            Real-time organization sales performance, lead pipeline, and agent activity.
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

      {/* Row 1: KPI Stats Grid */}
      <div className="grid-cols-4">
        <StatCard
          title="Total Pipeline Leads"
          value={summary?.totalLeads ?? 0}
          subtitle={`${summary?.assignedLeads ?? 0} assigned • ${summary?.unassignedLeads ?? 0} unassigned`}
          icon={<Users size={22} />}
          variant="primary"
        />
        <StatCard
          title="Calls Completed"
          value={summary?.totalCalls ?? 0}
          subtitle={`${connectedRate}% connect rate (${summary?.connectedCalls ?? 0} connected)`}
          icon={<PhoneCall size={22} />}
          variant="success"
        />
        <StatCard
          title="Interested Prospects"
          value={summary?.interestedLeads ?? 0}
          subtitle="Qualified high-intent leads"
          icon={<TrendingUp size={22} />}
          variant="info"
        />
        <StatCard
          title="Sales Converted"
          value={summary?.convertedLeads ?? 0}
          subtitle={`${conversionRate}% conversion rate`}
          icon={<Award size={22} />}
          variant="warning"
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
              {(projects || []).length}
            </div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
              Total commercial & residential sales campaigns active.
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
