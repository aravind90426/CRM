import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Briefcase,
  PlusCircle,
  Users,
  CheckCircle2,
  AlertCircle,
  Edit2,
  ArrowUpRight,
  Trash2,
} from 'lucide-react';
import { projectsApi } from '../../api';
import { Project } from '../../types';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { Modal } from '../../components/common/Modal';
import { getErrorMessage } from '../../api/client';

export const ProjectsPage: React.FC = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '', status: 'ACTIVE' });
  const [modalError, setModalError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete Modal
  const [deleteConfirmProject, setDeleteConfirmProject] = useState<Project | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await projectsApi.getProjects();
      setProjects(Array.isArray(data) ? data : ((data as any)?.content || []));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingProject(null);
    setFormData({ name: '', description: '', status: 'ACTIVE' });
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (p: Project) => {
    setEditingProject(p);
    setFormData({ name: p.name, description: p.description || '', status: p.status });
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    setIsSubmitting(true);
    try {
      if (editingProject) {
        await projectsApi.updateProject(editingProject.id, formData);
      } else {
        await projectsApi.createProject(formData);
      }
      setIsModalOpen(false);
      loadProjects();
    } catch (err) {
      setModalError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (proj: Project) => {
    const nextStatus = proj.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await projectsApi.toggleStatus(proj.id, nextStatus);
      loadProjects();
    } catch (err) {
      alert(getErrorMessage(err));
    }
  };

  const handleDeleteProject = async () => {
    if (!deleteConfirmProject) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await projectsApi.deleteProject(deleteConfirmProject.id);
      setDeleteConfirmProject(null);
      loadProjects();
    } catch (err) {
      setDeleteError(getErrorMessage(err));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.03em' }}>
            Project Campaigns
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '2px' }}>
            Configure sales projects, manage campaigns, and track lead distribution.
          </p>
        </div>

        <button
          id="add-project-btn"
          onClick={handleOpenCreate}
          className="btn btn-primary btn-md"
        >
          <PlusCircle size={18} />
          <span>New Project Campaign</span>
        </button>
      </div>

      {isLoading ? (
        <LoadingSpinner message="Loading active projects..." />
      ) : error ? (
        <div style={{ color: 'var(--danger)', textAlign: 'center', padding: '24px' }}>{error}</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '18px' }}>
          {(projects || []).map((proj) => (
            <div key={proj.id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ padding: '10px', borderRadius: 'var(--radius-md)', background: 'rgba(99, 102, 241, 0.15)', color: 'var(--primary)' }}>
                      <Briefcase size={22} />
                    </div>
                    <div>
                      <h3 style={{ fontSize: '1.125rem', fontWeight: 700 }}>{proj.name}</h3>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Campaign ID #{proj.id}</span>
                    </div>
                  </div>
                  <span className={`badge ${proj.status === 'ACTIVE' ? 'badge-success' : 'badge-secondary'}`}>
                    <span className="badge-dot" />
                    {proj.status}
                  </span>
                </div>

                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', minHeight: '42px', marginBottom: '16px' }}>
                  {proj.description || 'No description provided.'}
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border-subtle)', paddingTop: '14px' }}>
                <button
                  onClick={() => navigate(`/leads?projectId=${proj.id}`)}
                  className="btn btn-primary btn-sm"
                  style={{ gap: '6px' }}
                >
                  <Users size={14} />
                  <span>View Project Leads</span>
                  <ArrowUpRight size={14} />
                </button>

                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    id={`edit-project-${proj.id}-btn`}
                    onClick={() => handleOpenEdit(proj)}
                    className="btn btn-secondary btn-sm"
                    style={{ padding: '6px' }}
                    title="Edit Campaign Details"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    id={`toggle-project-${proj.id}-btn`}
                    onClick={() => handleToggleStatus(proj)}
                    className={`btn ${proj.status === 'ACTIVE' ? 'btn-secondary' : 'btn-success'} btn-sm`}
                    style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                  >
                    {proj.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                  </button>
                  <button
                    id={`delete-project-${proj.id}-btn`}
                    onClick={() => { setDeleteError(null); setDeleteConfirmProject(proj); }}
                    className="btn btn-danger btn-sm"
                    style={{ padding: '6px 8px' }}
                    title="Permanently Delete Campaign"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Project Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingProject ? 'Edit Project Campaign' : 'Create Project Campaign'}
      >
        {modalError && (
          <div style={{ padding: '8px 12px', background: 'var(--danger-light)', color: '#fca5a5', borderRadius: 'var(--radius-sm)', marginBottom: '14px', fontSize: '0.8125rem' }}>
            {modalError}
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Project Name *</label>
            <input
              id="project-name-input"
              type="text"
              className="form-input"
              placeholder="e.g. Skyline Towers Luxury Residences"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Project Description</label>
            <textarea
              id="project-desc-input"
              className="form-textarea"
              placeholder="Project overview, location highlights, target demographic..."
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Campaign Status</label>
            <select
              className="form-select"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            >
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
            </select>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
            <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-secondary btn-sm">Cancel</button>
            <button id="save-project-btn" type="submit" className="btn btn-primary btn-sm" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : editingProject ? 'Update Campaign' : 'Create Campaign'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Project Confirmation Modal */}
      <Modal
        isOpen={Boolean(deleteConfirmProject)}
        onClose={() => setDeleteConfirmProject(null)}
        title="Delete Project Campaign"
      >
        {deleteError && (
          <div style={{ padding: '10px 14px', background: 'var(--danger-light)', color: '#fca5a5', borderRadius: 'var(--radius-md)', marginBottom: '16px', fontSize: '0.8125rem' }}>
            {deleteError}
          </div>
        )}
        <div style={{ marginBottom: '20px' }}>
          <p style={{ color: 'var(--text-primary)', fontSize: '0.9375rem', lineHeight: '1.5' }}>
            Are you sure you want to permanently delete campaign <strong style={{ color: '#fff' }}>{deleteConfirmProject?.name}</strong>?
          </p>
          <div style={{ marginTop: '12px', padding: '12px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: 'var(--radius-sm)', fontSize: '0.8125rem', color: '#fca5a5' }}>
            Warning: All leads associated with this campaign along with their notes, call history, and follow-ups will be permanently deleted.
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button type="button" onClick={() => setDeleteConfirmProject(null)} className="btn btn-secondary btn-sm" disabled={isDeleting}>Cancel</button>
          <button id="confirm-delete-project-btn" type="button" onClick={handleDeleteProject} className="btn btn-danger btn-sm" disabled={isDeleting}>
            {isDeleting ? 'Deleting...' : 'Permanently Delete Campaign'}
          </button>
        </div>
      </Modal>
    </div>
  );
};
