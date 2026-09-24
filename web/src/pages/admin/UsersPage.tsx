import React, { useEffect, useState } from 'react';
import {
  Users,
  PlusCircle,
  Search,
  Shield,
  UserCheck,
  UserX,
  AlertCircle,
  Mail,
  Phone,
  CheckCircle2,
  Trash2,
  Edit2,
  Clock,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { usersApi } from '../../api';
import { User } from '../../types';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { Modal } from '../../components/common/Modal';
import { getErrorMessage } from '../../api/client';

export const UsersPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Add User Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    role: 'ROLE_USER',
    shift: 'SHIFT_1000_1900',
  });
  const [modalError, setModalError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit User Modal
  const [editUser, setEditUser] = useState<User | null>(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    phone: '',
    role: 'ROLE_USER',
    shift: 'SHIFT_1000_1900',
  });
  const [editModalError, setEditModalError] = useState<string | null>(null);
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);

  // Delete User Confirmation Modal
  const [deleteConfirmUser, setDeleteConfirmUser] = useState<User | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    loadUsers();
  }, [roleFilter]);

  const loadUsers = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await usersApi.getUsers({
        role: roleFilter || undefined,
        search: searchQuery || undefined,
        size: 50,
      });
      setUsers(data?.content || []);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadUsers();
  };

  const handleToggleStatus = async (user: User) => {
    const nextStatus = user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await usersApi.toggleStatus(user.id, nextStatus);
      loadUsers();
    } catch (err) {
      alert(getErrorMessage(err));
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteConfirmUser) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await usersApi.deleteUser(deleteConfirmUser.id);
      setDeleteConfirmUser(null);
      loadUsers();
    } catch (err) {
      setDeleteError(getErrorMessage(err));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    setIsSubmitting(true);
    try {
      await usersApi.createUser(formData);
      setIsModalOpen(false);
      setFormData({ name: '', email: '', phone: '', password: '', role: 'ROLE_USER', shift: 'SHIFT_1000_1900' });
      loadUsers();
    } catch (err) {
      setModalError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditModal = (u: User) => {
    setEditUser(u);
    setEditFormData({
      name: u.name,
      phone: u.phone || '',
      role: u.role || 'ROLE_USER',
      shift: u.shift || 'SHIFT_1000_1900',
    });
    setEditModalError(null);
  };

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUser) return;
    setEditModalError(null);
    setIsEditSubmitting(true);
    try {
      await usersApi.updateUser(editUser.id, editFormData);
      setEditUser(null);
      loadUsers();
    } catch (err) {
      setEditModalError(getErrorMessage(err));
    } finally {
      setIsEditSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.03em' }}>
            User Management
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '2px' }}>
            Provision employee access, manage roles, work shifts, and review statuses.
          </p>
        </div>

        <button
          id="add-user-btn"
          onClick={() => { setModalError(null); setIsModalOpen(true); }}
          className="btn btn-primary btn-md"
        >
          <PlusCircle size={18} />
          <span>Add New User</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="card" style={{ padding: '16px 20px', display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'space-between' }}>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '8px', flex: '1 1 300px' }}>
          <div style={{ position: 'relative', width: '100%' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="form-input"
              style={{ paddingLeft: '38px' }}
              placeholder="Search by user name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button type="submit" className="btn btn-secondary btn-sm">Search</button>
        </form>

        <select
          className="form-select"
          style={{ width: 'auto', minWidth: '150px' }}
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
        >
          <option value="">All Roles</option>
          <option value="ROLE_ADMIN">Administrator</option>
          <option value="ROLE_USER">Sales Agent</option>
        </select>
      </div>

      {/* Users Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {isLoading ? (
          <LoadingSpinner message="Loading user directory..." />
        ) : error ? (
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--danger)' }}>{error}</div>
        ) : (
          <div className="table-container" style={{ border: 'none' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Employee Name</th>
                  <th>Contact Information</th>
                  <th>System Role</th>
                  <th>Work Shift</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} id={`user-row-${u.id}`}>
                    <td>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{u.name}</div>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.8125rem' }}>{u.email}</div>
                      {u.phone && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{u.phone}</div>}
                    </td>
                    <td>
                      <span className={`badge ${u.role === 'ROLE_ADMIN' ? 'badge-primary' : 'badge-info'}`}>
                        <Shield size={12} />
                        <span>{u.role === 'ROLE_ADMIN' ? 'ADMIN' : 'AGENT'}</span>
                      </span>
                    </td>
                    <td>
                      <span className="badge badge-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem' }}>
                        <Clock size={11} />
                        <span>{u.shiftDisplayName || '10:00 AM – 07:00 PM'}</span>
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${u.status === 'ACTIVE' ? 'badge-success' : 'badge-danger'}`}>
                        <span className="badge-dot" />
                        {u.status}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <button
                          id={`edit-user-${u.id}-btn`}
                          onClick={() => openEditModal(u)}
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '6px 8px' }}
                          title="Edit User and Work Shift"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          id={`toggle-user-${u.id}-btn`}
                          onClick={() => handleToggleStatus(u)}
                          className={`btn ${u.status === 'ACTIVE' ? 'btn-secondary' : 'btn-success'} btn-sm`}
                          style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                        >
                          {u.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          id={`delete-user-${u.id}-btn`}
                          onClick={() => { setDeleteError(null); setDeleteConfirmUser(u); }}
                          disabled={currentUser?.id === u.id}
                          className="btn btn-danger btn-sm"
                          style={{ padding: '6px 8px', opacity: currentUser?.id === u.id ? 0.35 : 1 }}
                          title={currentUser?.id === u.id ? 'Cannot delete your own active account' : 'Permanently Delete User'}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add User Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create New User Account"
      >
        {modalError && (
          <div style={{ padding: '10px 14px', background: 'var(--danger-light)', color: '#fca5a5', borderRadius: 'var(--radius-md)', marginBottom: '16px', fontSize: '0.8125rem' }}>
            {modalError}
          </div>
        )}
        <form onSubmit={handleCreateUser}>
          <div className="form-group">
            <label className="form-label">Full Name *</label>
            <input
              id="new-user-name"
              type="text"
              className="form-input"
              placeholder="e.g. Vikramaditya Verma"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Email Address *</label>
            <input
              id="new-user-email"
              type="email"
              className="form-input"
              placeholder="rep@crm.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label className="form-label">Phone</label>
              <input
                type="text"
                className="form-input"
                placeholder="+91 98765 43210"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Role *</label>
              <select
                id="new-user-role"
                className="form-select"
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                required
              >
                <option value="ROLE_USER">Sales Agent (Standard)</option>
                <option value="ROLE_ADMIN">Administrator (Full Access)</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Work Shift *</label>
            <select
              id="new-user-shift"
              className="form-select"
              value={formData.shift}
              onChange={(e) => setFormData({ ...formData, shift: e.target.value })}
              required
            >
              <option value="SHIFT_1000_1900">10:00 AM – 07:00 PM (Default)</option>
              <option value="SHIFT_0900_1800">09:00 AM – 06:00 PM</option>
              <option value="SHIFT_0930_1830">09:30 AM – 06:30 PM</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Initial Password *</label>
            <input
              id="new-user-password"
              type="password"
              className="form-input"
              placeholder="Minimum 6 characters"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
              minLength={6}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
            <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-secondary btn-sm">Cancel</button>
            <button id="submit-create-user-btn" type="submit" className="btn btn-primary btn-sm" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Account'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit User Modal */}
      <Modal
        isOpen={Boolean(editUser)}
        onClose={() => setEditUser(null)}
        title={`Edit User: ${editUser?.name}`}
      >
        {editModalError && (
          <div style={{ padding: '10px 14px', background: 'var(--danger-light)', color: '#fca5a5', borderRadius: 'var(--radius-md)', marginBottom: '16px', fontSize: '0.8125rem' }}>
            {editModalError}
          </div>
        )}
        <form onSubmit={handleEditUser}>
          <div className="form-group">
            <label className="form-label">Full Name *</label>
            <input
              id="edit-user-name"
              type="text"
              className="form-input"
              value={editFormData.name}
              onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label className="form-label">Phone</label>
              <input
                type="text"
                className="form-input"
                value={editFormData.phone}
                onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Role *</label>
              <select
                id="edit-user-role"
                className="form-select"
                value={editFormData.role}
                onChange={(e) => setEditFormData({ ...editFormData, role: e.target.value })}
                required
              >
                <option value="ROLE_USER">Sales Agent (Standard)</option>
                <option value="ROLE_ADMIN">Administrator (Full Access)</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Work Shift *</label>
            <select
              id="edit-user-shift"
              className="form-select"
              value={editFormData.shift}
              onChange={(e) => setEditFormData({ ...editFormData, shift: e.target.value })}
              required
            >
              <option value="SHIFT_1000_1900">10:00 AM – 07:00 PM</option>
              <option value="SHIFT_0900_1800">09:00 AM – 06:00 PM</option>
              <option value="SHIFT_0930_1830">09:30 AM – 06:30 PM</option>
            </select>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
            <button type="button" onClick={() => setEditUser(null)} className="btn btn-secondary btn-sm">Cancel</button>
            <button id="submit-edit-user-btn" type="submit" className="btn btn-primary btn-sm" disabled={isEditSubmitting}>
              {isEditSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete User Confirmation Modal */}
      <Modal
        isOpen={Boolean(deleteConfirmUser)}
        onClose={() => setDeleteConfirmUser(null)}
        title="Delete User Account"
      >
        {deleteError && (
          <div style={{ padding: '10px 14px', background: 'var(--danger-light)', color: '#fca5a5', borderRadius: 'var(--radius-md)', marginBottom: '16px', fontSize: '0.8125rem' }}>
            {deleteError}
          </div>
        )}
        <div style={{ marginBottom: '20px' }}>
          <p style={{ color: 'var(--text-primary)', fontSize: '0.9375rem', lineHeight: '1.5' }}>
            Are you sure you want to permanently delete user <strong style={{ color: '#fff' }}>{deleteConfirmUser?.name}</strong> ({deleteConfirmUser?.email})?
          </p>
          <div style={{ marginTop: '12px', padding: '12px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: 'var(--radius-sm)', fontSize: '0.8125rem', color: '#fca5a5' }}>
            Warning: This action is permanent. Any active lead assignments will be returned to the unassigned queue.
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button type="button" onClick={() => setDeleteConfirmUser(null)} className="btn btn-secondary btn-sm" disabled={isDeleting}>Cancel</button>
          <button id="confirm-delete-user-btn" type="button" onClick={handleDeleteUser} className="btn btn-danger btn-sm" disabled={isDeleting}>
            {isDeleting ? 'Deleting...' : 'Permanently Delete User'}
          </button>
        </div>
      </Modal>
    </div>
  );
};
