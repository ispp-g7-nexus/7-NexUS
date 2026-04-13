import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminView } from '../components/AdminView';
import { StudentView } from '../components/StudentView';
import { authService, resolvePortalRoleFromRoles, type PortalRole } from '../services/auth';
import { preferencesService } from '../services/preferences';

const RULES_KEY = "nexus.community_rules.accepted";

const getUserRulesKey = (userId: string) => `${RULES_KEY}.${userId}`;

export function DashboardPage() {
    const navigate = useNavigate();
    const [role, setRole] = useState<PortalRole | null>(null);
    const [adminUser, setAdminUser] = useState<{ name: string; email: string } | null>(null);

    useEffect(() => {
        const loadSession = async () => {
            try {
                const session = await authService.me();
                if (!session.authenticated || !session.user) {
                    localStorage.removeItem('userRole');
                    navigate('/');
                    return;
                }

                const nextRole = resolvePortalRoleFromRoles(session.user.roles || []);
                if (!nextRole) {
                    localStorage.removeItem('userRole');
                    navigate('/');
                    return;
                }

                // Para estudiantes, validar que hayan completado el onboarding
                if (nextRole === 'student') {
                    const userRulesKey = getUserRulesKey(session.user.id.toString());
                    // Verificar sessionStorage primero (aceptación temporal), luego localStorage (permanente)
                    const skipRules = sessionStorage.getItem(userRulesKey) === 'true' || localStorage.getItem(userRulesKey) === 'true';
                    if (!skipRules) {
                        // No aceptó las normas, redirigir a AuthPage
                        navigate('/');
                        return;
                    }

                    try {
                        const preferences = await preferencesService.getMyPreferences();
                        if (!preferences.is_completed) {
                            // No completó las preferencias, redirigir a AuthPage
                            navigate('/');
                            return;
                        }
                    } catch {
                        // Error al obtener preferencias, redirigir a AuthPage
                        navigate('/');
                        return;
                    }
                }

                const { first_name, last_name, username, email } = session.user;
                const name = (first_name || last_name)
                    ? `${first_name ?? ''} ${last_name ?? ''}`.trim()
                    : (username ?? '');
                setAdminUser({ name, email: email ?? '' });

                localStorage.setItem('userRole', nextRole);
                setRole(nextRole);
            } catch {
                localStorage.removeItem('userRole');
                navigate('/');
            }
        };

        loadSession();
    }, [navigate]);

    // Polling de sesión: si el admin elimina la cuenta, el residente es expulsado
    // en el siguiente ciclo (máx. 30 s) sin necesidad de ninguna acción extra.
    useEffect(() => {
        if (!role) return;

        const interval = setInterval(async () => {
            try {
                await authService.me();
            } catch {
                // devuelve 401 (usuario desactivado / sesión inválida).
            }
        }, 30_000);

        return () => clearInterval(interval);
    }, [role]);

    const handleLogout = async () => {
        localStorage.removeItem('userRole');
        try {
            await authService.logout();
        } catch {
            // Ignorar errores de logout
        }
        navigate('/');
    };

    if (!role) return null;

    return role === 'student'
        ? <StudentView onLogout={handleLogout} />
        : <AdminView onLogout={handleLogout} currentUser={adminUser} />;
}