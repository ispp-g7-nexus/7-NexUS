// src/components/RoleModal.tsx
import React, { useEffect, useState, useRef } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Role, RoleFormData } from '../services/roles';

interface RoleModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: RoleFormData) => Promise<void>;
    editingRole?: Role | null;
}

const AVAILABLE_PERMISSIONS = [
    { id: 'announcements', label: 'Avisos' },
    { id: 'rooms', label: 'Habitaciones' },
    { id: 'chats', label: 'Chats' },
    { id: 'events', label: 'Eventos & Comunidad' },
    { id: 'guests', label: 'Visitantes' },
    { id: 'incidences', label: 'Incidencias' },
    { id: 'reservations', label: 'Recursos & Reservas' },
    { id: 'students', label: 'Residentes' },
    { id: 'staff', label: 'Personal (Staff)' },
    { id: 'packages', label: 'Paquetería' },
    { id: 'kitchen', label: 'Menú Comedor' },
    { id: 'roles', label: 'Roles' },
    { id: 'branding', label: 'Personalización (Branding)' },
    { id: 'analytics', label: 'Analíticas' },
];

const RoleModal: React.FC<RoleModalProps> = ({ isOpen, onClose, onSave, editingRole }) => {
    const [formData, setFormData] = useState<RoleFormData>({ name: '', description: '', permissions: [] });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (editingRole) {
            setFormData({
                name: editingRole.name,
                description: editingRole.description,
                permissions: editingRole.permissions || []
            });
        } else {
            setFormData({ name: '', description: '', permissions: [] });
        }
        setError(null);
        setIsDropdownOpen(false);
    }, [editingRole, isOpen]);

    // Cerrar el desplegable si hacemos clic fuera
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        };
        if (isDropdownOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isDropdownOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        try {
            await onSave(formData);
            window.dispatchEvent(new Event("reload-permissions"));
            onClose();
        } catch (err) {
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError('Ocurrió un error inesperado al guardar el rol.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const togglePermission = (permId: string) => {
        setFormData(prev => {
            const currentPerms = prev.permissions || [];
            if (currentPerms.includes(permId)) {
                return { ...prev, permissions: currentPerms.filter(p => p !== permId) };
            } else {
                return { ...prev, permissions: [...currentPerms, permId] };
            }
        });
    };

    const selectedCount = formData.permissions?.length || 0;

    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
                <h2 className="text-xl font-bold text-gray-900 mb-4">
                    {editingRole ? 'Editar Rol' : 'Nuevo Rol'}
                </h2>

                {error && (
                    <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-100">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4 relative">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                        <input
                            type="text"
                            required
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-green-600 focus:border-green-600 outline-none transition-shadow"
                            placeholder="Ej: Mantenimiento"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-green-600 focus:border-green-600 outline-none transition-shadow"
                            placeholder="Describe las funciones..."
                            rows={2}
                        />
                    </div>

                    {/* Desplegable de Permisos */}
                    <div className="relative" ref={dropdownRef}>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Permisos de Acceso</label>

                        <button
                            type="button"
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            className="w-full flex items-center justify-between border border-gray-300 rounded-lg p-2.5 bg-white hover:bg-gray-50 transition-colors focus:ring-2 focus:ring-green-600 outline-none"
                        >
                            <span className={selectedCount === 0 ? "text-gray-400" : "text-gray-900 font-medium"}>
                                {selectedCount === 0
                                    ? 'Seleccionar módulos permitidos...'
                                    : `${selectedCount} módulo${selectedCount > 1 ? 's' : ''} seleccionado${selectedCount > 1 ? 's' : ''}`}
                            </span>
                            {isDropdownOpen ? <ChevronUp size={18} className="text-gray-500" /> : <ChevronDown size={18} className="text-gray-500" />}
                        </button>

                        {isDropdownOpen && (
                            <div className="absolute z-10 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-xl max-h-60 overflow-y-auto p-2">
                                <div className="grid grid-cols-1 gap-1">
                                    {AVAILABLE_PERMISSIONS.map(perm => {
                                        const isSelected = (formData.permissions || []).includes(perm.id);
                                        return (
                                            <label
                                                key={perm.id}
                                                className={`flex items-center gap-3 p-2.5 rounded-md cursor-pointer transition-colors text-sm
                                                    ${isSelected ? 'bg-green-50 text-green-900' : 'hover:bg-gray-50 text-gray-700'}`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-600"
                                                    checked={isSelected}
                                                    onChange={() => togglePermission(perm.id)}
                                                />
                                                <span className="select-none flex-1">{perm.label}</span>
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                    {/* Espaciador para evitar que el botón quede oculto debajo del dropdown si este último se sale */}
                    {isDropdownOpen && <div className="h-40 pointer-events-none opacity-0"></div>}

                    <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isLoading}
                            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 relative z-0"
                        >
                            {isLoading ? 'Guardando...' : 'Guardar'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default RoleModal;