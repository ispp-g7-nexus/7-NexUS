import { ArrowLeft, UserPlus, X, Plus, Users } from "lucide-react";
import { useState } from "react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";

interface Member {
    id: string;
    name: string;
    email: string;
    avatar?: string;
    isAdmin: boolean;
}

interface Group {
    id: string;
    name: string;
    description: string;
    members: number;
    type: "general" | "floor" | "activity" | "private";
    canLeave: boolean;
    membersList: Member[];
}

interface AdminGroupEditProps {
    group: Group;
    onBack: () => void;
}

export function AdminGroupEdit({ group, onBack }: AdminGroupEditProps) {
    const [groupName, setGroupName] = useState(group.name);
    const [groupDescription, setGroupDescription] = useState(group.description);
    const [groupType, setGroupType] = useState<"general" | "floor" | "activity" | "private">(group.type);
    const [canLeave, setCanLeave] = useState(group.canLeave);

    const handleRemoveMember = (memberId: string) => {
        // TODO: Lógica para eliminar un miembro del grupo
        console.log('Eliminar miembro:', memberId);
    };

    const handleMakeAdmin = (memberId: string) => {
        // TODO: Lógica para hacer administrador a un miembro
        console.log('Hacer administrador:', memberId);
    };

    const handleSaveChanges = () => {
        // TODO: Lógica para guardar los cambios
        console.log('Guardar cambios del grupo:', {
            id: group.id,
            name: groupName,
            description: groupDescription,
            type: groupType,
            canLeave
        });
        onBack();
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
                            Participantes ({group.membersList.length})
                        </h3>
                    </div>
                    <Button size="sm" className="bg-green-600 hover:bg-green-700">
                        <Plus className="w-4 h-4 mr-2" />
                        Agregar Miembro
                    </Button>
                </div>
                
                <div className="divide-y divide-gray-200">
                    {group.membersList.map((member) => (
                        <div key={member.id} className="p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                                    <Users className="w-5 h-5 text-gray-600" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <p className="font-medium text-gray-900">{member.name}</p>
                                        {member.isAdmin && (
                                            <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                                                Admin
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-sm text-gray-500">{member.email}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {!member.isAdmin && (
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
                <Button className="bg-green-600 hover:bg-green-700" onClick={handleSaveChanges}>
                    Guardar Cambios
                </Button>
            </div>
        </div>
    );
}