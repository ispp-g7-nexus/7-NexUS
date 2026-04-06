// src/components/RoleModal.tsx
import React, { useEffect, useState } from 'react';
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
];

const RoleModal: React.FC<RoleModalProps> = ({ isOpen, onClose, onSave, editingRole }) => {
    const [formData, setFormData] = useState<RoleFormData>({ name: '', description: '', permissions: [] });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

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
    }, [editingRole, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        try {
            await onSave(formData);
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

                <form onSubmit={handleSubmit} className="space-y-4">
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

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Permisos de Acceso</label>
                        <p className="text-xs text-gray-500 mb-3">Selecciona los módulos a los que este rol tendrá acceso administrativo.</p>

                        <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1">
                            {AVAILABLE_PERMISSIONS.map(perm => {
                                const isSelected = (formData.permissions || []).includes(perm.id);
                                return (
                                    <label
                                        key={perm.id}
                                        className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors text-sm
                                            ${isSelected ? 'bg-green-50 border-green-200 text-green-800' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                                    >
                                        <input
                                            type="checkbox"
                                            className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-600"
                                            checked={isSelected}
                                            onChange={() => togglePermission(perm.id)}
                                        />
                                        <span className="select-none">{perm.label}</span>
                                    </label>
                                );
                            })}
                        </div>
                    </div>

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
                            className="bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
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