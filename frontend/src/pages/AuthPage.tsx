import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminLogin } from '../components/AdminLogin';
import { CommunityRulesModal } from '../components/CommunityRulesModal';
import { LoginView } from '../components/LoginView';
import { StudentLogin } from '../components/StudentLogin';
import { PreferencesForm } from '../components/PreferencesForm';
import { preferencesService } from '../services/preferences';

type UserRole = 'student' | 'admin' | null;

export function AuthPage() {
    const [showStudentLogin, setShowStudentLogin] = useState(false);
    const [showAdminLogin, setShowAdminLogin] = useState(false);
    const [showRulesModal, setShowRulesModal] = useState(false);
    const [showPreferencesForm, setShowPreferencesForm] = useState(false);
    const [isCheckingPreferences, setIsCheckingPreferences] = useState(false);
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

    const handleStudentLogin = async () => {
        // Check if user has completed preferences
        setIsCheckingPreferences(true);
        try {
            const { is_completed } = await preferencesService.checkCompletion();
            
            if (!is_completed) {
                // Show preferences form instead of rules modal
                setShowStudentLogin(false);
                setShowPreferencesForm(true);
            } else {
                // Preferences already completed, proceed to rules modal
                setShowRulesModal(true);
                setShowStudentLogin(false);
            }
        } catch (error) {
            // If there's an error checking preferences, show the form to be safe
            setShowStudentLogin(false);
            setShowPreferencesForm(true);
        } finally {
            setIsCheckingPreferences(false);
        }
    };

    const handleAdminLogin = () => {
        localStorage.setItem('userRole', 'admin');
        navigate('/dashboard');
    };

    const handlePreferencesComplete = () => {
        setShowPreferencesForm(false);
        setShowRulesModal(true);
    };

    const handleRulesAccepted = () => {
        setShowRulesModal(false);
        localStorage.setItem('userRole', 'student');
        navigate('/dashboard');
    };

    const handleBackToRoleSelection = () => {
        setShowStudentLogin(false);
        setShowAdminLogin(false);
        setShowPreferencesForm(false);
    };

    if (showStudentLogin) {
        return <StudentLogin onLogin={handleStudentLogin} onBack={handleBackToRoleSelection} />;
    }

    if (showPreferencesForm) {
        return <PreferencesForm onComplete={handlePreferencesComplete} onBack={handleBackToRoleSelection} />;
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