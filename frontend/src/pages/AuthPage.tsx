import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminLogin } from '../components/AdminLogin';
import { CommunityRulesModal } from '../components/CommunityRulesModal';
import { LoginView } from '../components/LoginView';
import { StudentLogin } from '../components/StudentLogin';
import { authService, resolvePortalRoleFromRoles } from '../services/auth';

type UserRole = 'student' | 'admin' | null;

export function AuthPage() {
    const [showStudentLogin, setShowStudentLogin] = useState(false);
    const [showAdminLogin, setShowAdminLogin] = useState(false);
    const [showRulesModal, setShowRulesModal] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const restoreSession = async () => {
            try {
                const session = await authService.me();
                if (!session.authenticated || !session.user) {
                    localStorage.removeItem('userRole');
                    return;
                }

                const role = resolvePortalRoleFromRoles(session.user.roles || []);
                if (!role) {
                    localStorage.removeItem('userRole');
                    return;
                }

                localStorage.setItem('userRole', role);
                navigate('/dashboard');
            } catch {
                localStorage.removeItem('userRole');
            }
        };

        restoreSession();
    }, [navigate]);

    const handleRoleSelection = (role: UserRole) => {
        if (role === 'student') setShowStudentLogin(true);
        else if (role === 'admin') setShowAdminLogin(true);
    };

    const handleStudentLogin = () => {
        setShowRulesModal(true);
        setShowStudentLogin(false);
    };

    const handleAdminLogin = async () => {
        try {
            const session = await authService.me();
            const role = resolvePortalRoleFromRoles(session.user?.roles || []);
            if (role !== 'admin') {
                localStorage.removeItem('userRole');
                return;
            }

            localStorage.setItem('userRole', role);
            navigate('/dashboard');
        } catch {
            localStorage.removeItem('userRole');
        }
    };

    const handleRulesAccepted = async () => {
        setShowRulesModal(false);
        try {
            const session = await authService.me();
            const role = resolvePortalRoleFromRoles(session.user?.roles || []);
            if (role !== 'student') {
                localStorage.removeItem('userRole');
                return;
            }

            localStorage.setItem('userRole', role);
            navigate('/dashboard');
        } catch {
            localStorage.removeItem('userRole');
        }
    };

    const handleBackToRoleSelection = () => {
        setShowStudentLogin(false);
        setShowAdminLogin(false);
    };

    if (showStudentLogin) {
        return <StudentLogin onLogin={handleStudentLogin} onBack={handleBackToRoleSelection} />;
    }

    if (showAdminLogin) {
        return <AdminLogin onLogin={handleAdminLogin} onBack={handleBackToRoleSelection} />;
    }

    return (
        <>
            <LoginView onSelectRole={handleRoleSelection} />
            <CommunityRulesModal isOpen={showRulesModal} onAccept={handleRulesAccepted} />
        </>
    );
}