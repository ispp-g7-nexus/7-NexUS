import { useEffect, useState } from 'react';
import { authService } from '../services/auth';
import { LogOut } from 'lucide-react';

export function AdminProfile() {
    const [isEditing, setIsEditing] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const [userData, setUserData] = useState({
        username: '',
        email: '',
        phone: '',
        department: '',
        roles: [] as string[],
        status: 'Activo'
    });

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const session = await authService.me();
                if (session.user) {
                    setUserData({
                        username: session.user.username || '',
                        email: session.user.email || '',
                        roles: session.user.roles || [],
                        phone: '+34 600 000 000',
                        department: 'Dirección General',
                        status: 'Activo'
                    });
                }
            } catch (error) {
                console.error("Error cargando el perfil", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchProfile();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        console.log("Guardando datos:", userData);
        setIsEditing(false);
    };

    const handleLogout = async () => {
        try {
            await authService.logout();
        } catch (error) {
            console.error("Error en logout:", error);
        } finally {
            localStorage.clear();
            sessionStorage.clear();
            window.location.href = '/';
        }
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64 text-gray-500">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#4a8f5d] mr-3"></div>
                Cargando datos del perfil...
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mx-4 my-4 sm:mx-6 sm:my-6">
            <div className="bg-[#4a8f5d] p-6 sm:px-8 sm:py-6 text-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <div className="flex items-center gap-3">
                        <h2 className="text-2xl font-bold">Mi Perfil</h2>
                        <span className="bg-green-100 text-green-800 text-xs font-bold px-2.5 py-1 rounded-full border border-green-200">
                            {userData.status}
                        </span>
                    </div>
                    <p className="text-green-100 text-sm mt-1">Gestiona tu información personal y corporativa</p>
                </div>

                <button
                    onClick={() => setIsEditing(!isEditing)}
                    className="w-full sm:w-auto bg-white/20 hover:bg-white/30 transition-colors px-5 py-2.5 rounded-lg text-sm font-medium focus:ring-2 focus:ring-white/50 outline-none"
                >
                    {isEditing ? 'Cancelar Edición' : 'Editar Perfil'}
                </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 sm:p-8">

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                    <div className="md:col-span-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Correo Electrónico</label>
                        <input
                            type="email"
                            value={userData.email}
                            disabled
                            className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500 focus:outline-none cursor-not-allowed"
                        />
                        <p className="text-xs text-gray-400 mt-1">El correo no puede modificarse desde aquí.</p>
                    </div>

                    <div className="md:col-span-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Completo / Usuario</label>
                        <input
                            type="text"
                            value={userData.username}
                            onChange={(e) => setUserData({ ...userData, username: e.target.value })}
                            disabled={!isEditing}
                            className={`w-full px-4 py-2 border rounded-lg focus:outline-none transition-colors ${isEditing
                                ? 'border-[#4a8f5d] focus:ring-2 focus:ring-green-200 bg-white'
                                : 'border-gray-200 bg-gray-50 text-gray-600'
                                }`}
                        />
                    </div>

                    <div className="md:col-span-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono de Contacto</label>
                        <input
                            type="tel"
                            value={userData.phone}
                            onChange={(e) => setUserData({ ...userData, phone: e.target.value })}
                            disabled={!isEditing}
                            className={`w-full px-4 py-2 border rounded-lg focus:outline-none transition-colors ${isEditing
                                ? 'border-[#4a8f5d] focus:ring-2 focus:ring-green-200 bg-white'
                                : 'border-gray-200 bg-gray-50 text-gray-600'
                                }`}
                        />
                    </div>

                    <div className="md:col-span-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Departamento / Cargo</label>
                        <input
                            type="text"
                            value={userData.department}
                            onChange={(e) => setUserData({ ...userData, department: e.target.value })}
                            disabled={!isEditing}
                            className={`w-full px-4 py-2 border rounded-lg focus:outline-none transition-colors ${isEditing
                                ? 'border-[#4a8f5d] focus:ring-2 focus:ring-green-200 bg-white'
                                : 'border-gray-200 bg-gray-50 text-gray-600'
                                }`}
                        />
                    </div>

                    <div className="md:col-span-2 pt-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Permisos del Sistema</label>
                        <div className="flex flex-wrap gap-2">
                            {userData.roles.length > 0 ? (
                                userData.roles.map((role, index) => (
                                    <span key={index} className="bg-green-100 text-[#4a8f5d] text-xs font-semibold px-4 py-1.5 rounded-full border border-green-200">
                                        {role}
                                    </span>
                                ))
                            ) : (
                                <span className="text-sm text-gray-500 italic">No hay roles asignados</span>
                            )}
                        </div>
                    </div>
                </div>

                {isEditing && (
                    <div className="mt-8 pt-5 border-t border-gray-100 flex flex-col sm:flex-row justify-end gap-3">
                        <button
                            type="button"
                            onClick={() => setIsEditing(false)}
                            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="bg-[#4a8f5d] hover:bg-[#3d754b] text-white font-medium py-2 px-6 rounded-lg transition-colors shadow-sm"
                        >
                            Guardar Cambios
                        </button>
                    </div>
                )}

                <div className="mt-12 pt-8 border-t border-gray-100 max-w-sm">
                    <button
                        type="button"
                        onClick={handleLogout}
                        className="w-full flex items-center justify-center gap-3 px-6 py-3.5 bg-gradient-to-r from-[#1a3a24] to-[#4a8f5d] text-white rounded-xl hover:shadow-lg transition-all font-bold tracking-wide"
                    >
                        <LogOut size={22} />
                        CERRAR SESIÓN
                    </button>
                </div>
            </form>
        </div>
    );
}