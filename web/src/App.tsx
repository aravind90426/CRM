import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { MainLayout } from './components/layout/MainLayout';
import { AdminRoute, UserRoute } from './routes/RouteGuards';

// Pages
import { LoginPage } from './pages/auth/LoginPage';
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { UserHomePage } from './pages/user/UserHomePage';
import { LeadsListPage } from './pages/leads/LeadsListPage';
import { LeadDetailsPage } from './pages/leads/LeadDetailsPage';
import { DiallerPage } from './pages/dialler/DiallerPage';
import { FollowUpsPage } from './pages/followups/FollowUpsPage';
import { UsersPage } from './pages/admin/UsersPage';
import { ProjectsPage } from './pages/admin/ProjectsPage';
import { AssignmentsPage } from './pages/admin/AssignmentsPage';
import { CallsHistoryPage } from './pages/calls/CallsHistoryPage';
import { ReportsPage } from './pages/admin/ReportsPage';
import { AuditLogsPage } from './pages/admin/AuditLogsPage';
import { GoogleSheetsPage } from './pages/admin/GoogleSheetsPage';
import { SettingsPage } from './pages/settings/SettingsPage';

// Root index redirect based on role
const RootRedirect: React.FC = () => {
  const { isAuthenticated, isAdmin, isLoading } = useAuth();
  if (isLoading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Navigate to={isAdmin ? '/admin/dashboard' : '/user/home'} replace />;
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Auth Route */}
          <Route path="/login" element={<LoginPage />} />

          {/* Protected Application Workspace */}
          <Route element={<MainLayout />}>
            <Route path="/" element={<RootRedirect />} />

            {/* Common Authenticated Routes */}
            <Route path="/leads" element={<LeadsListPage />} />
            <Route path="/leads/:id" element={<LeadDetailsPage />} />
            <Route path="/dialler" element={<DiallerPage />} />
            <Route path="/follow-ups" element={<FollowUpsPage />} />
            <Route path="/settings" element={<SettingsPage />} />

            {/* Sales Rep Home */}
            <Route element={<UserRoute />}>
              <Route path="/user/home" element={<UserHomePage />} />
            </Route>

            {/* Admin Exclusive Routes */}
            <Route element={<AdminRoute />}>
              <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
              <Route path="/admin/users" element={<UsersPage />} />
              <Route path="/admin/projects" element={<ProjectsPage />} />
              <Route path="/admin/assignments" element={<AssignmentsPage />} />
              <Route path="/admin/calls" element={<CallsHistoryPage />} />
              <Route path="/admin/reports" element={<ReportsPage />} />
              <Route path="/admin/audit-logs" element={<AuditLogsPage />} />
              <Route path="/admin/google-sheets" element={<GoogleSheetsPage />} />
            </Route>
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
