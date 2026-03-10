import { ArrowLeft, UserPlus, X, Plus, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { chatsService, type ChatGroup, type ChatLabel } from "../../services/chats";

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
    const [newMemberIsAdmin, setNewMemberIsAdmin] = useState(false);
    const [saving, setSaving] = useState(false);

    const handleRemoveMember = async (memberId: number) => {
        try {
            await chatsService.removeMember(currentGroup.id, memberId);
            const updated = {
                ...currentGroup,
                members_list: currentGroup.members_list.filter((member) => member.id !== memberId),
                members: currentGroup.members - 1,
            };
            setCurrentGroup(updated);
            onGroupUpdated(updated);
            toast.success("Miembro eliminado correctamente.");
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : "No se pudo eliminar el miembro.");
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
                is_admin: newMemberIsAdmin,
            });
            setCurrentGroup(updated);
            onGroupUpdated(updated);
            setNewMemberEmail("");
            setNewMemberIsAdmin(false);
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
                <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <UserPlus className="w-5 h-5 text-gray-600" />
                        <h3 className="font-medium text-gray-900">
                            Participantes ({currentGroup.members_list.length})
                        </h3>
                    </div>
                    <div className="flex items-center gap-3">
                        <Input
                            value={newMemberEmail}
                            onChange={(e) => setNewMemberEmail(e.target.value)}
                            placeholder="email@ejemplo.com"
                            className="w-52"
                        />
                        <label className="text-xs text-gray-600 flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={newMemberIsAdmin}
                                onChange={(e) => setNewMemberIsAdmin(e.target.checked)}
                                className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                            />
                            Admin
                        </label>
                        <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={handleAddMember}>
                            <Plus className="w-4 h-4 mr-2" />
                            Agregar Miembro
                        </Button>
                    </div>
                </div>
                
                <div className="divide-y divide-gray-200">
                    {currentGroup.members_list.map((member) => (
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
                                {!member.is_admin && (
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
                                    onClick={() => handleRemoveMember(member.id)}
                                    className="w-8 h-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                                    title="Eliminar miembro"
                                >
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    ))}
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
        </div>
    );
}