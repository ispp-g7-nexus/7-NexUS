import { ArrowLeft, UserPlus, X, Users, Search } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { ConfirmationModal } from "../../components/ui/ConfirmationModal";
import { ResidentSelector } from "../../components/ResidentSelector";
import { chatsService, type ChatGroup, type ChatGroupLabelItem } from "../../services/chats";
import { type Resident } from "../../services/residents";
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
    const [groupType, setGroupType] = useState<string>(group.label);
    const [canLeave, setCanLeave] = useState(group.can_members_leave);
    const [saving, setSaving] = useState(false);
    const [currentUserEmail, setCurrentUserEmail] = useState<string>("");
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [memberToDelete, setMemberToDelete] = useState<{ id: number; name: string } | null>(null);
    const [deletingMember, setDeletingMember] = useState(false);
    const [customLabels, setCustomLabels] = useState<ChatGroupLabelItem[]>([]);
    const [memberSearchTerm, setMemberSearchTerm] = useState("");

    useEffect(() => {
        setCurrentGroup(group);
    }, [group]);

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
        chatsService.listLabels().then(setCustomLabels).catch(() => { });
    }, []);

    useEffect(() => {
        if (!currentUserEmail) return;

        const myMember = currentGroup.members_list.find((member) => member.email === currentUserEmail);
        if (!myMember) return;

        if (!myMember.is_admin) {
            toast.info("Ya no eres administrador del grupo.");
            onBack();
        }
    }, [currentGroup, currentUserEmail, onBack]);

    const normalizeSearchValue = (value: string) =>
        value
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .trim();

    const normalizedMemberSearch = normalizeSearchValue(memberSearchTerm);
    
    const filteredMembers = currentGroup.members_list.filter((member) =>
        normalizedMemberSearch.length === 0
        || normalizeSearchValue(member.full_name).includes(normalizedMemberSearch)
        || normalizeSearchValue(member.email).includes(normalizedMemberSearch)
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

        if (member.email === currentGroup.created_by_email) {
            toast.error("No puedes eliminar al creador del grupo.");
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
            if (member?.email === currentUserEmail) {
                toast.success("Has dejado de ser administrador del grupo.");
                onBack();
                return;
            }
            toast.success("Rol de administrador eliminado correctamente.");
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : "No se pudo eliminar el rol de administrador.");
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

    const handleAddSelectedMembers = async (residents: Resident[]) => {
        if (residents.length === 0) {
            toast.error("Debes seleccionar al menos un residente.");
            return;
        }

        try {
            let updatedGroup = currentGroup;
            let addedCount = 0;

            for (const resident of residents) {
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
                const residentSuffix = addedCount === 1 ? "" : "s";
                toast.success(`Se añadieron ${addedCount} residente${residentSuffix} correctamente.`);
            } else {
                toast.error("No se pudo añadir ningún residente.");
            }
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : "Error al añadir residentes.");
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
                        <label htmlFor="edit-group-name" className="block text-sm font-medium text-gray-500 mb-2">
                            Nombre del grupo
                        </label>
                        <Input
                            id="edit-group-name"
                            value={groupName}
                            onChange={(e) => setGroupName(e.target.value)}
                            placeholder="Nombre del grupo"
                        />
                    </div>

                    <div>
                        <label htmlFor="edit-group-label" className="block text-sm font-medium text-gray-500 mb-2">
                            Etiqueta
                        </label>
                        <select
                            id="edit-group-label"
                            value={groupType}
                            onChange={(e) => setGroupType(e.target.value as typeof groupType)}
                            className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                            <option value="general">General</option>
                            <option value="floor">Por planta</option>
                            <option value="activity">Actividades</option>
                            <option value="private">Privado</option>
                            {customLabels.map((l) => (
                                <option key={l.id} value={l.name}>{l.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div>
                    <label htmlFor="edit-group-description" className="block text-sm font-medium text-gray-500 mb-2">
                        Descripción
                    </label>
                    <textarea
                        id="edit-group-description"
                        value={groupDescription}
                        onChange={(e) => setGroupDescription(e.target.value)}
                        placeholder="Descripción del grupo"
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                </div>

                <div className="flex items-center gap-3">
                    <input
                        type="checkbox"
                        id="canLeave"
                        checked={canLeave}
                        onChange={(e) => setCanLeave(e.target.checked)}
                        className="w-4 h-4 text-primary border-gray-200 rounded focus:ring-primary"
                    />
                    <label htmlFor="canLeave" className="text-sm text-gray-500">
                        Los miembros pueden abandonar el grupo
                    </label>
                </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200">
                <div className="p-4 border-b border-gray-200">
                    <div className="flex items-center gap-2 mb-4">
                        <UserPlus className="w-5 h-5 text-gray-500" />
                        <h3 className="font-medium text-gray-900">
                            Participantes ({currentGroup.members_list.length})
                        </h3>
                    </div>

                    <ResidentSelector
                        currentMembers={currentGroup.members_list}
                        onAddMembers={handleAddSelectedMembers}
                    />
                </div>

                <div className="p-4 border-b border-gray-200">
                    <div className="relative mb-4">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <Input
                            value={memberSearchTerm}
                            onChange={(e) => setMemberSearchTerm(e.target.value)}
                            placeholder="Buscar participante..."
                            className="pl-10"
                        />
                    </div>
                </div>

                <div className="divide-y divide-gray-200">
                    {filteredMembers.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                            {memberSearchTerm ? "No se encontraron participantes con ese criterio" : "No hay participantes en el grupo"}
                        </div>
                    ) : (
                        filteredMembers.map((member) => (
                            <div key={member.id} className="p-4 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                                        <Users className="w-5 h-5 text-gray-500" />
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
                                    {member.is_admin ? (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleRemoveAdmin(member.id)}
                                            className="text-orange-600 hover:text-orange-700 border-orange-200 hover:border-orange-300 hover:bg-orange-50"
                                            title="Quitar administrador"
                                        >
                                            Quitar Admin
                                        </Button>
                                    ) : (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleMakeAdmin(member.id)}
                                            className="text-blue-600 hover:text-blue-700 border-blue-200 hover:border-blue-300 hover:bg-blue-50"
                                            title="Hacer administrador"
                                        >
                                            Hacer admin
                                        </Button>
                                    )}
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleDeleteMemberClick(member)}
                                        className="w-8 h-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                                        title="Eliminar miembro"
                                        disabled={
                                            member.email === currentUserEmail
                                            || member.email === currentGroup.created_by_email
                                            || currentGroup.members_list.length <= 1
                                        }
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
                <Button className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={handleSaveChanges} disabled={saving}>
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
        </div>
    );
}