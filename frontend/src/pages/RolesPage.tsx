// src/pages/RolesPage.tsx
import { Plus, Search } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import RoleCard from '../components/RoleCard';
import RoleModal from '../components/RoleModal';
import { Role, RoleFormData, roleService } from '../services/roles';

const RolesPage: React.FC = () => {
    // Estados de datos
    const [roles, setRoles] = useState<Role[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Estados UI
    const [searchTerm, setSearchTerm] = useState('');
    const [filter, setFilter] = useState('Todos');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingRole, setEditingRole] = useState<Role | null>(null);

    useEffect(() => {
        fetchRoles();
    }, []);

    const fetchRoles = async () => {
        try {
            setIsLoading(true);
            const data = await roleService.getRoles();
            setRoles(data);
            setError(null);
        } catch (err) {
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError('Ocurrió un error inesperado al cargar los roles.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveRole = async (formData: RoleFormData) => {
        if (editingRole) {
            await roleService.updateRole(editingRole.id, formData);
        } else {
            await roleService.createRole(formData);
        }
        await fetchRoles(); // Recargamos la lista
    };

    const handleDeleteRole = async (id: number) => {
        if (window.confirm('¿Estás seguro de eliminar este rol de la residencia?')) {
            try {
                await roleService.deleteRole(id);
                setRoles(roles.filter(r => r.id !== id));
            } catch (err) {
                if (err instanceof Error) {
                    setError(err.message);
                } else {
                    setError('Ocurrió un error inesperado al eliminar el rol.');
                }
            }
        }
    };

    // Manejo del modal
    const openModal = (role?: Role) => {
        setEditingRole(role || null);
        setIsModalOpen(true);
    };

    // Lógica de Filtrado
    const filteredRoles = roles.filter(role => {
        const matchesSearch = role.name.toLowerCase().includes(searchTerm.toLowerCase());
        if (filter === 'Sistema') return matchesSearch && role.is_system_default;
        if (filter === 'Personalizado') return matchesSearch && !role.is_system_default;
        return matchesSearch;
    });

    return (
        <div className="min-h-screen bg-gray-50 p-4 md:p-8 font-sans">
            <div className="max-w-4xl mx-auto">

                {/* --- HEADER --- */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Roles</h1>
                        <p className="text-base text-gray-500 mt-1">Directorio completo de roles y permisos</p>
                    </div>
                    <button
                        onClick={() => openModal()}
                        className="bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-lg font-medium flex items-center gap-2 transition-colors shadow-sm"
                    >
                        <Plus size={20} />
                        Nuevo Rol
                    </button>
                </div>

                <div className="bg-white p-2 rounded-xl shadow-sm flex flex-col sm:flex-row gap-2 border border-gray-200 mb-6">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar por nombre..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-white rounded-lg focus:outline-none text-sm text-gray-500"
                        />
                    </div>
                    <div className="h-px sm:h-8 sm:w-px bg-gray-200 mx-2 self-center hidden sm:block"></div>
                    <select
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="bg-white rounded-lg px-4 py-2 focus:outline-none text-sm text-gray-500 cursor-pointer font-medium border-none"
                    >
                        <option value="Todos">Todos</option>
                        <option value="Sistema">Por Defecto</option>
                        <option value="Personalizado">Personalizados</option>
                    </select>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg border border-red-100">
                        {error}
                    </div>
                )}

                {isLoading ? (
                    <div className="flex justify-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {filteredRoles.map(role => (
                            <RoleCard
                                key={role.id}
                                role={role}
                                onEdit={openModal}
                                onDelete={handleDeleteRole}
                            />
                        ))}
                        {filteredRoles.length === 0 && !error && (
                            <div className="text-center py-12 text-gray-500 bg-white rounded-xl border border-gray-200">
                                No se encontraron roles.
                            </div>
                        )}
                    </div>
                )}
            </div>

            <RoleModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSaveRole}
                editingRole={editingRole}
            />
        </div>
    );
};

export default RolesPage;