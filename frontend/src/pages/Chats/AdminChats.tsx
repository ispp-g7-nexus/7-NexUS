import { MessageSquare, Users, Plus, Search, Trash2 } from "lucide-react";
import { useState } from "react";
import { AdminGroupEdit } from "./AdminGroupEdit";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";

interface Group {
    id: string;
    name: string;
    description: string;
    members: number;
    type: "general" | "floor" | "activity" | "private";
    canLeave: boolean;
    membersList: Member[];
}

interface Member {
    id: string;
    name: string;
    email: string;
    avatar?: string;
    isAdmin: boolean;
}

const mockMembers: Member[] = [
    { id: "1", name: "Ana García", email: "ana.garcia@email.com", isAdmin: true },
    { id: "2", name: "Carlos López", email: "carlos.lopez@email.com", isAdmin: false },
    { id: "3", name: "María Rodríguez", email: "maria.rodriguez@email.com", isAdmin: false },
    { id: "4", name: "Juan Martín", email: "juan.martin@email.com", isAdmin: false },
    { id: "5", name: "Laura Sánchez", email: "laura.sanchez@email.com", isAdmin: false },
];

const mockGroups: Group[] = [
    {
        id: "1",
        name: "General - Residencia",
        description: "Grupo general para todos los residentes",
        members: 156,
        type: "general",
        canLeave: false,
        membersList: mockMembers
    },
    {
        id: "2", 
        name: "Planta 1",
        description: "Grupo para residentes de la primera planta",
        members: 24,
        type: "floor",
        canLeave: true,
        membersList: mockMembers.slice(0, 3)
    }
];

const typeConfig = {
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
    const [editingGroup, setEditingGroup] = useState<Group | null>(null);

    const filteredGroups = mockGroups.filter(group => {
        const matchesSearch = group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            group.description.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesType = selectedType === "all" || group.type === selectedType;
        return matchesSearch && matchesType;
    });

    const handleBackToList = () => {
        setEditingGroup(null);
    };

    const handleEditGroup = (group: Group) => {
        setEditingGroup(group);
    };

    const handleDeleteGroup = (groupId: string) => {
        // TODO: Lógica para eliminar el grupo
        console.log('Eliminar grupo:', groupId);
    };

    if (editingGroup) {
        return <AdminGroupEdit group={editingGroup} onBack={handleBackToList} />;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Grupos</h1>
                    <p className="text-sm text-gray-500 mt-1">Gestiona los grupos de chat de la residencia</p>
                </div>
                <Button className="bg-green-600 hover:bg-green-700">
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
                        const config = typeConfig[group.type];
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

            {filteredGroups.length === 0 && (
                <div className="text-center py-12">
                    <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No se encontraron grupos</h3>
                    <p className="text-gray-500">Intenta cambiar los filtros de búsqueda o crear un nuevo grupo.</p>
                </div>
            )}
        </div>
    );
}