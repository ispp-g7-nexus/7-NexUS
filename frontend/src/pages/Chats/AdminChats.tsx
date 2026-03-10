import { MessageSquare, Users, Plus, Search, Trash2 } from "lucide-react";
import { type ReactElement, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AdminGroupEdit } from "./AdminGroupEdit";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "../../components/ui/dialog";
import { chatsService, type ChatGroup, type ChatLabel, type UpsertChatGroupPayload } from "../../services/chats";

const EMPTY_GROUP_FORM: UpsertChatGroupPayload = {
    name: "",
    description: "",
    label: "general",
    can_members_leave: true,
};

const typeConfig: Record<ChatLabel, { label: string; color: string; icon: ReactElement }> = {
    general: { 
        label: "General", 
        color: "bg-blue-100 text-blue-800",
        icon: <MessageSquare className="w-3 h-3" />
    },
    floor: {
        label: "Planta",
        color: "bg-green-100 text-green-800", 
        icon: <Users className="w-3 h-3" />
    },
    activity: {
        label: "Actividad",
        color: "bg-purple-100 text-purple-800",
        icon: <Users className="w-3 h-3" />
    },
    private: {
        label: "Privado",
        color: "bg-gray-100 text-gray-800",
        icon: <Users className="w-3 h-3" />
    }
};

