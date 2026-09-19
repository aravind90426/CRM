import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Users,
  Search,
  Filter,
  PlusCircle,
  PhoneCall,
  Eye,
  Briefcase,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  Trash2,
} from 'lucide-react';
import { leadsApi, projectsApi, usersApi } from '../../api';
import { LeadSummary, Project, User } from '../../types';
import { StatusBadge, OutcomeBadge } from '../../components/common/Badge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import { Modal } from '../../components/common/Modal';
import { useAuth } from '../../context/AuthContext';
import { getErrorMessage } from '../../api/client';

export const LeadsListPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isAdmin } = useAuth();

  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(() => {
    const p = searchParams.get('projectId');
    return p ? Number(p) : null;
  });

  const [leads, setLeads] = useState<LeadSummary[]>([]);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(0);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [outcomeFilter, setOutcomeFilter] = useState('');

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add Lead Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [agents, setAgents] = useState<User[]>([]);
  const [newLead, setNewLead] = useState({
    projectId: 0,
    name: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    state: '',
    source: 'Website Form',
    status: 'NEW',
    businessOutcome: '',
    assignedUserId: undefined as number | undefined,
    additionalInfo: '',
  });
  const [modalError, setModalError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete Lead Modal
  const [deleteConfirmLead, setDeleteConfirmLead] = useState<LeadSummary | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    loadProjects();
    if (isAdmin) {
      loadAgents();
    }
  }, [isAdmin]);

  useEffect(() => {
    loadLeads();
  }, [selectedProjectId, currentPage, statusFilter, outcomeFilter]);

  const loadProjects = async () => {
    try {
      const data = await projectsApi.getProjects();
      setProjects(data);
      if (!selectedProjectId && data.length > 0 && !searchParams.get('all')) {
        // default to first project or null for all
      }
    } catch (err) {
      console.error('Failed to load projects', err);
    }
  };

  const loadAgents = async () => {
    try {
      const data = await usersApi.getUsers({ size: 100 });
      setAgents(data.content.filter((u) => u.status === 'ACTIVE'));
    } catch (err) {
      console.error('Failed to load agents', err);
    }
  };

  const loadLeads = async (search = searchQuery) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await leadsApi.getLeads({
        projectId: selectedProjectId || undefined,
        status: statusFilter || undefined,
        outcome: outcomeFilter || undefined,
        search: search || undefined,
        page: currentPage,
        size: 10,
      });
      setLeads(data.content);
      setTotalElements(data.totalElements);
      setTotalPages(data.totalPages);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteLead = async () => {
    if (!deleteConfirmLead) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await leadsApi.deleteLead(deleteConfirmLead.id);
      setDeleteConfirmLead(null);
      loadLeads();
    } catch (err) {
      setDeleteError(getErrorMessage(err));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(0);
    loadLeads(searchQuery);
  };

  const handleProjectSelect = (projId: number | null) => {
    setSelectedProjectId(projId);
    setCurrentPage(0);
    if (projId) {
      setSearchParams({ projectId: String(projId) });
    } else {
      setSearchParams({});
    }
  };

  const handleOpenAddModal = () => {
    setNewLead({
      projectId: selectedProjectId || (projects[0]?.id ?? 0),
      name: '',
      phone: '',
      email: '',
      address: '',
      city: '',
      state: '',
      source: 'Website Form',
      status: 'NEW',
      businessOutcome: '',
      assignedUserId: undefined,
      additionalInfo: '',
    });
    setModalError(null);
    setIsAddModalOpen(true);
  };

  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLead.projectId || !newLead.name || !newLead.phone) {
      setModalError('Project, Customer Name, and Phone Number are required.');
      return;
    }

    setModalError(null);
    setIsSubmitting(true);
    try {
      await leadsApi.createLead({
        ...newLead,
        assignedUserId: newLead.assignedUserId ? Number(newLead.assignedUserId) : undefined,
      });
      setIsAddModalOpen(false);
      loadLeads();
    } catch (err) {
      setModalError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeProjectName = selectedProjectId
    ? projects.find((p) => p.id === selectedProjectId)?.name || 'Project'
    : 'All Projects';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.03em' }}>
            Lead Management
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '2px' }}>
            Explore customer pipeline, track interactions, and manage lead lifecycles.
          </p>
        </div>

        {isAdmin && (
          <button
            id="add-lead-modal-btn"
            onClick={handleOpenAddModal}
            className="btn btn-primary btn-md"
          >
            <PlusCircle size={18} />
            <span>Create New Lead</span>
          </button>
        )}
      </div>

      {/* Project Selector Tabs at the Top (Requirement #23) */}
      <div className="card" style={{ padding: '14px 18px' }}>
        <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: '10px' }}>
          Select Campaign / Project
        </div>

        <div className="tabs-nav" style={{ margin: 0, padding: 0, border: 'none' }}>
          <button
            type="button"
            onClick={() => handleProjectSelect(null)}
            className={`tab-btn ${selectedProjectId === null ? 'active' : ''}`}
          >
            All Projects
          </button>
          {projects.map((proj) => (
            <button
              key={proj.id}
              type="button"
              onClick={() => handleProjectSelect(proj.id)}
              className={`tab-btn ${selectedProjectId === proj.id ? 'active' : ''}`}
            >
              {proj.name}
            </button>
          ))}
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div
        className="card"
        style={{
          padding: '16px 20px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '12px',
          justifyContent: 'space-between',
        }}
      >
        <form onSubmit={handleSearch} style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '1 1 320px' }}>
          <div style={{ position: 'relative', width: '100%' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              id="leads-search-input"
              type="text"
              className="form-input"
              style={{ paddingLeft: '38px' }}
              placeholder="Search by name, phone, or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button type="submit" className="btn btn-secondary btn-sm" style={{ height: '40px' }}>
            Search
          </button>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <select
            className="form-select"
            style={{ width: 'auto', minWidth: '130px' }}
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(0); }}
          >
            <option value="">All Statuses</option>
            <option value="NEW">New</option>
            <option value="CONTACTED">Contacted</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="FOLLOW_UP">Follow Up</option>
            <option value="CONVERTED">Converted</option>
            <option value="CLOSED">Closed</option>
          </select>

          <select
            className="form-select"
            style={{ width: 'auto', minWidth: '150px' }}
            value={outcomeFilter}
            onChange={(e) => { setOutcomeFilter(e.target.value); setCurrentPage(0); }}
          >
            <option value="">All Outcomes</option>
            <option value="INTERESTED">Interested</option>
            <option value="NOT_INTERESTED">Not Interested</option>
            <option value="FOLLOW_UP">Follow Up</option>
            <option value="WRONG_NUMBER">Wrong Number</option>
            <option value="JUNK">Junk</option>
            <option value="CONVERTED">Converted</option>
          </select>
        </div>
      </div>

      {/* Selected Project Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 4px' }}>
        <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
          Showing leads for: <strong style={{ color: 'var(--text-primary)' }}>{activeProjectName}</strong> ({totalElements} found)
        </div>
      </div>

      {/* Leads Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {isLoading ? (
          <LoadingSpinner message="Fetching leads..." />
        ) : error ? (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--danger)' }}>
            <AlertCircle size={32} style={{ margin: '0 auto 8px' }} />
            <div>{error}</div>
          </div>
        ) : leads.length === 0 ? (
          <EmptyState
            title="No Leads Found"
            description="No leads match your active filters or campaign selection. Try clearing filters or create a new lead."
            action={
              isAdmin ? (
                <button onClick={handleOpenAddModal} className="btn btn-primary btn-sm">
                  <PlusCircle size={16} />
                  <span>Create First Lead</span>
                </button>
              ) : undefined
            }
          />
        ) : (
          <div className="table-container" style={{ border: 'none' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Lead Name</th>
                  <th>Phone</th>
                  <th>Project</th>
                  <th>Lead Status</th>
                  <th>Current Owner</th>
                  <th>Business Outcome</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => (
                  <tr key={lead.id} id={`lead-row-${lead.id}`}>
                    <td>
                      <div
                        onClick={() => navigate(`/leads/${lead.id}`)}
                        style={{ fontWeight: 700, color: 'var(--text-primary)', cursor: 'pointer' }}
                        className="hover-underline"
                      >
                        {lead.name}
                      </div>
                      {lead.email && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{lead.email}</div>
                      )}
                    </td>
                    <td style={{ fontWeight: 600 }}>{lead.phone}</td>
                    <td>
                      <span className="badge badge-secondary">{lead.projectName || lead.project?.name || '—'}</span>
                    </td>
                    <td>
                      <StatusBadge status={lead.status} />
                    </td>
                    <td>
                      {(lead.currentOwner || lead.currentOwnerName) ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <UserCheck size={14} style={{ color: 'var(--primary)' }} />
                          <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>{lead.currentOwnerName || lead.currentOwner?.name}</span>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--warning)', fontSize: '0.75rem', fontWeight: 600 }}>UNASSIGNED</span>
                      )}
                    </td>
                    <td>
                      <OutcomeBadge outcome={lead.businessOutcome} />
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button
                          id={`view-lead-${lead.id}`}
                          onClick={() => navigate(`/leads/${lead.id}`)}
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '6px 10px' }}
                          title="View Complete Lead Lifecycle"
                        >
                          <Eye size={14} />
                          <span>Details</span>
                        </button>
                        <button
                          id={`dial-lead-${lead.id}`}
                          onClick={() => navigate(`/dialler?leadId=${lead.id}`)}
                          className="btn btn-primary btn-sm"
                          style={{ padding: '6px 10px' }}
                          title="Call Lead in Dialler"
                        >
                          <PhoneCall size={14} />
                        </button>
                        {isAdmin && (
                          <button
                            id={`delete-lead-${lead.id}-btn`}
                            onClick={() => { setDeleteError(null); setDeleteConfirmLead(lead); }}
                            className="btn btn-danger btn-sm"
                            style={{ padding: '6px 8px' }}
                            title="Permanently Delete Lead"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Server Pagination */}
        {totalPages > 1 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 20px',
              borderTop: '1px solid var(--border-subtle)',
            }}
          >
            <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
              Page {currentPage + 1} of {totalPages}
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                disabled={currentPage === 0}
                onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                className="btn btn-secondary btn-sm"
              >
                <ChevronLeft size={16} />
                <span>Prev</span>
              </button>
              <button
                disabled={currentPage >= totalPages - 1}
                onClick={() => setCurrentPage((p) => p + 1)}
                className="btn btn-secondary btn-sm"
              >
                <span>Next</span>
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add Lead Modal with Duplicate Phone Rule (Section #8) */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Create New Lead"
      >
        {modalError && (
          <div
            style={{
              padding: '10px 14px',
              background: 'var(--danger-light)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 'var(--radius-md)',
              color: '#fca5a5',
              fontSize: '0.8125rem',
              marginBottom: '16px',
            }}
          >
            {modalError}
          </div>
        )}

        <form onSubmit={handleCreateLead}>
          <div className="form-group">
            <label className="form-label">Project Campaign *</label>
            <select
              id="new-lead-project"
              className="form-select"
              value={newLead.projectId}
              onChange={(e) => setNewLead({ ...newLead, projectId: Number(e.target.value) })}
              required
            >
              <option value="">Select Project</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label className="form-label">Customer Name *</label>
              <input
                id="new-lead-name"
                type="text"
                className="form-input"
                placeholder="e.g. Ramesh Chandra"
                value={newLead.name}
                onChange={(e) => setNewLead({ ...newLead, name: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Phone Number *</label>
              <input
                id="new-lead-phone"
                type="text"
                className="form-input"
                placeholder="+91 9876543210"
                value={newLead.phone}
                onChange={(e) => setNewLead({ ...newLead, phone: e.target.value })}
                required
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                id="new-lead-email"
                type="email"
                className="form-input"
                placeholder="customer@gmail.com"
                value={newLead.email}
                onChange={(e) => setNewLead({ ...newLead, email: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Source</label>
              <input
                type="text"
                className="form-input"
                placeholder="Google Ads, Meta, Referral..."
                value={newLead.source}
                onChange={(e) => setNewLead({ ...newLead, source: e.target.value })}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label className="form-label">City</label>
              <input
                type="text"
                className="form-input"
                placeholder="City"
                value={newLead.city}
                onChange={(e) => setNewLead({ ...newLead, city: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Assign to Sales Rep</label>
              <select
                id="new-lead-agent"
                className="form-select"
                value={newLead.assignedUserId || ''}
                onChange={(e) => setNewLead({ ...newLead, assignedUserId: e.target.value ? Number(e.target.value) : undefined })}
              >
                <option value="">Leave Unassigned</option>
                {agents.map((ag) => (
                  <option key={ag.id} value={ag.id}>{ag.name} ({ag.email})</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Additional Requirements / Notes</label>
            <textarea
              className="form-textarea"
              placeholder="Budget, apartment preferences, timeline..."
              value={newLead.additionalInfo}
              onChange={(e) => setNewLead({ ...newLead, additionalInfo: e.target.value })}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="btn btn-secondary btn-md"
            >
              Cancel
            </button>
            <button
              id="submit-create-lead-btn"
              type="submit"
              className="btn btn-primary btn-md"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Creating Lead...' : 'Save Lead'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Lead Confirmation Modal */}
      <Modal
        isOpen={Boolean(deleteConfirmLead)}
        onClose={() => setDeleteConfirmLead(null)}
        title="Delete Customer Lead"
      >
        {deleteError && (
          <div style={{ padding: '10px 14px', background: 'var(--danger-light)', color: '#fca5a5', borderRadius: 'var(--radius-md)', marginBottom: '16px', fontSize: '0.8125rem' }}>
            {deleteError}
          </div>
        )}
        <div style={{ marginBottom: '20px' }}>
          <p style={{ color: 'var(--text-primary)', fontSize: '0.9375rem', lineHeight: '1.5' }}>
            Are you sure you want to permanently delete lead <strong style={{ color: '#fff' }}>{deleteConfirmLead?.name}</strong> ({deleteConfirmLead?.phone})?
          </p>
          <div style={{ marginTop: '12px', padding: '12px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: 'var(--radius-sm)', fontSize: '0.8125rem', color: '#fca5a5' }}>
            Warning: All notes, call recordings, follow-ups, and sales conversions associated with this lead will be permanently deleted.
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button type="button" onClick={() => setDeleteConfirmLead(null)} className="btn btn-secondary btn-sm" disabled={isDeleting}>Cancel</button>
          <button id="confirm-delete-lead-btn" type="button" onClick={handleDeleteLead} className="btn btn-danger btn-sm" disabled={isDeleting}>
            {isDeleting ? 'Deleting...' : 'Permanently Delete Lead'}
          </button>
        </div>
      </Modal>
    </div>
  );
};
