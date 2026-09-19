import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UserCheck,
  Share2,
  Users,
  Search,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Briefcase,
} from 'lucide-react';
import { leadsApi, usersApi } from '../../api';
import { LeadSummary, User } from '../../types';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { Modal } from '../../components/common/Modal';
import { StatusBadge, OutcomeBadge } from '../../components/common/Badge';
import { getErrorMessage } from '../../api/client';

export const AssignmentsPage: React.FC = () => {
  const navigate = useNavigate();

  const [leads, setLeads] = useState<LeadSummary[]>([]);
  const [agents, setAgents] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterOwner, setFilterOwner] = useState('');

  // Reassignment Modal
  const [selectedLead, setSelectedLead] = useState<LeadSummary | null>(null);
  const [targetAgentId, setTargetAgentId] = useState<number>(0);
  const [reassignReason, setReassignReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [leadsData, usersData] = await Promise.all([
        leadsApi.getLeads({ size: 100 }),
        usersApi.getUsers({ size: 100 }),
      ]);
      setLeads(leadsData?.content || []);
      setAgents((usersData?.content || []).filter((u) => u.status === 'ACTIVE'));
    } catch (err) {
      setFeedback({ type: 'error', message: getErrorMessage(err) });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenReassign = (lead: LeadSummary) => {
    setSelectedLead(lead);
    setTargetAgentId(lead.currentOwner?.id || (agents[0]?.id ?? 0));
    setReassignReason('');
  };

  const handleConfirmReassign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead || !targetAgentId) return;

    setIsSubmitting(true);
    setFeedback(null);
    try {
      await leadsApi.reassignLead(selectedLead.id, targetAgentId, reassignReason);
      setFeedback({
        type: 'success',
        message: `Lead "${selectedLead.name}" reassigned successfully. Assignment history updated.`,
      });
      setSelectedLead(null);
      loadData();
    } catch (err) {
      setFeedback({ type: 'error', message: getErrorMessage(err) });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredLeads = leads.filter((l) => {
    const matchesSearch =
      l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.phone.includes(searchQuery);
    const matchesOwner =
      filterOwner === 'unassigned'
        ? !l.currentOwner
        : filterOwner
        ? l.currentOwner?.id === Number(filterOwner)
        : true;
    return matchesSearch && matchesOwner;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.03em' }}>
          Lead Assignment Management
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '2px' }}>
          Allocate incoming customer inquiries and reassign ownership across your sales team with immutable audit logging.
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

      {/* Filter and Search */}
      <div className="card" style={{ padding: '16px 20px', display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'space-between' }}>
        <div style={{ position: 'relative', flex: '1 1 300px' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="form-input"
            style={{ paddingLeft: '38px' }}
            placeholder="Search lead by name or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <select
          className="form-select"
          style={{ width: 'auto', minWidth: '180px' }}
          value={filterOwner}
          onChange={(e) => setFilterOwner(e.target.value)}
        >
          <option value="">All Ownership Statuses</option>
          <option value="unassigned">Unassigned Leads Only</option>
          {agents.map((ag) => (
            <option key={ag.id} value={ag.id}>Assigned to {ag.name}</option>
          ))}
        </select>
      </div>

      {/* Leads Assignment Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {isLoading ? (
          <LoadingSpinner message="Loading lead assignments..." />
        ) : (
          <div className="table-container" style={{ border: 'none' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Lead Name</th>
                  <th>Campaign</th>
                  <th>Lead Status</th>
                  <th>Current Owner</th>
                  <th>Last Outcome</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeads.map((l) => (
                  <tr key={l.id}>
                    <td>
                      <div
                        onClick={() => navigate(`/leads/${l.id}`)}
                        style={{ fontWeight: 700, cursor: 'pointer' }}
                        className="hover-underline"
                      >
                        {l.name}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{l.phone}</div>
                    </td>
                    <td>
                      <span className="badge badge-secondary">{l.projectName || l.project?.name || '—'}</span>
                    </td>
                    <td><StatusBadge status={l.status} /></td>
                    <td>
                      {(l.currentOwner || l.currentOwnerName) ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <UserCheck size={14} style={{ color: 'var(--primary)' }} />
                          <span style={{ fontWeight: 600 }}>{l.currentOwnerName || l.currentOwner?.name}</span>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--warning)', fontWeight: 700, fontSize: '0.75rem' }}>UNASSIGNED</span>
                      )}
                    </td>
                    <td><OutcomeBadge outcome={l.businessOutcome} /></td>
                    <td>
                      <button
                        onClick={() => handleOpenReassign(l)}
                        className="btn btn-secondary btn-sm"
                        style={{ gap: '6px' }}
                      >
                        <Share2 size={13} />
                        <span>{(l.currentOwner || l.currentOwnerName) ? 'Reassign' : 'Assign Lead'}</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Reassign Modal */}
      <Modal
        isOpen={!!selectedLead}
        onClose={() => setSelectedLead(null)}
        title={(selectedLead?.currentOwner || selectedLead?.currentOwnerName) ? 'Reassign Lead' : 'Assign Lead'}
      >
        <form onSubmit={handleConfirmReassign}>
          <div style={{ marginBottom: '16px', padding: '12px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: 'var(--radius-md)' }}>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Target Customer:</div>
            <div style={{ fontWeight: 700, fontSize: '1.125rem' }}>{selectedLead?.name} ({selectedLead?.phone})</div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>Project: {selectedLead?.projectName || selectedLead?.project?.name || '—'}</div>
          </div>

          <div className="form-group">
            <label className="form-label">Assign to Sales Employee *</label>
            <select
              className="form-select"
              value={targetAgentId}
              onChange={(e) => setTargetAgentId(Number(e.target.value))}
              required
            >
              {agents.map((ag) => (
                <option key={ag.id} value={ag.id}>
                  {ag.name} ({ag.email}) {ag.id === selectedLead?.currentOwner?.id ? '— Currently Assigned' : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Reassignment Reason</label>
            <textarea
              className="form-textarea"
              placeholder="e.g. Workload distribution, shift handover..."
              value={reassignReason}
              onChange={(e) => setReassignReason(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
            <button type="button" onClick={() => setSelectedLead(null)} className="btn btn-secondary btn-sm">Cancel</button>
            <button type="submit" className="btn btn-primary btn-sm" disabled={isSubmitting}>
              {isSubmitting ? 'Updating...' : 'Confirm Assignment'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
