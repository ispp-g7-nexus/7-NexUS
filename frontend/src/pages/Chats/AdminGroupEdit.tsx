import { ArrowLeft, UserPlus, X, Plus, Users, UsersIcon, ShieldX, Search } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { ConfirmationModal } from "../../components/ui/ConfirmationModal";
import { chatsService, type ChatGroup, type ChatLabel } from "../../services/chats";
import { residentsService, type Resident } from "../../services/residents";
import { authService } from "../../services/auth";

interface AdminGroupEditProps {
    group: ChatGroup;
    onBack: () => void;
    onGroupUpdated: (group: ChatGroup) => void;
}

export function AdminGroupEdit({ group, onBack, onGroupUpdated }: AdminGroupEditProps) {
    const [currentGroup, setCurrentGroup] = useState(group);
    const [groupName, setGroupName] = useState(group.name);
    const [groupDescription, setGroupDescription] = useState(group.description);
    const [groupType, setGroupType] = useState<ChatLabel>(group.label);
    const [canLeave, setCanLeave] = useState(group.can_members_leave);
    const [newMemberEmail, setNewMemberEmail] = useState("");
    const [saving, setSaving] = useState(false);
    const [currentUserEmail, setCurrentUserEmail] = useState<string>("");
    const [addingAllResidents, setAddingAllResidents] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showAddAllModal, setShowAddAllModal] = useState(false);
    const [memberToDelete, setMemberToDelete] = useState<{ id: number; name: string } | null>(null);
    const [deletingMember, setDeletingMember] = useState(false);

    useEffect(() => {
        const loadCurrentUser = async () => {
            try {
                const session = await authService.me();
                if (session.authenticated && session.user) {
                    setCurrentUserEmail(session.user.email || "");
                }
            } catch (error) {
                console.error("Error loading current user:", error);
            }
        };
        loadCurrentUser();
    }, []);

    const filteredMembers = currentGroup.members_list.filter(member =>
        member.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleRemoveMember = async () => {
        if (!memberToDelete) return;
        
        setDeletingMember(true);
        try {
            await chatsService.removeMember(currentGroup.id, memberToDelete.id);
            const updated = {
                ...currentGroup,
                members_list: currentGroup.members_list.filter((member) => member.id !== memberToDelete.id),
                members: currentGroup.members - 1,
            };
            setCurrentGroup(updated);
            onGroupUpdated(updated);
            toast.success("Miembro eliminado correctamente.");
            setShowDeleteModal(false);
            setMemberToDelete(null);
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : "No se pudo eliminar el miembro.");
        } finally {
            setDeletingMember(false);
        }
    };

    const handleDeleteMemberClick = (member: any) => {
        if (member.email === currentUserEmail) {
            toast.error("No puedes eliminarte a ti mismo del grupo.");
            return;
        }

        if (currentGroup.members_list.length <= 1) {
            toast.error("No puedes eliminar el último miembro del grupo. Los grupos no pueden estar vacíos.");
            return;
        }

        setMemberToDelete({ id: member.id, name: member.full_name });
        setShowDeleteModal(true);
    };

    const handleRemoveAdmin = async (memberId: number) => {
        const member = currentGroup.members_list.find(m => m.id === memberId);
        if (member?.email === currentGroup.created_by_email) {
            toast.error("El creador del grupo no puede quitarse el rol de administrador.");
            return;
        }

        try {
            const updated = await chatsService.updateMemberRole(currentGroup.id, memberId, false);
            setCurrentGroup(updated);
            onGroupUpdated(updated);
            toast.success("Rol de administrador removido correctamente.");
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : "No se pudo remover el rol de administrador.");
        }
    };

    const handleAddAllResidents = async () => {
        setAddingAllResidents(true);
        try {
            const residents = await residentsService.list();
            const currentMemberEmails = new Set(currentGroup.members_list.map(m => m.email));
            const residentsToAdd = residents.filter(r => 
                r.is_active && 
                !currentMemberEmails.has(r.email)
            );

            if (residentsToAdd.length === 0) {
                toast.info("Todos los miembros activos ya están añadidos al grupo.");
                setShowAddAllModal(false);
                setAddingAllResidents(false);
                return;
            }

            let addedCount = 0;
            let updatedGroup = currentGroup;
            for (const resident of residentsToAdd) {
                try {
                    updatedGroup = await chatsService.addMember(updatedGroup.id, {
                        email: resident.email,
                        is_admin: false,
                    });
                    addedCount++;
                } catch (error) {
                    console.error(`Error adding ${resident.email}:`, error);
                }
            }

            if (addedCount > 0) {
                setCurrentGroup(updatedGroup);
                onGroupUpdated(updatedGroup);
                toast.success(`Se añadieron ${addedCount} residentes al grupo.`);
            }
            setShowAddAllModal(false);
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : "No se pudieron añadir todos los residentes.");
        } finally {
            setAddingAllResidents(false);
        }
    };

    const handleMakeAdmin = async (memberId: number) => {
        try {
            const updated = await chatsService.updateMemberRole(currentGroup.id, memberId, true);
            setCurrentGroup(updated);
            onGroupUpdated(updated);
            toast.success("Miembro promocionado a admin.");
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : "No se pudo actualizar el rol del miembro.");
        }
    };

    const handleAddMember = async () => {
        const email = newMemberEmail.trim();
        if (!email) {
            toast.error("Debes introducir un email para añadir un miembro.");
            return;
        }

        try {
            const updated = await chatsService.addMember(currentGroup.id, {
                email,
                is_admin: false,
            });
            setCurrentGroup(updated);
            onGroupUpdated(updated);
            setNewMemberEmail("");
            toast.success("Miembro añadido correctamente.");
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : "No se pudo añadir el miembro.");
        }
    };

    const handleSaveChanges = async () => {
        setSaving(true);
        try {
            const updated = await chatsService.updateGroup(currentGroup.id, {
                name: groupName.trim(),
                description: groupDescription.trim(),
                label: groupType,
                can_members_leave: canLeave,
            });
            setCurrentGroup(updated);
            onGroupUpdated(updated);
            toast.success("Grupo actualizado correctamente.");
            onBack();
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : "No se pudo guardar el grupo.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={onBack}
                    className="w-10 h-10"
                >
                    <ArrowLeft className="w-5 h-5" />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Editar Grupo</h1>
                    <p className="text-sm text-gray-500 mt-1">Gestiona los detalles del grupo</p>
                </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Nombre del grupo
                        </label>
                        <Input
                            value={groupName}
                            onChange={(e) => setGroupName(e.target.value)}
                            placeholder="Nombre del grupo"
                        />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Etiqueta
                        </label>
                        <select
                            value={groupType}
                            onChange={(e) => setGroupType(e.target.value as typeof groupType)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                        >
                            <option value="general">General</option>
                            <option value="floor">Por planta</option>
                            <option value="activity">Actividades</option>
                            <option value="private">Privado</option>
                        </select>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Descripción
                    </label>
                    <textarea
                        value={groupDescription}
                        onChange={(e) => setGroupDescription(e.target.value)}
                        placeholder="Descripción del grupo"
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                </div>

                <div className="flex items-center gap-3">
                    <input
                        type="checkbox"
                        id="canLeave"
                        checked={canLeave}
                        onChange={(e) => setCanLeave(e.target.checked)}
                        className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                    />
                    <label htmlFor="canLeave" className="text-sm text-gray-700">
                        Los miembros pueden abandonar el grupo
                    </label>
                </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200">
                <div className="p-4 border-b border-gray-200">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <UserPlus className="w-5 h-5 text-gray-600" />
                            <h3 className="font-medium text-gray-900">
                                Participantes ({currentGroup.members_list.length})
                            </h3>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                <Input
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="Buscar participante..."
                                    className="pl-10 w-56"
                                />
                            </div>
                            <Button 
                                size="sm" 
                                variant="outline"
                                className="bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100" 
                                onClick={() => setShowAddAllModal(true)}
                                disabled={addingAllResidents}
                            >
                                <UsersIcon className="w-4 h-4 mr-2" />
                                Añadir todos los residentes
                            </Button>
                        </div>
                    </div>
                    
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                        <h4 className="text-sm font-medium text-gray-700 mb-3">Añadir miembro individual</h4>
                        <div className="flex items-center gap-3">
                            <Input
                                value={newMemberEmail}
                                onChange={(e) => setNewMemberEmail(e.target.value)}
                                placeholder="email@ejemplo.com"
                                className="flex-1"
                            />
                            <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={handleAddMember}>
                                <Plus className="w-4 h-4 mr-2" />
                                Agregar Miembro
                            </Button>
                        </div>
                    </div>
                </div>
                
                <div className="divide-y divide-gray-200">
                    {filteredMembers.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                            {searchTerm ? "No se encontraron participantes con ese nombre" : "No hay participantes en el grupo"}
                        </div>
                    ) : (
                        filteredMembers.map((member) => (
                        <div key={member.id} className="p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                                    <Users className="w-5 h-5 text-gray-600" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <p className="font-medium text-gray-900">{member.full_name}</p>
                                        {member.is_admin && (
                                            <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                                                Admin
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-sm text-gray-500">{member.email}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {!member.is_admin ? (
                                    <Button 
                                        variant="outline" 
                                        size="sm"
                                        onClick={() => handleMakeAdmin(member.id)}
                                        className="text-blue-600 hover:text-blue-700 border-blue-200 hover:border-blue-300 hover:bg-blue-50"
                                        title="Hacer administrador"
                                    >
                                        Hacer admin
                                    </Button>
                                ) : (
                                    <Button 
                                        variant="outline" 
                                        size="sm"
                                        onClick={() => handleRemoveAdmin(member.id)}
                                        className="text-orange-600 hover:text-orange-700 border-orange-200 hover:border-orange-300 hover:bg-orange-50"
                                        title="Quitar rol de administrador"
                                        disabled={member.email === currentGroup.created_by_email}
                                    >
                                        <ShieldX className="w-4 h-4 mr-1" />
                                        Quitar admin
                                    </Button>
                                )}
                                <Button 
                                    variant="ghost" 
                                    size="icon"
                                    onClick={() => handleDeleteMemberClick(member)}
                                    className="w-8 h-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                                    title="Eliminar miembro"
                                    disabled={member.email === currentUserEmail || currentGroup.members_list.length <= 1}
                                >
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    ))
                    )}
                </div>
            </div>

            <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={onBack}>
                    Cancelar
                </Button>
                <Button className="bg-green-600 hover:bg-green-700" onClick={handleSaveChanges} disabled={saving}>
                    {saving ? "Guardando..." : "Guardar Cambios"}
                </Button>
            </div>

            <ConfirmationModal
                isOpen={showDeleteModal}
                onClose={() => {
                    setShowDeleteModal(false);
                    setMemberToDelete(null);
                }}
                onConfirm={handleRemoveMember}
                title="Eliminar miembro"
                message={`¿Estás seguro de que quieres eliminar a ${memberToDelete?.name} del grupo? Esta acción no se puede deshacer.`}
                confirmText="Eliminar"
                cancelText="Cancelar"
                isDestructive={true}
                isLoading={deletingMember}
            />

            <ConfirmationModal
                isOpen={showAddAllModal}
                onClose={() => setShowAddAllModal(false)}
                onConfirm={handleAddAllResidents}
                title="Añadir a todos los residentes"
                message="¿Quieres añadir automáticamente a todos los residentes activos al grupo? Este proceso puede tardar unos segundos."
                confirmText="Añadir a todos"
                cancelText="Cancelar"
                isDestructive={false}
                isLoading={addingAllResidents}
            />
        </div>
    );
}