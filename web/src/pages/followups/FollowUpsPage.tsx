import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  CalendarCheck,
  CheckCircle2,
  Clock,
  PhoneCall,
  AlertCircle,
  Briefcase,
  User,
  Check,
  RotateCcw,
} from 'lucide-react';
import { followUpsApi } from '../../api';
import { FollowUp } from '../../types';
import { FollowUpStatusBadge } from '../../components/common/Badge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import { getErrorMessage } from '../../api/client';

export const FollowUpsPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [activeTab, setActiveTab] = useState<'overdue' | 'today' | 'upcoming' | 'completed'>(() => {
    const p = searchParams.get('period');
    if (p === 'overdue' || p === 'today' || p === 'upcoming') return p;
    if (searchParams.get('status') === 'COMPLETED') return 'completed';
    return 'today';
  });

  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadFollowUps();
  }, [activeTab]);

  const loadFollowUps = async () => {
    setIsLoading(true);
    setError(null);
    try {
      let params: any = { size: 50 };
      if (activeTab === 'completed') {
        params.status = 'COMPLETED';
      } else {
        params.period = activeTab;
      }
      const data = await followUpsApi.getFollowUps(params);
      setFollowUps(data?.content || []);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleTabChange = (tab: 'overdue' | 'today' | 'upcoming' | 'completed') => {
    setActiveTab(tab);
    if (tab === 'completed') {
      setSearchParams({ status: 'COMPLETED' });
    } else {
      setSearchParams({ period: tab });
    }
  };

  const handleMarkCompleted = async (fuId: number) => {
    try {
      await followUpsApi.updateStatus(fuId, 'COMPLETED');
      loadFollowUps();
    } catch (err) {
      alert(getErrorMessage(err));
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.03em' }}>
          Follow-up Management Console
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '2px' }}>
          Stay on top of customer callback promises, site visits, and proposal discussions.
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="card" style={{ padding: '12px 18px' }}>
        <div className="tabs-nav" style={{ margin: 0, padding: 0, border: 'none' }}>
          <button
            id="tab-fu-overdue"
            type="button"
            onClick={() => handleTabChange('overdue')}
            className={`tab-btn ${activeTab === 'overdue' ? 'active' : ''}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              color: activeTab === 'overdue' ? '#fff' : '#f87171',
            }}
          >
            <AlertCircle size={15} />
            <span>Missed / Overdue</span>
          </button>

          <button
            id="tab-fu-today"
            type="button"
            onClick={() => handleTabChange('today')}
            className={`tab-btn ${activeTab === 'today' ? 'active' : ''}`}
          >
            <span>Today's Follow-ups</span>
          </button>

          <button
            id="tab-fu-upcoming"
            type="button"
            onClick={() => handleTabChange('upcoming')}
            className={`tab-btn ${activeTab === 'upcoming' ? 'active' : ''}`}
          >
            <span>Upcoming</span>
          </button>

          <button
            id="tab-fu-completed"
            type="button"
            onClick={() => handleTabChange('completed')}
            className={`tab-btn ${activeTab === 'completed' ? 'active' : ''}`}
          >
            <span>Completed</span>
          </button>
        </div>
      </div>

      {/* Follow-ups List */}
      <div className="card" style={{ padding: '20px' }}>
        {isLoading ? (
          <LoadingSpinner message="Retrieving scheduled follow-ups..." />
        ) : error ? (
          <div style={{ color: 'var(--danger)', textAlign: 'center', padding: '24px' }}>{error}</div>
        ) : followUps.length === 0 ? (
          <EmptyState
            title="No Follow-ups in This Category"
            description={`You have no ${activeTab} follow-ups scheduled at this time.`}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {followUps.map((fu) => (
              <div
                key={fu.id}
                style={{
                  padding: '16px 20px',
                  background: 'rgba(255, 255, 255, 0.02)',
                  borderRadius: 'var(--radius-md)',
                  border: `1px solid ${fu.isOverdue && fu.status !== 'COMPLETED' ? 'rgba(239, 68, 68, 0.3)' : 'var(--border-subtle)'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '16px',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span
                      onClick={() => navigate(`/leads/${fu.leadId}`)}
                      style={{ fontWeight: 800, fontSize: '1.0625rem', color: 'var(--text-primary)', cursor: 'pointer' }}
                      className="hover-underline"
                    >
                      {fu.leadName}
                    </span>
                    <FollowUpStatusBadge status={fu.status} isOverdue={fu.isOverdue} />
                  </div>

                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Briefcase size={14} />
                      {fu.projectName}
                    </span>
                    <span>•</span>
                    <span>Phone: {fu.leadPhone}</span>
                    <span>•</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: fu.isOverdue && fu.status !== 'COMPLETED' ? 'var(--danger)' : 'var(--text-secondary)' }}>
                      <Clock size={14} />
                      {new Date(fu.followUpDate).toLocaleString()}
                    </span>
                  </div>

                  {fu.notes && (
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-primary)', marginTop: '4px' }}>
                      "{fu.notes}"
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <button
                    onClick={() => navigate(`/dialler?leadId=${fu.leadId}`)}
                    className="btn btn-primary btn-sm"
                  >
                    <PhoneCall size={14} />
                    <span>Call Now</span>
                  </button>

                  {fu.status === 'PENDING' && (
                    <button
                      onClick={() => handleMarkCompleted(fu.id)}
                      className="btn btn-success btn-sm"
                    >
                      <Check size={14} />
                      <span>Complete</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
