import { Route, BrowserRouter as Router, Routes, useNavigate, useLocation } from 'react-router-dom';
import { Toaster } from 'sonner';
import { ChevronLeft } from 'lucide-react';
import './index.css';

import { AuthPage } from './pages/AuthPage';
import { DashboardPage } from './pages/DashboardPage';
import { ForgotPassword } from './pages/ForgotPassword';
import { ResetPassword } from './pages/ResetPassword';
import RolesPage from './pages/RolesPage';

function BackButton() {
  const navigate = useNavigate();
  const location = useLocation();

  const blacklistedPaths = ['/', '/forgot-password', '/reset-password', '/roles'];
  const isAuthPage = blacklistedPaths.includes(location.pathname);

  if (isAuthPage) return null;

  return (
    <div className="fixed top-4 left-4 z-[100]">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="flex items-center justify-center w-9 h-9 bg-white/90 backdrop-blur-sm border border-gray-200 text-gray-600 rounded-full shadow-sm hover:bg-gray-50 transition-all active:scale-90"
      >
        <ChevronLeft size={20} />
      </button>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <Toaster position="top-center" richColors />

      <BackButton />

      <Routes>
        <Route path="/" element={<AuthPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/roles" element={<RolesPage />} />
      </Routes>
    </Router>
  );
}