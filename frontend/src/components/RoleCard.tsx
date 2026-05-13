// src/components/RoleCard.tsx
import { MoreVertical } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { Role } from '../services/roles';

interface RoleCardProps {
    role: Role;
    onEdit: (role: Role) => void;
    onDelete: (id: number) => void;
}

const PERMISSION_LABELS: Record<string, string> = {
    announcements: 'Avisos',
    rooms: 'Habitaciones',
    chats: 'Chats',
    events: 'Eventos',
    guests: 'Visitantes',
    incidences: 'Incidencias',
    reservations: 'Reservas',
    students: 'Residentes',
    staff: 'Personal',
    packages: 'Paquetería',
    kitchen: 'Comedor',
    roles: 'Roles',
    branding: 'Personalización',
    analytics: 'Analíticas'
};

const RoleCard: React.FC<RoleCardProps> = ({ role, onEdit, onDelete }) => {
    const [showMenu, setShowMenu] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setShowMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const initial = role.name.charAt(0).toUpperCase();
    const permissions = role.permissions || [];

    return (
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-start justify-between mb-4 hover:shadow-md transition-shadow">
            <div className="flex items-start gap-4 overflow-hidden w-full">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg shrink-0 mt-1
                    ${role.is_system_default ? 'bg-gray-100 text-gray-600' : 'bg-green-50 text-green-600'}`}>
                    {initial}
                </div>

                <div className="min-w-0 flex-1">
                    <h3 className="text-base font-semibold text-gray-900 truncate">{role.name}</h3>
                    <p className="text-sm text-gray-500 truncate mt-0.5 mb-2">{role.description || 'Sin descripción'}</p>

                    {/* Renderizamos los badges de permisos */}
                    {permissions.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5 mt-1">
                            {permissions.map((p) => (
                                <span key={p} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded border border-blue-100 text-[10px] font-semibold tracking-wide uppercase">
                                    {PERMISSION_LABELS[p] || p}
                                </span>
                            ))}
                        </div>
                    ) : (
                        <p className="text-xs text-gray-400 italic">Sin accesos específicos asignados</p>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-3 shrink-0 ml-4">
                <span className={`px-3 py-1 rounded-full text-xs font-medium 
                    ${role.is_system_default
                        ? 'bg-gray-100 text-gray-700'
                        : 'bg-green-50 text-green-600'}`}>
                    {role.is_system_default ? 'Sistema' : 'Personalizado'}
                </span>

                {!role.is_system_default ? (
                    <div className="relative" ref={menuRef}>
                        <button
                            onClick={() => setShowMenu(!showMenu)}
                            className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-50 transition-colors"
                        >
                            <MoreVertical size={20} />
                        </button>

                        {showMenu && (
                            <div className="absolute right-0 top-full mt-1 w-32 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-10">
                                <button
                                    onClick={() => { setShowMenu(false); onEdit(role); }}
                                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                >
                                    Editar
                                </button>
                                <button
                                    onClick={() => { setShowMenu(false); onDelete(role.id); }}
                                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                                >
                                    Eliminar
                                </button>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="w-10"></div>
                )}
            </div>
        </div>
    );
};

export default RoleCard;