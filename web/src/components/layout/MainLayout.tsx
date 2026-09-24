import React, { useState } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
import { MobileBottomNav } from './MobileBottomNav';
import { useAuth } from '../../context/AuthContext';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { EmergencyCheckInModal } from '../attendance/EmergencyCheckInModal';

export const MainLayout: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  if (isLoading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <LoadingSpinner message="Authenticating session..." size={42} />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: 'var(--bg-main)' }}>
      {/* Mandatory Emergency Check-In Alert (User & Admin) */}
      <EmergencyCheckInModal />

      {/* Sidebar Navigation */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Workspace Area */}
      <div
        className="main-workspace"
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          transition: 'margin-left 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <Navbar onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />

        <main
          className="page-content"
          style={{
            flex: 1,
            padding: '24px',
            maxWidth: '1600px',
            width: '100%',
            margin: '0 auto',
            boxSizing: 'border-box',
          }}
        >
          <Outlet />
        </main>

        <MobileBottomNav />
      </div>

      <style>{`
        @media (min-width: 1024px) {
          .main-workspace {
            margin-left: var(--sidebar-width);
          }
        }
        @media (max-width: 1023px) {
          .page-content {
            padding: 16px;
            margin-bottom: var(--bottom-nav-height);
          }
        }
      `}</style>
    </div>
  );
};
