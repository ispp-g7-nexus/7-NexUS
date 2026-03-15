import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminView } from '../components/AdminView';
import { StudentView } from '../components/StudentView';
import { authService, resolvePortalRoleFromRoles, type PortalRole } from '../services/auth';

export function DashboardPage() {
    const navigate = useNavigate();
    const [role, setRole] = useState<PortalRole | null>(null);

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

    const handleLogout = () => {
        localStorage.removeItem('userRole');
        authService.logout().catch(() => null);
        navigate('/');
    };

    if (!role) return null;

    return role === 'student'
        ? <StudentView onLogout={handleLogout} />
        : <AdminView onLogout={handleLogout} />;
}