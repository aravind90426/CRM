import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  PhoneCall,
  UserCheck,
  CalendarCheck,
  FileText,
  DollarSign,
  History,
  Clock,
  MapPin,
  Mail,
  Phone,
  Briefcase,
  AlertCircle,
  Plus,
  CheckCircle2,
  Share2,
  Award,
  Users,
  Trash2,
} from 'lucide-react';
import { leadsApi, followUpsApi, notesApi, salesApi, usersApi } from '../../api';
import { LeadDetail, User } from '../../types';
import { StatusBadge, OutcomeBadge, CallStatusBadge, FollowUpStatusBadge } from '../../components/common/Badge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { Modal } from '../../components/common/Modal';
import { useAuth } from '../../context/AuthContext';
import { getErrorMessage } from '../../api/client';

export const LeadDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();

  const [lead, setLead] = useState<LeadDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Tab State
  const [activeTab, setActiveTab] = useState<'calls' | 'followups' | 'notes' | 'assignments' | 'conversion'>('calls');

  // Modals
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [isFollowUpModalOpen, setIsFollowUpModalOpen] = useState(false);
  const [isConvertModalOpen, setIsConvertModalOpen] = useState(false);

  // Modals Data
  const [agents, setAgents] = useState<User[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<number>(0);
  const [reassignReason, setReassignReason] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [followUpNotes, setFollowUpNotes] = useState('');
  const [dealValue, setDealValue] = useState<number | ''>('');
  const [dealNotes, setDealNotes] = useState('');

  // Delete Modal
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [actionError, setActionError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (id) {
      loadLeadDetails(Number(id));
      if (isAdmin) {
        usersApi.getUsers({ size: 100 }).then((res) => {
          setAgents(res.content.filter((u) => u.status === 'ACTIVE'));
        });
      }
    }
  }, [id, isAdmin]);

  const loadLeadDetails = async (leadId: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await leadsApi.getLeadById(leadId);
      setLead(data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleReassign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAgentId || !lead) return;
    setIsSubmitting(true);
    setActionError(null);
    try {
      await leadsApi.reassignLead(lead.id, selectedAgentId, reassignReason);
      setIsAssignModalOpen(false);
      loadLeadDetails(lead.id);
    } catch (err) {
      setActionError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteContent.trim() || !lead) return;
    setIsSubmitting(true);
    setActionError(null);
    try {
      await notesApi.addNote(lead.id, noteContent);
      setNoteContent('');
      setIsNoteModalOpen(false);
      loadLeadDetails(lead.id);
    } catch (err) {
      setActionError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!followUpDate || !lead) return;
    setIsSubmitting(true);
    setActionError(null);
    try {
      await followUpsApi.createFollowUp({
        leadId: lead.id,
        followUpDate: followUpDate,
        notes: followUpNotes,
      });
      setFollowUpDate('');
      setFollowUpNotes('');
      setIsFollowUpModalOpen(false);
      loadLeadDetails(lead.id);
    } catch (err) {
      setActionError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCompleteFollowUp = async (fuId: number) => {
    if (!lead) return;
    try {
      await followUpsApi.updateStatus(fuId, 'COMPLETED');
      loadLeadDetails(lead.id);
    } catch (err) {
      alert(getErrorMessage(err));
    }
  };

  const handleConvertLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lead || !dealValue) return;
    setIsSubmitting(true);
    setActionError(null);
    try {
      await salesApi.convertLead({
        leadId: lead.id,
        dealValue,
        notes: dealNotes,
      });
      setIsConvertModalOpen(false);
      loadLeadDetails(lead.id);
    } catch (err) {
      setActionError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteLead = async () => {
    if (!lead) return;
    setIsDeleting(true);
    setActionError(null);
    try {
      await leadsApi.deleteLead(lead.id);
      setIsDeleteModalOpen(false);
      navigate('/leads');
    } catch (err) {
      setActionError(getErrorMessage(err));
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return <LoadingSpinner message="Retrieving full lead lifecycle & interaction history..." />;
  }

  if (error || !lead) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
        <AlertCircle size={40} style={{ color: 'var(--danger)', margin: '0 auto 12px' }} />
        <h3>Unable to Access Lead Details</h3>
        <p style={{ color: 'var(--text-secondary)', marginTop: '6px', marginBottom: '20px' }}>{error}</p>
        <button onClick={() => navigate('/leads')} className="btn btn-primary btn-sm">
          <ArrowLeft size={16} />
          <span>Back to Leads</span>
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Bar Navigation & Actions */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
        <button
          onClick={() => navigate('/leads')}
          className="btn btn-ghost btn-sm"
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <ArrowLeft size={16} />
          <span>Back to Leads</span>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button
            id="lead-dial-action-btn"
            onClick={() => navigate(`/dialler?leadId=${lead.id}`)}
            className="btn btn-primary btn-sm"
          >
            <PhoneCall size={16} />
            <span>Launch Dialler</span>
          </button>

          <button
            id="lead-add-note-action-btn"
            onClick={() => { setActionError(null); setIsNoteModalOpen(true); }}
            className="btn btn-secondary btn-sm"
          >
            <FileText size={16} />
            <span>Add Note</span>
          </button>

          <button
            id="lead-schedule-followup-btn"
            onClick={() => { setActionError(null); setIsFollowUpModalOpen(true); }}
            className="btn btn-secondary btn-sm"
          >
            <CalendarCheck size={16} />
            <span>Schedule Follow-up</span>
          </button>

          {isAdmin && (
            <button
              id="lead-reassign-action-btn"
              onClick={() => { setActionError(null); setSelectedAgentId(lead.currentOwner?.id || 0); setIsAssignModalOpen(true); }}
              className="btn btn-secondary btn-sm"
            >
              <Share2 size={16} />
              <span>Reassign Lead</span>
            </button>
          )}

          {lead.status !== 'CONVERTED' && (
            <button
              id="lead-convert-action-btn"
              onClick={() => { setActionError(null); setIsConvertModalOpen(true); }}
              className="btn btn-success btn-sm"
            >
              <Award size={16} />
              <span>Convert to Sale</span>
            </button>
          )}

          {isAdmin && (
            <button
              id="lead-delete-action-btn"
              onClick={() => { setActionError(null); setIsDeleteModalOpen(true); }}
              className="btn btn-danger btn-sm"
            >
              <Trash2 size={16} />
              <span>Delete Lead</span>
            </button>
          )}
        </div>
      </div>

      {/* Conversion Banner if lead is Converted */}
      {lead.sale && (
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(5, 150, 105, 0.1) 100%)',
            border: '1px solid rgba(16, 185, 129, 0.4)',
            borderRadius: 'var(--radius-md)',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            boxShadow: '0 4px 20px var(--success-glow)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <Award size={32} style={{ color: 'var(--success)' }} />
            <div>
              <div style={{ fontWeight: 800, fontSize: '1.125rem', color: '#6ee7b7' }}>
                Lead Successfully Converted!
              </div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                Closed by {lead.sale.convertedBy?.name} on {new Date(lead.sale.convertedAt).toLocaleDateString()} • Value: ₹{lead.sale.dealValue.toLocaleString()}
              </div>
            </div>
          </div>
          <OutcomeBadge outcome="CONVERTED" />
        </div>
      )}

      {/* Row 1: Demographics & Ownership Overview */}
      <div className="grid-cols-3">
        {/* Customer Information Card */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">Customer Information</div>
            <Users size={18} style={{ color: 'var(--primary)' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.875rem' }}>
            <div>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Full Name</span>
              <div style={{ fontWeight: 700, fontSize: '1.125rem', color: 'var(--text-primary)' }}>{lead.name}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Phone size={15} style={{ color: 'var(--primary)' }} />
              <a href={`tel:${lead.phone}`} style={{ fontWeight: 600, color: 'var(--primary)' }}>{lead.phone}</a>
            </div>
            {lead.email && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Mail size={15} style={{ color: 'var(--text-muted)' }} />
                <span>{lead.email}</span>
              </div>
            )}
            {(lead.city || lead.state) && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MapPin size={15} style={{ color: 'var(--text-muted)' }} />
                <span>{[lead.city, lead.state].filter(Boolean).join(', ')}</span>
              </div>
            )}
            {lead.source && (
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                Source: <strong style={{ color: 'var(--text-primary)' }}>{lead.source}</strong>
              </div>
            )}
          </div>
        </div>

        {/* Project & Outcome Card */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">Project & Pipeline State</div>
            <Briefcase size={18} style={{ color: 'var(--info)' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.875rem' }}>
            <div>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Campaign / Project</span>
              <div style={{ fontWeight: 700, fontSize: '1.125rem', color: 'var(--text-primary)' }}>{lead.projectName || lead.project?.name || '—'}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Lead Status:</span>
              <StatusBadge status={lead.status} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Business Outcome:</span>
              <OutcomeBadge outcome={lead.businessOutcome} />
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border-subtle)', paddingTop: '8px' }}>
              Created: {new Date(lead.createdAt).toLocaleDateString()}
            </div>
          </div>
        </div>

        {/* Current & Previous Owners Card (Section #10 & #11) */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">Ownership Trail</div>
            <UserCheck size={18} style={{ color: 'var(--success)' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Current Active Owner
              </span>
              {(lead.currentOwner || lead.currentOwnerName) ? (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    marginTop: '4px',
                    padding: '8px 12px',
                    background: 'rgba(99, 102, 241, 0.1)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid rgba(99, 102, 241, 0.3)',
                  }}
                >
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: 'var(--primary)',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: '0.8125rem',
                    }}
                  >
                    {(lead.currentOwnerName || lead.currentOwner?.name || 'A').charAt(0)}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9375rem' }}>
                      {lead.currentOwnerName || lead.currentOwner?.name}
                    </div>
                    <div style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)' }}>
                      {lead.currentOwner?.email || ''}
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ color: 'var(--warning)', fontWeight: 600, fontSize: '0.875rem', marginTop: '4px' }}>
                  No Active Owner (Unassigned)
                </div>
              )}
            </div>

            {/* Previous Owners list */}
            <div>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Previously Handled By
              </span>
              {lead.previousOwners.length === 0 ? (
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  None (First assigned employee)
                </div>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                  {lead.previousOwners.map((prev) => (
                    <span
                      key={prev.id}
                      style={{
                        padding: '4px 8px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.75rem',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      {prev.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: Call Statistics Card (Section #16) */}
      <div className="card" style={{ background: 'rgba(15, 23, 42, 0.6)' }}>
        <div className="card-header">
          <div>
            <div className="card-title">Call Performance Summary</div>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
              Cumulative telephony metrics recorded for this customer
            </p>
          </div>
          <button
            onClick={() => navigate(`/dialler?leadId=${lead.id}`)}
            className="btn btn-primary btn-sm"
          >
            <PhoneCall size={14} />
            <span>Call Customer Now</span>
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '14px' }}>
          <div style={{ padding: '10px 14px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: 'var(--radius-md)' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Calls</span>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              {lead.callSummary.totalCalls}
            </div>
          </div>
          <div style={{ padding: '10px 14px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: 'var(--radius-md)' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Connected</span>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--success)' }}>
              {lead.callSummary.connectedCalls}
            </div>
          </div>
          <div style={{ padding: '10px 14px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: 'var(--radius-md)' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>No Answer / Missed</span>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--warning)' }}>
              {lead.callSummary.noAnswerCalls + lead.callSummary.missedCalls}
            </div>
          </div>
          <div style={{ padding: '10px 14px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: 'var(--radius-md)' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Busy</span>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--info)' }}>
              {lead.callSummary.busyCalls}
            </div>
          </div>
          <div style={{ padding: '10px 14px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: 'var(--radius-md)' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Talk Duration</span>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#a5b4fc', marginTop: '4px' }}>
              {lead.callSummary.formattedTotalDuration}
            </div>
          </div>
        </div>

        {lead.callSummary.lastCallAt && (
          <div style={{ marginTop: '14px', padding: '10px 14px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', fontSize: '0.8125rem' }}>
            <div>
              Last Call: <strong style={{ color: 'var(--text-primary)' }}>{new Date(lead.callSummary.lastCallAt).toLocaleString()}</strong> by <strong style={{ color: 'var(--primary)' }}>{lead.callSummary.lastCallBy}</strong>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <CallStatusBadge status={lead.callSummary.lastCallStatus} />
              <OutcomeBadge outcome={lead.callSummary.lastBusinessOutcome} />
            </div>
          </div>
        )}
      </div>

      {/* Row 3: Tabbed Detailed Views (Calls, Follow-ups, Notes, Assignment Timeline) */}
      <div className="card">
        <div className="tabs-nav">
          <button
            id="tab-calls-btn"
            type="button"
            className={`tab-btn ${activeTab === 'calls' ? 'active' : ''}`}
            onClick={() => setActiveTab('calls')}
          >
            Call History ({lead.calls.length})
          </button>
          <button
            id="tab-followups-btn"
            type="button"
            className={`tab-btn ${activeTab === 'followups' ? 'active' : ''}`}
            onClick={() => setActiveTab('followups')}
          >
            Follow-ups ({lead.followUps.length})
          </button>
          <button
            id="tab-notes-btn"
            type="button"
            className={`tab-btn ${activeTab === 'notes' ? 'active' : ''}`}
            onClick={() => setActiveTab('notes')}
          >
            Discussion Notes ({lead.notes.length})
          </button>
          <button
            id="tab-assignments-btn"
            type="button"
            className={`tab-btn ${activeTab === 'assignments' ? 'active' : ''}`}
            onClick={() => setActiveTab('assignments')}
          >
            Assignment History ({lead.assignmentHistory.length})
          </button>
        </div>

        {/* Tab 1: Calls History */}
        {activeTab === 'calls' && (
          <div>
            {lead.calls.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)' }}>
                No calls recorded yet. Click Launch Dialler to start a call.
              </div>
            ) : (
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Date / Time</th>
                      <th>Sales Rep</th>
                      <th>Duration</th>
                      <th>Call Status</th>
                      <th>Business Outcome</th>
                      <th>Interaction Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lead.calls.map((c) => (
                      <tr key={c.id}>
                        <td style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>
                          {new Date(c.startTime).toLocaleString()}
                        </td>
                        <td style={{ fontWeight: 600 }}>{c.user?.name}</td>
                        <td style={{ fontFamily: 'monospace' }}>{c.formattedDuration}</td>
                        <td><CallStatusBadge status={c.callStatus} /></td>
                        <td><OutcomeBadge outcome={c.businessOutcome} /></td>
                        <td style={{ color: 'var(--text-secondary)', maxWidth: '280px' }}>
                          {c.notes || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Follow-ups */}
        {activeTab === 'followups' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '14px' }}>
              <button
                onClick={() => setIsFollowUpModalOpen(true)}
                className="btn btn-primary btn-sm"
              >
                <Plus size={14} />
                <span>New Follow-up</span>
              </button>
            </div>

            {lead.followUps.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)' }}>
                No follow-ups scheduled for this lead.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {lead.followUps.map((fu) => (
                  <div
                    key={fu.id}
                    style={{
                      padding: '14px 18px',
                      background: 'rgba(255, 255, 255, 0.02)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-subtle)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '12px',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <FollowUpStatusBadge status={fu.status} isOverdue={fu.isOverdue} />
                        <span style={{ fontSize: '0.875rem', fontWeight: 700 }}>
                          {new Date(fu.followUpDate).toLocaleString()}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                        Rep: {fu.user?.name} • "{fu.notes || 'Follow up with lead'}"
                      </div>
                    </div>

                    {fu.status === 'PENDING' && (
                      <button
                        onClick={() => handleCompleteFollowUp(fu.id)}
                        className="btn btn-success btn-sm"
                      >
                        <CheckCircle2 size={14} />
                        <span>Mark Completed</span>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Notes */}
        {activeTab === 'notes' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '14px' }}>
              <button
                onClick={() => setIsNoteModalOpen(true)}
                className="btn btn-primary btn-sm"
              >
                <Plus size={14} />
                <span>Add Note</span>
              </button>
            </div>

            {lead.notes.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)' }}>
                No notes logged for this customer.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {lead.notes.map((note) => (
                  <div
                    key={note.id}
                    style={{
                      padding: '14px 18px',
                      background: 'rgba(255, 255, 255, 0.02)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-subtle)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      <span style={{ fontWeight: 600, color: 'var(--primary)' }}>{note.user?.name}</span>
                      <span>{new Date(note.createdAt).toLocaleString()}</span>
                    </div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>
                      {note.content}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Assignment History Timeline (Section #9) */}
        {activeTab === 'assignments' && (
          <div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Complete chronological audit trail of all employees who owned this lead. Historical records are strictly immutable.
            </div>

            <div style={{ position: 'relative', paddingLeft: '24px', borderLeft: '2px solid var(--border-subtle)' }}>
              {lead.assignmentHistory.map((ah, index) => (
                <div
                  key={ah.id}
                  style={{
                    position: 'relative',
                    marginBottom: '20px',
                  }}
                >
                  {/* Timeline Dot */}
                  <div
                    style={{
                      position: 'absolute',
                      left: '-31px',
                      top: '2px',
                      width: '12px',
                      height: '12px',
                      borderRadius: '50%',
                      background: ah.active ? 'var(--primary)' : 'var(--text-muted)',
                      boxShadow: ah.active ? '0 0 10px var(--primary-glow)' : 'none',
                    }}
                  />

                  <div
                    style={{
                      padding: '12px 16px',
                      background: 'rgba(255, 255, 255, 0.02)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-subtle)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                        {ah.assignedUser?.name}
                      </span>
                      {ah.active ? (
                        <span className="badge badge-primary">Current Owner</span>
                      ) : (
                        <span className="badge badge-secondary">Ended</span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Assigned: {new Date(ah.assignedAt).toLocaleString()}
                      {ah.unassignedAt && (
                        <span> • Ended: {new Date(ah.unassignedAt).toLocaleString()}</span>
                      )}
                      {ah.assignedBy && (
                        <span> • By: {ah.assignedBy.name}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Reassign Lead Modal */}
      <Modal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        title="Reassign Lead Ownership"
      >
        {actionError && (
          <div style={{ padding: '8px 12px', background: 'var(--danger-light)', color: '#fca5a5', borderRadius: 'var(--radius-sm)', marginBottom: '14px', fontSize: '0.8125rem' }}>
            {actionError}
          </div>
        )}
        <form onSubmit={handleReassign}>
          <div className="form-group">
            <label className="form-label">Select New Owner *</label>
            <select
              className="form-select"
              value={selectedAgentId}
              onChange={(e) => setSelectedAgentId(Number(e.target.value))}
              required
            >
              <option value="">Select Employee</option>
              {agents.map((ag) => (
                <option key={ag.id} value={ag.id}>
                  {ag.name} ({ag.email}) {ag.id === lead.currentOwner?.id ? '— Current' : ''}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Reassignment Reason / Transfer Note</label>
            <textarea
              className="form-textarea"
              placeholder="e.g. Workload balancing, language match, regional assignment..."
              value={reassignReason}
              onChange={(e) => setReassignReason(e.target.value)}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
            <button type="button" onClick={() => setIsAssignModalOpen(false)} className="btn btn-secondary btn-sm">Cancel</button>
            <button type="submit" className="btn btn-primary btn-sm" disabled={isSubmitting}>
              {isSubmitting ? 'Transferring...' : 'Confirm Reassignment'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Add Note Modal */}
      <Modal
        isOpen={isNoteModalOpen}
        onClose={() => setIsNoteModalOpen(false)}
        title="Add Discussion Note"
      >
        {actionError && (
          <div style={{ padding: '8px 12px', background: 'var(--danger-light)', color: '#fca5a5', borderRadius: 'var(--radius-sm)', marginBottom: '14px', fontSize: '0.8125rem' }}>
            {actionError}
          </div>
        )}
        <form onSubmit={handleAddNote}>
          <div className="form-group">
            <label className="form-label">Note Content *</label>
            <textarea
              className="form-textarea"
              placeholder="Customer requirements, preferences, discussion summary..."
              rows={4}
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              required
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
            <button type="button" onClick={() => setIsNoteModalOpen(false)} className="btn btn-secondary btn-sm">Cancel</button>
            <button type="submit" className="btn btn-primary btn-sm" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Note'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Create Follow-up Modal */}
      <Modal
        isOpen={isFollowUpModalOpen}
        onClose={() => setIsFollowUpModalOpen(false)}
        title="Schedule Follow-up"
      >
        {actionError && (
          <div style={{ padding: '8px 12px', background: 'var(--danger-light)', color: '#fca5a5', borderRadius: 'var(--radius-sm)', marginBottom: '14px', fontSize: '0.8125rem' }}>
            {actionError}
          </div>
        )}
        <form onSubmit={handleCreateFollowUp}>
          <div className="form-group">
            <label className="form-label">Follow-up Date & Time *</label>
            <input
              type="datetime-local"
              className="form-input"
              value={followUpDate}
              onChange={(e) => setFollowUpDate(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Reminder Notes / Next Action</label>
            <textarea
              className="form-textarea"
              placeholder="Discuss floor plan, send brochure, negotiation call..."
              value={followUpNotes}
              onChange={(e) => setFollowUpNotes(e.target.value)}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
            <button type="button" onClick={() => setIsFollowUpModalOpen(false)} className="btn btn-secondary btn-sm">Cancel</button>
            <button type="submit" className="btn btn-primary btn-sm" disabled={isSubmitting}>
              {isSubmitting ? 'Scheduling...' : 'Schedule Follow-up'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Convert Lead Modal */}
      <Modal
        isOpen={isConvertModalOpen}
        onClose={() => setIsConvertModalOpen(false)}
        title="Convert Lead to Closed Sale"
      >
        {actionError && (
          <div style={{ padding: '8px 12px', background: 'var(--danger-light)', color: '#fca5a5', borderRadius: 'var(--radius-sm)', marginBottom: '14px', fontSize: '0.8125rem' }}>
            {actionError}
          </div>
        )}
        <form onSubmit={handleConvertLead}>
          <div className="form-group">
            <label className="form-label">Deal / Booking Value (₹) *</label>
            <input
              type="number"
              className="form-input"
              value={dealValue}
              onChange={(e) => setDealValue(Number(e.target.value))}
              required
              min={1}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Sale Notes / Unit Details</label>
            <textarea
              className="form-textarea"
              placeholder="Unit #, payment scheme, registration date..."
              value={dealNotes}
              onChange={(e) => setDealNotes(e.target.value)}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
            <button type="button" onClick={() => setIsConvertModalOpen(false)} className="btn btn-secondary btn-sm">Cancel</button>
            <button type="submit" className="btn btn-success btn-sm" disabled={isSubmitting}>
              {isSubmitting ? 'Converting...' : 'Finalize Sale Conversion'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Lead Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete Customer Lead"
      >
        {actionError && (
          <div style={{ padding: '10px 14px', background: 'var(--danger-light)', color: '#fca5a5', borderRadius: 'var(--radius-md)', marginBottom: '16px', fontSize: '0.8125rem' }}>
            {actionError}
          </div>
        )}
        <div style={{ marginBottom: '20px' }}>
          <p style={{ color: 'var(--text-primary)', fontSize: '0.9375rem', lineHeight: '1.5' }}>
            Are you sure you want to permanently delete lead <strong style={{ color: '#fff' }}>{lead.name}</strong> ({lead.phone})?
          </p>
          <div style={{ marginTop: '12px', padding: '12px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: 'var(--radius-sm)', fontSize: '0.8125rem', color: '#fca5a5' }}>
            Warning: All notes, call logs, follow-ups, and sales associated with this lead will be permanently deleted.
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button type="button" onClick={() => setIsDeleteModalOpen(false)} className="btn btn-secondary btn-sm" disabled={isDeleting}>Cancel</button>
          <button id="confirm-delete-lead-detail-btn" type="button" onClick={handleDeleteLead} className="btn btn-danger btn-sm" disabled={isDeleting}>
            {isDeleting ? 'Deleting...' : 'Permanently Delete Lead'}
          </button>
        </div>
      </Modal>
    </div>
  );
};
