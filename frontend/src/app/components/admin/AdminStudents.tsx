import { useState } from "react";
import {
  Search,
  Filter,
  Mail,
  MapPin,
  Calendar,
  MoreVertical,
  Plus,
  User,
  Edit2,
  Trash2,
} from "lucide-react";
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "../ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Label } from "../ui/label";
import { toast } from "sonner";

interface Student {
  id: number;
  name: string;
  email: string;
  room: string;
  building: string;
  checkInDate: string;
  checkoutDate?: string;
  status: "active" | "pending" | "checkout";
}

export function AdminStudents() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [newStudent, setNewStudent] = useState({
    name: "",
    email: "",
    room: "",
    building: "",
    checkInDate: "",
    checkoutDate: "",
    status: "active" as "active" | "pending" | "checkout",
  });

  const [students, setStudents] = useState<Student[]>([
    {
      id: 1,
      name: "María González",
      email: "maria.gonzalez@email.com",
      room: "302-B",
      building: "A",
      checkInDate: "2025-09-15",
      status: "active",
    },
    {
      id: 2,
      name: "Carlos Ruiz",
      email: "carlos.ruiz@email.com",
      room: "305-A",
      building: "A",
      checkInDate: "2025-09-10",
      status: "active",
    },
    {
      id: 3,
      name: "Laura Pérez",
      email: "laura.perez@email.com",
      room: "201-B",
      building: "B",
      checkInDate: "2025-09-20",
      status: "pending",
    },
  ]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return (
          <Badge className="bg-green-100 text-green-700 hover:bg-green-200 border-green-200">
            Activo
          </Badge>
        );
      case "pending":
        return (
          <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-200 border-orange-200">
            Pendiente
          </Badge>
        );
      case "checkout":
        return (
          <Badge className="bg-gray-100 text-gray-700 hover:bg-gray-200 border-gray-200">
            Salida
          </Badge>
        );
      default:
        return null;
    }
  };

  // Función para agregar residente
  const handleAddStudent = () => {
    if (!newStudent.name || !newStudent.email || !newStudent.room || !newStudent.building || !newStudent.checkInDate) {
      toast.error("Por favor, completa todos los campos obligatorios");
      return;
    }

    // Validar que si el estado es "checkout", debe tener fecha de salida
    if (newStudent.status === "checkout" && !newStudent.checkoutDate) {
      toast.error("Para residentes con estado 'Salida', debes especificar la fecha de checkout");
      return;
    }

    const studentToAdd: Student = {
      id: students.length > 0 ? Math.max(...students.map(s => s.id)) + 1 : 1,
      name: newStudent.name,
      email: newStudent.email,
      room: newStudent.room,
      building: newStudent.building,
      checkInDate: newStudent.checkInDate,
      checkoutDate: newStudent.status === "checkout" ? newStudent.checkoutDate : undefined,
      status: newStudent.status,
    };

    setStudents([...students, studentToAdd]);
    
    // Resetear formulario
    setNewStudent({
      name: "",
      email: "",
      room: "",
      building: "",
      checkInDate: "",
      checkoutDate: "",
      status: "active",
    });
    
    setIsDialogOpen(false);
    toast.success("Residente agregado correctamente");
  };

  // Función para editar residente
  const handleEditStudent = () => {
    if (!editingStudent) return;

    if (!editingStudent.name || !editingStudent.email || !editingStudent.room || !editingStudent.building || !editingStudent.checkInDate) {
      toast.error("Por favor, completa todos los campos obligatorios");
      return;
    }

    // Validar que si el estado es "checkout", debe tener fecha de salida
    if (editingStudent.status === "checkout" && !editingStudent.checkoutDate) {
      toast.error("Para residentes con estado 'Salida', debes especificar la fecha de checkout");
      return;
    }

    const updatedStudents = students.map(s => 
      s.id === editingStudent.id ? editingStudent : s
    );

    setStudents(updatedStudents);
    setIsEditDialogOpen(false);
    setEditingStudent(null);
    toast.success("Residente actualizado correctamente");
  };

  // Función para eliminar residente
  const handleDeleteStudent = (id: number) => {
    setStudents(students.filter(s => s.id !== id));
    toast.success("Residente eliminado correctamente");
  };

  // Función para abrir diálogo de edición
  const openEditDialog = (student: Student) => {
    setEditingStudent({ ...student });
    setIsEditDialogOpen(true);
  };

  // Filtrar residentes
  const filteredStudents = students.filter((student) => {
    const matchesSearch = 
      student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.room.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = 
      statusFilter === "all" || student.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header y Filtros */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Residentes
          </h2>
          <p className="text-gray-500">
            Directorio completo de residentes
          </p>
        </div>
        <Button 
          className="bg-[#509550] hover:bg-[#3d7a3d] text-white"
          onClick={() => setIsDialogOpen(true)}
        >
          <Plus className="w-4 h-4 mr-2" /> Nuevo Residente
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar por nombre, habitación..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="active">Activos</SelectItem>
            <SelectItem value="pending">Pendientes</SelectItem>
            <SelectItem value="checkout">Salida</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Lista de Residentes (Cards) */}
      <div className="grid gap-4">
        {filteredStudents.map((student) => (
          <Card
            key={student.id}
            className="hover:shadow-md transition-shadow border-gray-200"
          >
            <CardContent className="p-5 flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              {/* Avatar */}
              <Avatar className="h-12 w-12 border border-gray-100">
                <AvatarFallback className="bg-[#509550]/10 text-[#509550] font-bold text-lg">
                  {student.name.charAt(0)}
                </AvatarFallback>
              </Avatar>

              {/* Info Principal */}
              <div className="flex-1 min-w-0 grid sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
                <div>
                  <h3 className="font-semibold text-gray-900 truncate">
                    {student.name}
                  </h3>
                  <div className="flex items-center gap-1.5 text-sm text-gray-500 mt-1">
                    <Mail className="w-3.5 h-3.5" />
                    <span className="truncate">
                      {student.email}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col justify-center text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-gray-400" />
                    <span>
                      Hab. {student.room}{" "}
                      <span className="text-gray-400">•</span>{" "}
                      Edif. {student.building}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <Calendar className="w-3.5 h-3.5 text-gray-400" />
                    <span>
                      Check-in:{" "}
                      {new Date(
                        student.checkInDate,
                      ).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-start sm:justify-end">
                  {getStatusBadge(student.status)}
                </div>
              </div>

              {/* Acciones */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <MoreVertical className="w-5 h-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => openEditDialog(student)}>
                    <Edit2 className="w-4 h-4 mr-2" />
                    Editar
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    className="text-red-600"
                    onClick={() => handleDeleteStudent(student.id)}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Eliminar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Dialog para Nuevo Residente */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-gray-900">
              Nuevo Residente
            </DialogTitle>
            <DialogDescription className="text-gray-500">
              Completa los datos del nuevo residente
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-5 py-4">
            {/* Nombre */}
            <div className="space-y-2">
              <Label htmlFor="name" className="text-gray-700 font-medium">
                Nombre completo *
              </Label>
              <Input
                id="name"
                placeholder="Ej: María González"
                value={newStudent.name}
                onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })}
                className="border-gray-200"
              />
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-700 font-medium">
                Email *
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="estudiante@email.com"
                value={newStudent.email}
                onChange={(e) => setNewStudent({ ...newStudent, email: e.target.value })}
                className="border-gray-200"
              />
            </div>

            {/* Habitación y Edificio */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="room" className="text-gray-700 font-medium">
                  Habitación *
                </Label>
                <Input
                  id="room"
                  placeholder="Ej: 302-B"
                  value={newStudent.room}
                  onChange={(e) => setNewStudent({ ...newStudent, room: e.target.value })}
                  className="border-gray-200"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="building" className="text-gray-700 font-medium">
                  Edificio *
                </Label>
                <Input
                  id="building"
                  placeholder="Ej: A"
                  value={newStudent.building}
                  onChange={(e) => setNewStudent({ ...newStudent, building: e.target.value })}
                  className="border-gray-200"
                />
              </div>
            </div>

            {/* Fecha de Check-in */}
            <div className="space-y-2">
              <Label htmlFor="checkInDate" className="text-gray-700 font-medium">
                Fecha de Check-in *
              </Label>
              <Input
                id="checkInDate"
                type="date"
                value={newStudent.checkInDate}
                onChange={(e) => setNewStudent({ ...newStudent, checkInDate: e.target.value })}
                className="border-gray-200"
              />
            </div>

            {/* Estado */}
            <div className="space-y-2">
              <Label htmlFor="status" className="text-gray-700 font-medium">
                Estado *
              </Label>
              <Select
                value={newStudent.status}
                onValueChange={(value: "active" | "pending" | "checkout") =>
                  setNewStudent({ ...newStudent, status: value })
                }
              >
                <SelectTrigger className="border-gray-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Activo</SelectItem>
                  <SelectItem value="pending">Pendiente</SelectItem>
                  <SelectItem value="checkout">Salida</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Fecha de Checkout (solo si estado es "checkout") */}
            {newStudent.status === "checkout" && (
              <div className="space-y-2">
                <Label htmlFor="checkoutDate" className="text-gray-700 font-medium">
                  Fecha de Checkout *
                </Label>
                <Input
                  id="checkoutDate"
                  type="date"
                  value={newStudent.checkoutDate}
                  onChange={(e) => setNewStudent({ ...newStudent, checkoutDate: e.target.value })}
                  className="border-gray-200"
                />
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              className="border-gray-200"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleAddStudent}
              className="bg-[#509550] hover:bg-[#3d7a3d] text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Agregar Residente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para Editar Residente */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-gray-900">
              Editar Residente
            </DialogTitle>
            <DialogDescription className="text-gray-500">
              Modifica los datos del residente
            </DialogDescription>
          </DialogHeader>

          {editingStudent && (
            <div className="grid gap-5 py-4">
              {/* Nombre */}
              <div className="space-y-2">
                <Label htmlFor="edit-name" className="text-gray-700 font-medium">
                  Nombre completo *
                </Label>
                <Input
                  id="edit-name"
                  placeholder="Ej: María González"
                  value={editingStudent.name}
                  onChange={(e) => setEditingStudent({ ...editingStudent, name: e.target.value })}
                  className="border-gray-200"
                />
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="edit-email" className="text-gray-700 font-medium">
                  Email *
                </Label>
                <Input
                  id="edit-email"
                  type="email"
                  placeholder="estudiante@email.com"
                  value={editingStudent.email}
                  onChange={(e) => setEditingStudent({ ...editingStudent, email: e.target.value })}
                  className="border-gray-200"
                />
              </div>

              {/* Habitación y Edificio */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-room" className="text-gray-700 font-medium">
                    Habitación *
                  </Label>
                  <Input
                    id="edit-room"
                    placeholder="Ej: 302-B"
                    value={editingStudent.room}
                    onChange={(e) => setEditingStudent({ ...editingStudent, room: e.target.value })}
                    className="border-gray-200"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-building" className="text-gray-700 font-medium">
                    Edificio *
                  </Label>
                  <Input
                    id="edit-building"
                    placeholder="Ej: A"
                    value={editingStudent.building}
                    onChange={(e) => setEditingStudent({ ...editingStudent, building: e.target.value })}
                    className="border-gray-200"
                  />
                </div>
              </div>

              {/* Fecha de Check-in */}
              <div className="space-y-2">
                <Label htmlFor="edit-checkInDate" className="text-gray-700 font-medium">
                  Fecha de Check-in *
                </Label>
                <Input
                  id="edit-checkInDate"
                  type="date"
                  value={editingStudent.checkInDate}
                  onChange={(e) => setEditingStudent({ ...editingStudent, checkInDate: e.target.value })}
                  className="border-gray-200"
                />
              </div>

              {/* Estado */}
              <div className="space-y-2">
                <Label htmlFor="edit-status" className="text-gray-700 font-medium">
                  Estado *
                </Label>
                <Select
                  value={editingStudent.status}
                  onValueChange={(value: "active" | "pending" | "checkout") =>
                    setEditingStudent({ ...editingStudent, status: value })
                  }
                >
                  <SelectTrigger className="border-gray-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Activo</SelectItem>
                    <SelectItem value="pending">Pendiente</SelectItem>
                    <SelectItem value="checkout">Salida</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Fecha de Checkout (solo si estado es "checkout") */}
              {editingStudent.status === "checkout" && (
                <div className="space-y-2">
                  <Label htmlFor="edit-checkoutDate" className="text-gray-700 font-medium">
                    Fecha de Checkout *
                  </Label>
                  <Input
                    id="edit-checkoutDate"
                    type="date"
                    value={editingStudent.checkoutDate}
                    onChange={(e) => setEditingStudent({ ...editingStudent, checkoutDate: e.target.value })}
                    className="border-gray-200"
                  />
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
              className="border-gray-200"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleEditStudent}
              className="bg-[#509550] hover:bg-[#3d7a3d] text-white"
            >
              <Edit2 className="w-4 h-4 mr-2" />
              Guardar Cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}