export function AdminChats() {
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedType, setSelectedType] = useState<string>("all");
    const [groups, setGroups] = useState<ChatGroup[]>([]);
    const [loading, setLoading] = useState(true);
    const [isUnauthorized, setIsUnauthorized] = useState(false);
    const [editingGroup, setEditingGroup] = useState<ChatGroup | null>(null);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [createForm, setCreateForm] = useState<UpsertChatGroupPayload>(EMPTY_GROUP_FORM);

    const refreshGroups = async () => {
        setLoading(true);
        try {
            const data = await chatsService.listGroups();
            setGroups(data);
            setIsUnauthorized(false);
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            if (msg.includes("401") || msg.includes("403")) {
                setIsUnauthorized(true);
            } else {
                toast.error("No se pudieron cargar los grupos de chat.");
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        refreshGroups();
    }, []);

    const filteredGroups = useMemo(() => {
        return groups.filter((group) => {
            const matchesSearch =
                group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                group.description.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesType = selectedType === "all" || group.label === selectedType;
            return matchesSearch && matchesType;
        });
    }, [groups, searchTerm, selectedType]);

    const handleBackToList = () => {
        setEditingGroup(null);
    };

    const handleEditGroup = (group: ChatGroup) => {
        setEditingGroup(group);
    };

    const handleDeleteGroup = async (groupId: number) => {
        const confirmed = window.confirm("¿Seguro que quieres eliminar este grupo?");
        if (!confirmed) return;

        try {
            await chatsService.deleteGroup(groupId);
            setGroups((prev) => prev.filter((group) => group.id !== groupId));
            toast.success("Grupo eliminado correctamente.");
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : "No se pudo eliminar el grupo.");
        }
    };

    const handleCreateGroup = async () => {
        if (!createForm.name.trim()) {
            toast.error("El nombre del grupo es obligatorio.");
            return;
        }

        setIsCreating(true);
        try {
            const created = await chatsService.createGroup({
                ...createForm,
                name: createForm.name.trim(),
                description: createForm.description.trim(),
            });
            setGroups((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
            setCreateForm(EMPTY_GROUP_FORM);
            setIsCreateOpen(false);
            toast.success("Grupo creado correctamente.");
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : "No se pudo crear el grupo.");
        } finally {
            setIsCreating(false);
        }
    };

    const handleGroupUpdated = (updated: ChatGroup) => {
        setGroups((prev) => prev.map((group) => (group.id === updated.id ? updated : group)));
        setEditingGroup(updated);
    };

    if (isUnauthorized) {
        return (
            <div className="flex items-center justify-center h-64 text-gray-500">
                No tienes permisos para gestionar los chats.
            </div>
        );
    };

    if (editingGroup) {
        return (
            <AdminGroupEdit
                group={editingGroup}
                onBack={handleBackToList}
                onGroupUpdated={handleGroupUpdated}
            />
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Grupos</h1>
                    <p className="text-sm text-gray-500 mt-1">Gestiona los grupos de chat de la residencia</p>
                </div>
                <Button className="bg-green-600 hover:bg-green-700" onClick={() => setIsCreateOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Crear Grupo
                </Button>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                    <div className="relative">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <Input
                            placeholder="Buscar grupos..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9"
                        />
                    </div>
                </div>
                <select
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                    <option value="all">Todos los tipos</option>
                    <option value="general">General</option>
                    <option value="floor">Por planta</option>
                    <option value="activity">Actividades</option>
                    <option value="private">Privados</option>
                </select>
            </div>

            <div className="bg-white rounded-lg border border-gray-200">
                <div className="p-4 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                        <h3 className="font-medium text-gray-900">
                            {filteredGroups.length} {filteredGroups.length === 1 ? 'grupo' : 'grupos'} encontrados
                        </h3>
                    </div>
                </div>

                <div className="divide-y divide-gray-200">
                    {filteredGroups.map((group) => {
                        const config = typeConfig[group.label];
                        return (
                            <div key={group.id} className="p-4 hover:bg-gray-50 transition-colors">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-3 mb-2">
                                            <h4 className="font-medium text-gray-900 truncate">
                                                {group.name}
                                            </h4>
                                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
                                                {config.icon}
                                                {config.label}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-600 mb-2">
                                            {group.description}
                                        </p>
                                        <div className="flex items-center gap-4 text-xs text-gray-500">
                                            <span className="flex items-center gap-1">
                                                <Users className="w-3 h-3" />
                                                {group.members} miembros
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 ml-4">
                                        <Button 
                                            variant="outline" 
                                            size="sm"
                                            onClick={() => handleEditGroup(group)}
                                        >
                                            Gestionar
                                        </Button>
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="w-8 h-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                                            onClick={() => handleDeleteGroup(group.id)}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {loading && (
                <div className="text-sm text-gray-500">Cargando grupos...</div>
            )}

            {filteredGroups.length === 0 && (
                <div className="text-center py-12">
                    <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No se encontraron grupos</h3>
                    <p className="text-gray-500">Intenta cambiar los filtros de búsqueda o crear un nuevo grupo.</p>
                </div>
            )}

            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Crear nuevo grupo</DialogTitle>
                        <DialogDescription>
                            Define el nombre, descripción, etiqueta y si los miembros pueden abandonarlo.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                            <Input
                                value={createForm.name}
                                onChange={(e) => setCreateForm((prev) => ({ ...prev, name: e.target.value }))}
                                placeholder="Ej. Grupo General"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                            <textarea
                                value={createForm.description}
                                onChange={(e) => setCreateForm((prev) => ({ ...prev, description: e.target.value }))}
                                rows={3}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Etiqueta</label>
                            <select
                                value={createForm.label}
                                onChange={(e) => setCreateForm((prev) => ({ ...prev, label: e.target.value as ChatLabel }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                            >
                                <option value="general">General</option>
                                <option value="floor">Por planta</option>
                                <option value="activity">Actividades</option>
                                <option value="private">Privado</option>
                            </select>
                        </div>

                        <div className="flex items-center gap-3">
                            <input
                                type="checkbox"
                                id="create-can-leave"
                                checked={createForm.can_members_leave}
                                onChange={(e) =>
                                    setCreateForm((prev) => ({ ...prev, can_members_leave: e.target.checked }))
                                }
                                className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                            />
                            <label htmlFor="create-can-leave" className="text-sm text-gray-700">
                                Los miembros pueden abandonar el grupo
                            </label>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                            Cancelar
                        </Button>
                        <Button className="bg-green-600 hover:bg-green-700" onClick={handleCreateGroup} disabled={isCreating}>
                            {isCreating ? "Creando..." : "Crear grupo"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}