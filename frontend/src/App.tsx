import { Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import { Toaster } from 'sonner';
import './index.css';

import { AuthPage } from './pages/AuthPage';
import { DashboardPage } from './pages/DashboardPage';
import { ForgotPassword } from './pages/ForgotPassword';
import { ResetPassword } from './pages/ResetPassword';
<<<<<<< HEAD
import StudentIncidences from './pages/Incidences/components/StudentIncidences';
=======
import RolesPage from './pages/RolesPage';
>>>>>>> 2dce41bbace1aa83393cb6bdf0c7858b56cafca7

export default function App() {
  return (
    <Router>
      <Toaster position="top-center" richColors />

      <Routes>
        <Route path="/" element={<AuthPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
<<<<<<< HEAD
        <Route path="/incidences" element={<StudentIncidences />} />

=======
        <Route path="/roles" element={<RolesPage />} />
>>>>>>> 2dce41bbace1aa83393cb6bdf0c7858b56cafca7
      </Routes>
    </Router>
  );
}