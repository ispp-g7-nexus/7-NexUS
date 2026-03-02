import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminLogin } from '../components/AdminLogin';
import { CommunityRulesModal } from '../components/CommunityRulesModal';
import { LoginView } from '../components/LoginView';
import { StudentLogin } from '../components/StudentLogin';

type UserRole = 'student' | 'admin' | null;

export function AuthPage() {
    const [showStudentLogin, setShowStudentLogin] = useState(false);
    const [showAdminLogin, setShowAdminLogin] = useState(false);
    const [showRulesModal, setShowRulesModal] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const savedRole = localStorage.getItem('userRole');
        if (savedRole) {
            navigate('/dashboard');
        }
    }, [navigate]);

    const handleRoleSelection = (role: UserRole) => {
        if (role === 'student') setShowStudentLogin(true);
        else if (role === 'admin') setShowAdminLogin(true);
    };

    const handleStudentLogin = () => {
        setShowRulesModal(true);
        setShowStudentLogin(false);
    };

    const handleAdminLogin = () => {
        localStorage.setItem('userRole', 'admin');
        navigate('/dashboard');
    };

    const handleRulesAccepted = () => {
        setShowRulesModal(false);
        localStorage.setItem('userRole', 'student');
        navigate('/dashboard');
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