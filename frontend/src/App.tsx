import { Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import { Toaster } from 'sonner';
import './index.css';

import { AuthPage } from './pages/AuthPage';
import { DashboardPage } from './pages/DashboardPage';
import { ForgotPassword } from './pages/ForgotPassword';
import { ResetPassword } from './pages/ResetPassword';
import RolesPage from './pages/RolesPage';

import { PostHogPageviewTracker } from './components/PostHogProvider';
import { useTenantBranding } from './hooks/useTenantBranding';

export default function App() {
  useTenantBranding();

  return (
    <Router>
      <PostHogPageviewTracker />
      <Toaster position="top-center" richColors />
      <Routes>
        <Route path="/" element={<AuthPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/dashboard/:tab" element={<DashboardPage />} />

        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/roles" element={<RolesPage />} />
      </Routes>
    </Router>
  );
}
