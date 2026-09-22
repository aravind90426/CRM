import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Briefcase,
  PhoneCall,
  UserCheck,
  CalendarCheck,
  BarChart3,
  FileText,
  Sheet,
  Settings,
  LogOut,
  PhoneForwarded,
  Layers,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (e) {
      console.warn('Logout error:', e);
    }
    navigate('/login', { replace: true, state: null });
  };

  const adminNav = [
    { to: '/admin/dashboard', label: 'Executive Dashboard', icon: <LayoutDashboard size={19} /> },
    { to: '/leads', label: 'Leads Hub', icon: <Users size={19} /> },
    { to: '/admin/projects', label: 'Projects', icon: <Briefcase size={19} /> },
    { to: '/admin/assignments', label: 'Lead Assignments', icon: <UserCheck size={19} /> },
    { to: '/dialler', label: 'Dialler & Logger', icon: <PhoneCall size={19} /> },
    { to: '/admin/calls', label: 'Call History', icon: <PhoneForwarded size={19} /> },
    { to: '/follow-ups', label: 'Follow-ups', icon: <CalendarCheck size={19} /> },
    { to: '/admin/users', label: 'User Management', icon: <Layers size={19} /> },
    { to: '/admin/reports', label: 'Reports Hub', icon: <BarChart3 size={19} /> },
    { to: '/admin/audit-logs', label: 'Audit Trail', icon: <FileText size={19} /> },
    { to: '/admin/google-sheets', label: 'Sync History', icon: <Sheet size={19} /> },
    { to: '/settings', label: 'Settings', icon: <Settings size={19} /> },
  ];

  const userNav = [
    { to: '/user/home', label: 'My Dashboard', icon: <LayoutDashboard size={19} /> },
    { to: '/dialler', label: 'Dialler & Call Logger', icon: <PhoneCall size={19} /> },
    { to: '/leads', label: 'My Leads', icon: <Users size={19} /> },
    { to: '/follow-ups', label: 'Follow-ups Console', icon: <CalendarCheck size={19} /> },
    { to: '/settings', label: 'Account Settings', icon: <Settings size={19} /> },
  ];

  const navItems = isAdmin ? adminNav : userNav;

  return (
    <>
      {/* Backdrop for mobile */}
      {isOpen && (
        <div
          className="sidebar-backdrop"
          onClick={onClose}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(4px)',
            zIndex: 90,
          }}
        />
      )}

      <aside
        className={`sidebar ${isOpen ? 'sidebar-open' : ''}`}
        style={{
          width: 'var(--sidebar-width)',
          height: '100vh',
          position: 'fixed',
          top: 0,
          left: 0,
          background: 'var(--bg-surface)',
          borderRight: '1px solid var(--border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 100,
          transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Brand Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: 'var(--radius-md)',
                background: 'linear-gradient(135deg, var(--primary) 0%, #4338ca 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                boxShadow: '0 4px 12px var(--primary-glow)',
              }}
            >
              <PhoneCall size={20} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '1.125rem', letterSpacing: '-0.02em', color: '#fff' }}>
                Calling<span style={{ color: 'var(--primary)' }}>CRM</span>
              </div>
              <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Enterprise Sales
              </div>
            </div>
          </div>

          <button
            className="btn btn-ghost btn-sm mobile-close-btn"
            onClick={onClose}
            style={{ padding: '6px', borderRadius: 'var(--radius-full)' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* User Card */}
        <div
          style={{
            margin: '16px',
            padding: '12px 14px',
            background: 'rgba(255, 255, 255, 0.03)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: isAdmin ? 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)' : 'linear-gradient(135deg, #3b82f6 0%, #10b981 100%)',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '0.875rem',
            }}
          >
            {user?.name?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div style={{ overflow: 'hidden', flex: 1 }}>
            <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user?.name}
            </div>
            <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
              {isAdmin ? 'ADMINISTRATOR' : 'SALES AGENT'}
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '8px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}
        >
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onClose}
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            >
              <span className="sidebar-icon">{item.icon}</span>
              <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Footer Logout */}
        <div style={{ padding: '16px', borderTop: '1px solid var(--border-subtle)' }}>
          <button
            onClick={handleLogout}
            className="btn btn-ghost"
            style={{
              width: '100%',
              justifyContent: 'flex-start',
              color: 'var(--text-secondary)',
              padding: '10px 14px',
            }}
          >
            <LogOut size={18} style={{ color: 'var(--danger)' }} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      <style>{`
        .sidebar-link {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 14px;
          border-radius: var(--radius-md);
          color: var(--text-secondary);
          transition: var(--transition);
        }
        .sidebar-link:hover {
          color: var(--text-primary);
          background: rgba(255, 255, 255, 0.04);
        }
        .sidebar-link.active {
          color: white;
          background: linear-gradient(135deg, rgba(99, 102, 241, 0.25) 0%, rgba(79, 70, 229, 0.15) 100%);
          border: 1px solid rgba(99, 102, 241, 0.35);
          box-shadow: 0 2px 8px rgba(99, 102, 241, 0.2);
        }
        .sidebar-link.active .sidebar-icon {
          color: var(--primary);
        }
        @media (min-width: 1024px) {
          .mobile-close-btn { display: none !important; }
          .sidebar-backdrop { display: none !important; }
        }
        @media (max-width: 1023px) {
          .sidebar {
            transform: translateX(-100%);
          }
          .sidebar.sidebar-open {
            transform: translateX(0);
          }
        }
      `}</style>
    </>
  );
};
