import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminView } from '../components/AdminView';
import { StudentView } from '../components/StudentView';

export function DashboardPage() {
    const navigate = useNavigate();
    const [role, setRole] = useState<string | null>(null);

    useEffect(() => {
        const savedRole = localStorage.getItem('userRole');
        if (!savedRole) {
            navigate('/');
        } else {
            setRole(savedRole);
        }
    }, [navigate]);

    const handleLogout = () => {
        localStorage.removeItem('userRole');
        navigate('/');
    };

    if (!role) return null;

    return role === 'student'
        ? <StudentView onLogout={handleLogout} />
        : <AdminView onLogout={handleLogout} />;
}