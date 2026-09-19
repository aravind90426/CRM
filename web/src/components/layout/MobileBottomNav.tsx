import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, PhoneCall, Users, CalendarCheck, Settings } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const MobileBottomNav: React.FC = () => {
  const { isAdmin } = useAuth();

  const homeRoute = isAdmin ? '/admin/dashboard' : '/user/home';

  return (
    <nav
      className="mobile-bottom-nav"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: 'var(--bottom-nav-height)',
        background: 'rgba(17, 24, 39, 0.95)',
        backdropFilter: 'blur(16px)',
        borderTop: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        zIndex: 85,
        padding: '0 8px',
      }}
    >
      <NavLink
        to={homeRoute}
        className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}
      >
        <LayoutDashboard size={20} />
        <span>Home</span>
      </NavLink>

      <NavLink
        to="/dialler"
        className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}
      >
        <div
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--primary) 0%, #4338ca 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            boxShadow: '0 2px 10px var(--primary-glow)',
            marginTop: '-16px',
          }}
        >
          <PhoneCall size={20} />
        </div>
        <span>Dialler</span>
      </NavLink>

      <NavLink
        to="/leads"
        className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}
      >
        <Users size={20} />
        <span>Leads</span>
      </NavLink>

      <NavLink
        to="/follow-ups"
        className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}
      >
        <CalendarCheck size={20} />
        <span>Follow-ups</span>
      </NavLink>

      <NavLink
        to="/settings"
        className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}
      >
        <Settings size={20} />
        <span>Settings</span>
      </NavLink>

      <style>{`
        .bottom-nav-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          color: var(--text-muted);
          font-size: 0.6875rem;
          font-weight: 600;
          transition: var(--transition);
        }
        .bottom-nav-item.active {
          color: var(--primary);
        }
        @media (min-width: 1024px) {
          .mobile-bottom-nav { display: none !important; }
        }
      `}</style>
    </nav>
  );
};
