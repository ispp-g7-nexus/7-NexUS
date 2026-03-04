// src/components/RoleModal.tsx
import React, { useEffect, useState } from 'react';
import { Role, RoleFormData } from '../services/roles';

interface RoleModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: RoleFormData) => Promise<void>;
    editingRole?: Role | null;
}

const RoleModal: React.FC<RoleModalProps> = ({ isOpen, onClose, onSave, editingRole }) => {
    const [formData, setFormData] = useState<RoleFormData>({ name: '', description: '' });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (editingRole) {
            setFormData({ name: editingRole.name, description: editingRole.description });
        } else {
            setFormData({ name: '', description: '' });
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

    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
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
                            className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-[#4a8f5d] focus:border-[#4a8f5d] outline-none transition-shadow"
                            placeholder="Ej: Mantenimiento"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-[#4a8f5d] focus:border-[#4a8f5d] outline-none transition-shadow"
                            placeholder="Describe las funciones..."
                        />
                    </div>

                    <div className="flex justify-end gap-3 mt-6 pt-4">
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
                            className="bg-[#4a8f5d] text-white px-4 py-2 rounded-lg font-medium hover:bg-[#3d7a4e] transition-colors disabled:opacity-50"
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