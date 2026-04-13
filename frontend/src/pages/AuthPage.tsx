import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminLogin } from '../components/AdminLogin';
import { CommunityRulesModal } from '../components/CommunityRulesModal';
import { LoginView } from '../components/LoginView';
import { StudentLogin } from '../components/StudentLogin';
import { PreferencesForm } from '../components/PreferencesForm';
import { preferencesService } from '../services/preferences';
import { authService, resolvePortalRoleFromRoles } from '../services/auth';

type UserRole = 'student' | 'admin' | null;

export function AuthPage() {
    const [showStudentLogin, setShowStudentLogin] = useState(false);
    const [showAdminLogin, setShowAdminLogin] = useState(false);
    const [showRulesModal, setShowRulesModal] = useState(false);
    const [showPreferencesForm, setShowPreferencesForm] = useState(false);
    const navigate = useNavigate();

    const RULES_KEY = "nexus.community_rules.accepted";

    const getUserRulesKey = (userId: string) => `${RULES_KEY}.${userId}`;

    useEffect(() => {
        const restoreSession = async () => {
            try {
                const session = await authService.me();
                if (!session.authenticated || !session.user) {
                    localStorage.removeItem('userRole');
                    // Limpiar todos los estados cuando no hay sesión
                    setShowStudentLogin(false);
                    setShowAdminLogin(false);
                    setShowRulesModal(false);
                    setShowPreferencesForm(false);
                    return;
                }

                const role = resolvePortalRoleFromRoles(session.user.roles || []);
                if (!role) {
                    localStorage.removeItem('userRole');
                    return;
                }

                localStorage.setItem('userRole', role);
                
                // Verificar si estudiante aceptó las normas de convivencia
                if (role === 'student') {
                    // Primero verificar si ya completó las preferencias
                    try {
                        const preferences = await preferencesService.getMyPreferences();
                        if (preferences.is_completed) {
                            // Si completó preferencias, ir al dashboard sin importar normas
                            navigate('/dashboard');
                            return;
                        }
                    } catch {
                        // Si error, continuar con la verificación normal
                    }

                    const userRulesKey = getUserRulesKey(session.user.id.toString());
                    const skipRules = localStorage.getItem(userRulesKey) === 'true';
                    if (!skipRules) {
                        // Mostrar el modal de normas de convivencia
                        setShowRulesModal(true);
                        return;
                    }

                    // Si skipRules es true pero preferencias no completas, mostrar preferencias
                    try {
                        const preferences = await preferencesService.getMyPreferences();
                        if (!preferences.is_completed) {
                            // Mostrar el formulario de preferencias
                            setShowPreferencesForm(true);
                            return;
                        }
                    } catch {
                        // Si hay error al obtener preferencias en la restauración, solo navegar
                        // El dashboard o el servidor manejará la situación
                    }
                }
                
                navigate('/dashboard');
            } catch {
                localStorage.removeItem('userRole');
                // Limpiar todos los estados si hay error durante la restauración
                setShowStudentLogin(false);
                setShowAdminLogin(false);
                setShowRulesModal(false);
                setShowPreferencesForm(false);
            }
        };

        restoreSession();
    }, [navigate]);

    const finalizeLogin = async (expectedRole: UserRole) => {
        try {
            const session = await authService.me();
            const role = resolvePortalRoleFromRoles(session.user?.roles || []);
            if (role !== expectedRole) {
                localStorage.removeItem('userRole');
                return;
            }
            localStorage.setItem('userRole', role);
            navigate('/dashboard');
        } catch {
            localStorage.removeItem('userRole');
        }
    };

    const checkPreferencesAndFinalize = async () => {
        try {
            // Obtener el usuario actual
            const session = await authService.me();
            const userRulesKey = getUserRulesKey(session.user.id.toString());
            const skipRules = localStorage.getItem(userRulesKey) === 'true';

            if (!skipRules) {
                setShowRulesModal(true);
                return;
            }

            const preferences = await preferencesService.getMyPreferences();
            if (!preferences.is_completed) {
                setShowPreferencesForm(true);
            } else {
                await finalizeLogin('student');
                setShowPreferencesForm(false);
            }
        } catch {
            setShowPreferencesForm(true);
        }
    };

    const checkPreferencesOnly = async () => {
        try {
            const preferences = await preferencesService.getMyPreferences();
            if (!preferences.is_completed) {
                setShowPreferencesForm(true);
            } else {
                await finalizeLogin('student');
                setShowPreferencesForm(false);
            }
        } catch {
            setShowPreferencesForm(true);
        }
    };

    const handleRoleSelection = (role: UserRole) => {
        if (role === 'student') setShowStudentLogin(true);
        else if (role === 'admin') setShowAdminLogin(true);
    };

    const handleStudentLogin = async () => {
        setShowStudentLogin(false);
        await checkPreferencesAndFinalize();
    };

    const handleAdminLogin = async () => {
        await finalizeLogin('admin');
    };

    const handleRulesAccepted = async (dontShowAgain: boolean) => {
        try {
            // Solo guardar que las normas fueron aceptadas si el usuario marcó "no mostrar de nuevo"
            if (dontShowAgain) {
                const session = await authService.me();
                const userRulesKey = getUserRulesKey(session.user.id.toString());
                localStorage.setItem(userRulesKey, 'true');
            }
        } catch (e) {
            console.error("Error saving rules preference", e);
        }
        setShowRulesModal(false);
        await checkPreferencesOnly();
    };

    const handlePreferencesComplete = async () => {
        setShowPreferencesForm(false);
        // Esperar un momento para que el servidor procese completamente
        await new Promise(resolve => setTimeout(resolve, 500));
        await finalizeLogin('student');
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