import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { authService } from '../services/auth';
import { LogOut } from 'lucide-react';

export function AdminProfile() {
    const [isEditing, setIsEditing] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});


    const [userData, setUserData] = useState({
        username: '',
        email: '',
        first_name: '',
        last_name: '',
        roles: [] as string[],
        status: 'Activo'
    });

    const [originalData, setOriginalData] = useState(userData);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const session = await authService.me();
                if (session.user) {
                    const data = {
                        username: session.user.username || '',
                        email: session.user.email || '',
                        first_name: session.user.first_name || '',
                        last_name: session.user.last_name || '',
                        roles: session.user.roles || [],
                        status: 'Activo'
                    };
                    setUserData(data);
                    setOriginalData(data);
                }
            } catch (error) {
                console.error("Error cargando el perfil", error);
                toast.error("No se pudo cargar el perfil");
            } finally {
                setIsLoading(false);
            }
        };
        fetchProfile();
    }, []);

    const handleInputChange = (field: string, value: string) => {
        setUserData({ ...userData, [field]: value });
        if (errors[field]) {
            setErrors({ ...errors, [field]: '' });
        }
    };

    const MAX_LENGTH = 40;
    const validateForm = () => {
        const newErrors: Record<string, string> = {};

        if (!userData.first_name.trim()) {
            newErrors.first_name = "El nombre es obligatorio.";
        } else if (userData.first_name.length > MAX_LENGTH) {
            newErrors.first_name = `El nombre no puede superar los ${MAX_LENGTH} caracteres.`;
        }

        if (!userData.last_name.trim()) {
            newErrors.last_name = "Los apellidos son obligatorios.";
        } else if (userData.last_name.length > MAX_LENGTH) {
            newErrors.last_name = `Los apellidos no pueden superar los ${MAX_LENGTH} caracteres.`;
        }

        if (!userData.username.trim()) {
            newErrors.username = "El nombre de usuario es obligatorio.";
        } else if (userData.username.length > MAX_LENGTH) {
            newErrors.username = `El nombre de usuario no puede superar los ${MAX_LENGTH} caracteres.`;
        }

        if (!userData.email.trim()) {
            newErrors.email = "El correo es obligatorio.";
        } else if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(userData.email)) {
            newErrors.email = "Formato de correo inválido.";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) {
            toast.error("Por favor, corrige los errores del formulario.");
            return;
        }

        setIsSaving(true);
        try {
            await authService.updateProfile({
                first_name: userData.first_name,
                last_name: userData.last_name,
                username: userData.username,
                email: userData.email
            });

            toast.success("Perfil actualizado correctamente.");
            setOriginalData(userData);
            setIsEditing(false);
        } catch (error: unknown) {
            if (error instanceof Error) {
                toast.error(error.message);
            } else {
                toast.error("Error al guardar los cambios.");
            }
        } finally {
            setIsSaving(false);
        }
    };

    const handleLogout = async () => {
        try {
            await authService.logout();
            globalThis.location.assign('/');
        } catch (error) {
            console.error("Error en logout:", error);
            toast.error("No se pudo cerrar la sesión. Inténtalo de nuevo.");
        }
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center min-h-[70vh] text-gray-500">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mr-3"></div>
                Cargando datos del perfil...
            </div>
        );
    }

    return (
        <div className="min-h-[85vh] w-full flex items-center justify-center p-4 md:p-6 bg-transparent text-slate-900">
            <div className="w-full max-w-4xl bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-gray-100 overflow-hidden transition-all duration-300">

                <div className="bg-primary p-8 text-primary-foreground flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative overflow-hidden">
                    <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-white opacity-10 rounded-full blur-2xl"></div>

                    <div className="relative z-10 max-w-full overflow-hidden">
                        <div className="flex items-center gap-3 flex-wrap">
                            <h2 className="text-3xl font-bold tracking-tight truncate max-w-[250px] sm:max-w-md" title={`${userData.first_name} ${userData.last_name}`}>
                                {userData.first_name} {userData.last_name}
                            </h2>
                            <span className="bg-primary-foreground/20 text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full border border-primary-foreground/30 backdrop-blur-sm shrink-0">
                                {userData.status}
                            </span>
                        </div>
                        <p className="text-primary-foreground/80 text-sm mt-2 font-medium opacity-90">
                            Gestiona tu información personal y credenciales de acceso
                        </p>
                    </div>

                    <div className="relative z-10 flex flex-col sm:flex-row gap-3 w-full sm:w-auto mt-4 sm:mt-0">
                        <button
                            type="button"
                            onClick={() => {
                                if (isEditing) {
                                    setErrors({});
                                    setUserData(originalData);
                                }
                                setIsEditing(!isEditing);
                            }}
                            className="w-full sm:w-auto bg-primary-foreground/10 hover:bg-primary-foreground/20 backdrop-blur-md transition-all duration-200 px-6 py-2.5 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-primary-foreground/50 outline-none shadow-sm border border-primary-foreground/20 text-primary-foreground"
                        >
                            {isEditing ? 'Cancelar Edición' : 'Editar Perfil'}
                        </button>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="p-8 sm:p-10 bg-white">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">

                        <div className="md:col-span-1">
                            <label htmlFor="first_name" className="block text-sm font-semibold text-gray-700 mb-1.5">Nombre</label>
                            <input
                                id="first_name"
                                type="text"
                                name="first_name"
                                value={userData.first_name}
                                onChange={(e) => handleInputChange('first_name', e.target.value)}
                                disabled={!isEditing}
                                maxLength={MAX_LENGTH} 
                                className={`w-full px-4 py-3 border rounded-xl focus:outline-none transition-all duration-200 break-words ${errors.first_name ? 'border-red-500 bg-red-50/30 focus:ring-4 focus:ring-red-500/10' :
                                    isEditing ? 'border-primary/50 focus:border-primary focus:ring-4 focus:ring-primary/10 bg-white hover:border-primary/70' :
                                        'border-gray-200 bg-gray-50/80 text-gray-600 cursor-default'
                                    }`}
                            />
                            {errors.first_name && <p className="text-red-500 text-xs mt-1.5 font-medium">{errors.first_name}</p>}
                        </div>

                        <div className="md:col-span-1">
                            <label htmlFor="last_name" className="block text-sm font-semibold text-gray-700 mb-1.5">Apellidos</label>
                            <input
                                id="last_name"
                                type="text"
                                name="last_name"
                                value={userData.last_name}
                                onChange={(e) => handleInputChange('last_name', e.target.value)}
                                disabled={!isEditing}
                                maxLength={MAX_LENGTH}
                                className={`w-full px-4 py-3 border rounded-xl focus:outline-none transition-all duration-200 break-words ${errors.last_name ? 'border-red-500 bg-red-50/30 focus:ring-4 focus:ring-red-500/10' :
                                    isEditing ? 'border-primary/50 focus:border-primary focus:ring-4 focus:ring-primary/10 bg-white hover:border-primary/70' :
                                        'border-gray-200 bg-gray-50/80 text-gray-600 cursor-default'
                                    }`}
                            />
                            {errors.last_name && <p className="text-red-500 text-xs mt-1.5 font-medium">{errors.last_name}</p>}
                        </div>

                        <div className="md:col-span-1">
                            <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-1.5">Correo Electrónico</label>
                            <input
                                id="email"
                                type="email"
                                value={userData.email}
                                onChange={(e) => handleInputChange('email', e.target.value)}
                                disabled={!isEditing}
                                className={`w-full px-4 py-3 border rounded-xl focus:outline-none transition-all duration-200 ${errors.email ? 'border-red-500 bg-red-50/30 focus:ring-4 focus:ring-red-500/10' :
                                    isEditing ? 'border-primary/50 focus:border-primary focus:ring-4 focus:ring-primary/10 bg-white hover:border-primary/70' :
                                        'border-gray-200 bg-gray-50/80 text-gray-600 cursor-default'
                                    }`}
                            />
                            {errors.email && <p className="text-red-500 text-xs mt-1.5 font-medium">{errors.email}</p>}
                        </div>

                        <div className="md:col-span-1">
                            <label htmlFor="username" className="block text-sm font-semibold text-gray-700 mb-1.5">Nombre de Usuario</label>
                            <input
                                id="username"
                                type="text"
                                value={userData.username}
                                onChange={(e) => handleInputChange('username', e.target.value)}
                                disabled={!isEditing}
                                className={`w-full px-4 py-3 border rounded-xl focus:outline-none transition-all duration-200 ${errors.username ? 'border-red-500 bg-red-50/30 focus:ring-4 focus:ring-red-500/10' :
                                    isEditing ? 'border-primary/50 focus:border-primary focus:ring-4 focus:ring-primary/10 bg-white hover:border-primary/70' :
                                        'border-gray-200 bg-gray-50/80 text-gray-600 cursor-default'
                                    }`}
                            />
                            {errors.username && <p className="text-red-500 text-xs mt-1.5 font-medium">{errors.username}</p>}
                        </div>

                        <div className="md:col-span-2 pt-4">
                            <label className="block text-sm font-semibold text-gray-700 mb-3">Permisos del Sistema</label>
                            <div className="flex flex-wrap gap-2">
                                {userData.roles.length > 0 ? (
                                    userData.roles.map((role, index) => (
                                        <span key={index} className="bg-primary/10 text-primary text-sm font-bold px-5 py-2 rounded-xl border border-primary/20 shadow-sm">
                                            {role}
                                        </span>
                                    ))
                                ) : (
                                    <span className="text-sm text-gray-500 italic bg-gray-50 px-4 py-2 rounded-lg border border-gray-100">
                                        No hay roles asignados
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {isEditing && (
                        <div className="mt-10 pt-6 border-t border-gray-100 flex flex-col sm:flex-row justify-end gap-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
                            <button
                                type="button"
                                onClick={() => {
                                    setIsEditing(false);
                                    setErrors({});
                                    setUserData(originalData);
                                }}
                                disabled={isSaving}
                                className="px-6 py-2.5 bg-white border-2 border-gray-200 rounded-xl text-gray-700 font-semibold hover:bg-gray-50 hover:border-gray-300 transition-all disabled:opacity-50"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={isSaving}
                                className="bg-primary hover:opacity-90 text-primary-foreground font-semibold py-2.5 px-8 rounded-xl transition-all shadow-primary/30 shadow-[0_4px_14px_var(--tw-shadow-color)] hover:shadow-primary/40 hover:shadow-[0_6px_20px_var(--tw-shadow-color)] flex items-center justify-center disabled:opacity-70 disabled:hover:shadow-none"
                            >
                                {isSaving ? (
                                    <>
                                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                                        Guardando...
                                    </>
                                ) : (
                                    'Guardar Cambios'
                                )}
                            </button>
                        </div>
                    )}

                    <div className="mt-12 pt-8 border-t border-gray-100 max-w-sm">
                        <button
                            type="button"
                            onClick={handleLogout}
                            className="w-full flex items-center justify-center gap-3 px-6 py-3.5 bg-gradient-to-r from-green-600 to-green-500 text-white rounded-xl hover:shadow-lg hover:from-red-700 hover:to-red-600 transition-all font-bold tracking-wide"
                        >
                            <LogOut size={22} />
                            CERRAR SESIÓN
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}