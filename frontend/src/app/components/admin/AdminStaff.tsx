import { useState } from "react";
import {
  Mail,
  MapPin,
  UserPlus,
  Search,
  MoreVertical,
  Edit,
  Trash2,
  Briefcase,
  Clock,
} from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Badge } from "../ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Label } from "../ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { toast } from "sonner";

interface StaffMember {
  id: string;
  name: string;
  role: string;
  department: string;
  email: string;
  location: string;
  shift: string;
  status: "active" | "inactive" | "vacation";
  avatar?: string;
  joinDate: string;
}

export function AdminStaff() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterDepartment, setFilterDepartment] = useState("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [newStaff, setNewStaff] = useState({
    name: "",
    role: "",
    department: "",
    email: "",
    location: "",
    shift: "",
    status: "active" as "active" | "inactive" | "vacation",
  });

  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([
    {
      id: "1",
      name: "María García",
      role: "Directora de Residencia",
      department: "Administración",
      email: "maria.garcia@nexus.com",
      location: "Oficina Principal - Planta 1",
      shift: "Lunes a Viernes 9:00-18:00",
      status: "active",
      joinDate: "2023-01-15",
    },
    {
      id: "2",
      name: "Carlos Martínez",
      role: "Responsable de Mantenimiento",
      department: "Mantenimiento",
      email: "carlos.martinez@nexus.com",
      location: "Sala de Mantenimiento - Sótano",
      shift: "Lunes a Sábado 8:00-16:00",
      status: "active",
      joinDate: "2023-03-20",
    },
    {
      id: "3",
      name: "Ana López",
      role: "Encargada de Cocina",
      department: "Cocina",
      email: "ana.lopez@nexus.com",
      location: "Cocina Principal - Planta Baja",
      shift: "Lunes a Domingo 6:00-15:00",
      status: "active",
      joinDate: "2023-02-10",
    },
    {
      id: "4",
      name: "David Sánchez",
      role: "Recepcionista",
      department: "Recepción",
      email: "david.sanchez@nexus.com",
      location: "Recepción - Entrada Principal",
      shift: "Turnos rotativos 24/7",
      status: "active",
      joinDate: "2023-06-01",
    },
    {
      id: "5",
      name: "Laura Fernández",
      role: "Limpieza y Servicios",
      department: "Limpieza",
      email: "laura.fernandez@nexus.com",
      location: "Sala de Limpieza - Planta Baja",
      shift: "Lunes a Viernes 7:00-15:00",
      status: "vacation",
      joinDate: "2023-04-15",
    },
    {
      id: "6",
      name: "Roberto Torres",
      role: "Seguridad",
      department: "Seguridad",
      email: "roberto.torres@nexus.com",
      location: "Garita de Seguridad - Entrada",
      shift: "Turnos nocturnos 22:00-6:00",
      status: "active",
      joinDate: "2023-05-10",
    },
  ]);

  const departments = ["all", "Administración", "Mantenimiento", "Cocina", "Recepción", "Limpieza", "Seguridad"];

  const filteredStaff = staffMembers.filter((member) => {
    const matchesSearch =
      member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDepartment =
      filterDepartment === "all" || member.department === filterDepartment;
    return matchesSearch && matchesDepartment;
  });

  // Función para agregar personal
  const handleAddStaff = () => {
    if (!newStaff.name || !newStaff.role || !newStaff.department || !newStaff.email || !newStaff.location || !newStaff.shift) {
      toast.error("Por favor, completa todos los campos obligatorios");
      return;
    }

    const staffToAdd: StaffMember = {
      id: (staffMembers.length + 1).toString(),
      name: newStaff.name,
      role: newStaff.role,
      department: newStaff.department,
      email: newStaff.email,
      location: newStaff.location,
      shift: newStaff.shift,
      status: newStaff.status,
      joinDate: new Date().toISOString().split('T')[0],
    };

    setStaffMembers([...staffMembers, staffToAdd]);
    
    // Resetear formulario
    setNewStaff({
      name: "",
      role: "",
      department: "",
      email: "",
      location: "",
      shift: "",
      status: "active",
    });
    
    setIsAddDialogOpen(false);
    toast.success("Personal agregado correctamente");
  };

  // Función para editar personal
  const handleEditStaff = () => {
    if (!editingStaff) return;

    const updatedStaff = staffMembers.map(s => 
      s.id === editingStaff.id ? editingStaff : s
    );

    setStaffMembers(updatedStaff);
    setIsEditDialogOpen(false);
    setEditingStaff(null);
    toast.success("Personal actualizado correctamente");
  };

  // Función para eliminar personal
  const handleDeleteStaff = (id: string) => {
    setStaffMembers(staffMembers.filter(s => s.id !== id));
    toast.success("Personal eliminado correctamente");
  };

  // Función para abrir diálogo de edición
  const openEditDialog = (staff: StaffMember) => {
    setEditingStaff({ ...staff });
    setIsEditDialogOpen(true);
  };

  const getStatusBadge = (status: StaffMember["status"]) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-500/10 text-green-700 hover:bg-green-500/20">Activo</Badge>;
      case "vacation":
        return <Badge className="bg-orange-500/10 text-orange-700 hover:bg-orange-500/20">De Vacaciones</Badge>;
      case "inactive":
        return <Badge className="bg-gray-500/10 text-gray-700 hover:bg-gray-500/20">Inactivo</Badge>;
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Directorio de Personal</h2>
          <p className="text-sm text-gray-500 mt-1">
            Gestión y contacto del equipo de la residencia
          </p>
        </div>
        <Button 
          className="bg-[#509550] hover:bg-[#509550]/90 text-white"
          onClick={() => setIsAddDialogOpen(true)}
        >
          <UserPlus className="w-4 h-4 mr-2" />
          Añadir Personal
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-sm text-gray-500 truncate">Total Personal</p>
                <p className="text-2xl font-bold text-gray-900 mt-1 truncate">{staffMembers.length}</p>
              </div>
              <div className="w-12 h-12 shrink-0 bg-[#509550]/10 rounded-lg flex items-center justify-center">
                <Briefcase className="w-6 h-6 text-[#509550]" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-sm text-gray-500 truncate">Activos</p>
                <p className="text-2xl font-bold text-green-600 mt-1 truncate">
                  {staffMembers.filter((s) => s.status === "active").length}
                </p>
              </div>
              <div className="w-12 h-12 shrink-0 bg-green-500/10 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-sm text-gray-500 truncate">De Vacaciones</p>
                <p className="text-2xl font-bold text-orange-600 mt-1 truncate">
                  {staffMembers.filter((s) => s.status === "vacation").length}
                </p>
              </div>
              <div className="w-12 h-12 shrink-0 bg-[#F5A623]/10 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-[#F5A623]" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-sm text-gray-500 truncate">Departamentos</p>
                <p className="text-2xl font-bold text-gray-900 mt-1 truncate">{departments.length - 1}</p>
              </div>
              <div className="w-12 h-12 shrink-0 bg-gray-100 rounded-lg flex items-center justify-center">
                <Briefcase className="w-6 h-6 text-gray-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Buscar por nombre, cargo o email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterDepartment} onValueChange={setFilterDepartment}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Departamento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="Administración">Administración</SelectItem>
                <SelectItem value="Mantenimiento">Mantenimiento</SelectItem>
                <SelectItem value="Cocina">Cocina</SelectItem>
                <SelectItem value="Recepción">Recepción</SelectItem>
                <SelectItem value="Limpieza">Limpieza</SelectItem>
                <SelectItem value="Seguridad">Seguridad</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Staff Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredStaff.map((member) => (
          <Card key={member.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-4 flex-1 min-w-0">
                  <Avatar className="h-14 w-14 border-2 border-gray-100 shrink-0">
                    <AvatarImage src={member.avatar} />
                    <AvatarFallback className="bg-[#509550] text-white font-semibold">
                      {getInitials(member.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-gray-900 truncate pr-2">{member.name}</h3>
                    <p className="text-sm text-gray-600 truncate">{member.role}</p>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <Badge variant="outline" className="text-xs truncate max-w-[150px]">
                        {member.department}
                      </Badge>
                      <div className="shrink-0">{getStatusBadge(member.status)}</div>
                    </div>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => openEditDialog(member)}>
                      <Edit className="w-4 h-4 mr-2" />
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      className="text-red-600"
                      onClick={() => handleDeleteStaff(member.id)}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Eliminar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="space-y-3 pt-4 border-t border-gray-100">
                <div className="flex items-center gap-3 text-sm">
                  <Mail className="w-4 h-4 text-gray-400 shrink-0" />
                  <a
                    href={`mailto:${member.email}`}
                    className="text-[#509550] hover:underline truncate min-w-0"
                  >
                    {member.email}
                  </a>
                </div>
                <div className="flex items-start gap-3 text-sm">
                  <MapPin className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                  <span className="text-gray-600 truncate min-w-0">{member.location}</span>
                </div>
                <div className="flex items-start gap-3 text-sm">
                  <Clock className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                  <span className="text-gray-600 truncate min-w-0">{member.shift}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredStaff.length === 0 && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Briefcase className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No se encontraron resultados</p>
              <p className="text-sm text-gray-400 mt-1">
                Intenta ajustar los filtros de búsqueda
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dialog Agregar Personal */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Añadir Nuevo Miembro del Personal</DialogTitle>
            <DialogDescription>
              Introduce los datos del nuevo trabajador
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre Completo *</Label>
              <Input 
                id="name" 
                placeholder="Juan Pérez" 
                value={newStaff.name}
                onChange={(e) => setNewStaff({ ...newStaff, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Cargo *</Label>
              <Input 
                id="role" 
                placeholder="Responsable de..." 
                value={newStaff.role}
                onChange={(e) => setNewStaff({ ...newStaff, role: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="department">Departamento *</Label>
              <Select
                value={newStaff.department}
                onValueChange={(value) => setNewStaff({ ...newStaff, department: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona departamento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Administración">Administración</SelectItem>
                  <SelectItem value="Mantenimiento">Mantenimiento</SelectItem>
                  <SelectItem value="Cocina">Cocina</SelectItem>
                  <SelectItem value="Recepción">Recepción</SelectItem>
                  <SelectItem value="Limpieza">Limpieza</SelectItem>
                  <SelectItem value="Seguridad">Seguridad</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="email@nexus.com" 
                value={newStaff.email}
                onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Ubicación *</Label>
              <Input 
                id="location" 
                placeholder="Oficina, Planta..." 
                value={newStaff.location}
                onChange={(e) => setNewStaff({ ...newStaff, location: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="shift">Horario *</Label>
              <Input 
                id="shift" 
                placeholder="Lunes a Viernes 9:00-18:00" 
                value={newStaff.shift}
                onChange={(e) => setNewStaff({ ...newStaff, shift: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Estado *</Label>
              <Select
                value={newStaff.status}
                onValueChange={(value: "active" | "inactive" | "vacation") => 
                  setNewStaff({ ...newStaff, status: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Activo</SelectItem>
                  <SelectItem value="vacation">De Vacaciones</SelectItem>
                  <SelectItem value="inactive">Inactivo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              className="bg-[#509550] hover:bg-[#509550]/90 text-white"
              onClick={handleAddStaff}
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Agregar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Editar Personal */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Miembro del Personal</DialogTitle>
            <DialogDescription>
              Modifica los datos del trabajador
            </DialogDescription>
          </DialogHeader>
          {editingStaff && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Nombre Completo *</Label>
                <Input 
                  id="edit-name" 
                  placeholder="Juan Pérez" 
                  value={editingStaff.name}
                  onChange={(e) => setEditingStaff({ ...editingStaff, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-role">Cargo *</Label>
                <Input 
                  id="edit-role" 
                  placeholder="Responsable de..." 
                  value={editingStaff.role}
                  onChange={(e) => setEditingStaff({ ...editingStaff, role: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-department">Departamento *</Label>
                <Select
                  value={editingStaff.department}
                  onValueChange={(value) => setEditingStaff({ ...editingStaff, department: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Administración">Administración</SelectItem>
                    <SelectItem value="Mantenimiento">Mantenimiento</SelectItem>
                    <SelectItem value="Cocina">Cocina</SelectItem>
                    <SelectItem value="Recepción">Recepción</SelectItem>
                    <SelectItem value="Limpieza">Limpieza</SelectItem>
                    <SelectItem value="Seguridad">Seguridad</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-email">Email *</Label>
                <Input 
                  id="edit-email" 
                  type="email" 
                  placeholder="email@nexus.com" 
                  value={editingStaff.email}
                  onChange={(e) => setEditingStaff({ ...editingStaff, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-location">Ubicación *</Label>
                <Input 
                  id="edit-location" 
                  placeholder="Oficina, Planta..." 
                  value={editingStaff.location}
                  onChange={(e) => setEditingStaff({ ...editingStaff, location: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-shift">Horario *</Label>
                <Input 
                  id="edit-shift" 
                  placeholder="Lunes a Viernes 9:00-18:00" 
                  value={editingStaff.shift}
                  onChange={(e) => setEditingStaff({ ...editingStaff, shift: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-status">Estado *</Label>
                <Select
                  value={editingStaff.status}
                  onValueChange={(value: "active" | "inactive" | "vacation") => 
                    setEditingStaff({ ...editingStaff, status: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Activo</SelectItem>
                    <SelectItem value="vacation">De Vacaciones</SelectItem>
                    <SelectItem value="inactive">Inactivo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              className="bg-[#509550] hover:bg-[#509550]/90 text-white"
              onClick={handleEditStaff}
            >
              Guardar Cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}