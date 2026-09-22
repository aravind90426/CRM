import React from 'react';
import { Menu, Bell, Shield, PhoneCall, PlusCircle, Search, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

interface NavbarProps {
  onToggleSidebar: () => void;
  title?: string;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleSidebar, title }) => {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    if (window.confirm('Are you sure you want to sign out?')) {
      try {
        await logout();
      } catch (e) {
        console.warn('Logout error:', e);
      }
      navigate('/login', { replace: true });
    }
  };

  return (
    <header
      style={{
        height: 'var(--navbar-height)',
        background: 'rgba(17, 24, 39, 0.8)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--border-subtle)',
        position: 'sticky',
        top: 0,
        zIndex: 80,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
      }}
    >
      {/* Left side: Hamburger & Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button
          className="btn btn-ghost btn-sm menu-toggle-btn"
          onClick={onToggleSidebar}
          style={{ padding: '8px' }}
          aria-label="Toggle Navigation"
        >
          <Menu size={22} />
        </button>

        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            {title || (isAdmin ? 'Admin Console' : 'Sales Workspace')}
          </h2>
        </div>
      </div>

      {/* Right side: Quick Actions & Status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Quick dial button */}
        <button
          onClick={() => navigate('/dialler')}
          className="btn btn-primary btn-sm"
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <PhoneCall size={16} />
          <span className="hidden-sm">Open Dialler</span>
        </button>

        {/* Role Badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            borderRadius: 'var(--radius-full)',
            background: isAdmin ? 'rgba(236, 72, 153, 0.15)' : 'rgba(99, 102, 241, 0.15)',
            border: `1px solid ${isAdmin ? 'rgba(236, 72, 153, 0.3)' : 'rgba(99, 102, 241, 0.3)'}`,
            color: isAdmin ? '#f472b6' : '#a5b4fc',
            fontSize: '0.75rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
          }}
        >
          <Shield size={14} />
          <span>{isAdmin ? 'ADMIN' : 'AGENT'}</span>
        </div>

        {/* Quick Sign Out Button */}
        <button
          onClick={handleLogout}
          className="btn btn-ghost btn-sm"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            color: 'var(--text-secondary)',
            padding: '6px 10px',
          }}
          title="Sign Out"
        >
          <LogOut size={16} style={{ color: 'var(--danger)' }} />
          <span className="hidden-sm">Sign Out</span>
        </button>
      </div>

      <style>{`
        @media (min-width: 1024px) {
          .menu-toggle-btn { display: none !important; }
        }
        @media (max-width: 640px) {
          .hidden-sm { display: none; }
        }
      `}</style>
    </header>
  );
};
