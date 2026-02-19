import { useState } from "react";
import {
  Search,
  Filter,
  UserCheck,
  Calendar,
  Clock,
  Users,
  Plus,
  X,
  LogOut,
} from "lucide-react";
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import {
  Avatar,
  AvatarFallback,
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
} from "../ui/dialog";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { toast } from "sonner";

interface Visitor {
  id: number;
  name: string;
  invitedBy: string;
  invitedByRoom: string;
  checkInTime: string;
  checkInDate: string;
  status: "active" | "checked-out";
  visitPurpose?: string;
  expectedDuration?: string;
}

export function AdminVisitors() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isAddVisitorOpen, setIsAddVisitorOpen] = useState(false);
  const [newVisitor, setNewVisitor] = useState({
    name: "",
    invitedBy: "",
    invitedByRoom: "",
    visitPurpose: "",
    expectedDuration: "",
  });

  const [visitors, setVisitors] = useState<Visitor[]>([
    {
      id: 1,
      name: "Roberto Sánchez",
      invitedBy: "María González",
      invitedByRoom: "302-B",
      checkInTime: "14:30",
      checkInDate: "2026-02-17",
      status: "active",
      visitPurpose: "Visita familiar",
    },
    {
      id: 2,
      name: "Ana Martínez",
      invitedBy: "Carlos Ruiz",
      invitedByRoom: "305-A",
      checkInTime: "16:15",
      checkInDate: "2026-02-17",
      status: "active",
      visitPurpose: "Visita de amigos",
    },
    {
      id: 3,
      name: "Pedro López",
      invitedBy: "Laura Pérez",
      invitedByRoom: "201-B",
      checkInTime: "11:00",
      checkInDate: "2026-02-17",
      status: "active",
      visitPurpose: "Entrega de paquete",
    },
    {
      id: 4,
      name: "Carmen Jiménez",
      invitedBy: "María González",
      invitedByRoom: "302-B",
      checkInTime: "09:30",
      checkInDate: "2026-02-17",
      status: "checked-out",
      visitPurpose: "Visita familiar",
    },
    {
      id: 5,
      name: "Diego Fernández",
      invitedBy: "Carlos Ruiz",
      invitedByRoom: "305-A",
      checkInTime: "18:45",
      checkInDate: "2026-02-16",
      status: "checked-out",
      visitPurpose: "Visita de amigos",
    },
    {
      id: 6,
      name: "Isabel Torres",
      invitedBy: "Laura Pérez",
      invitedByRoom: "201-B",
      checkInTime: "15:20",
      checkInDate: "2026-02-17",
      status: "active",
      visitPurpose: "Visita de trabajo",
    },
  ]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return (
          <Badge className="bg-green-100 text-green-700 hover:bg-green-200 border-green-200">
            En residencia
          </Badge>
        );
      case "checked-out":
        return (
          <Badge className="bg-gray-100 text-gray-700 hover:bg-gray-200 border-gray-200">
            Salida
          </Badge>
        );
      default:
        return null;
    }
  };

  // Filtrar visitantes
  const filteredVisitors = visitors.filter((visitor) => {
    const matchesSearch =
      visitor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      visitor.invitedBy.toLowerCase().includes(searchTerm.toLowerCase()) ||
      visitor.invitedByRoom.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "all" || visitor.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Contar visitantes activos
  const activeVisitorsCount = visitors.filter(v => v.status === "active").length;

  const handleAddVisitor = () => {
    if (!newVisitor.name || !newVisitor.invitedBy || !newVisitor.invitedByRoom) {
      toast.error("Por favor completa los campos obligatorios");
      return;
    }

    const visitor: Visitor = {
      id: Date.now(),
      name: newVisitor.name,
      invitedBy: newVisitor.invitedBy,
      invitedByRoom: newVisitor.invitedByRoom,
      checkInTime: new Date().toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }),
      checkInDate: new Date().toISOString().split("T")[0],
      status: "active",
      visitPurpose: newVisitor.visitPurpose,
      expectedDuration: newVisitor.expectedDuration,
    };

    setVisitors([visitor, ...visitors]);
    setIsAddVisitorOpen(false);
    setNewVisitor({
      name: "",
      invitedBy: "",
      invitedByRoom: "",
      visitPurpose: "",
      expectedDuration: "",
    });
    toast.success("Visitante registrado correctamente");
  };

  const handleCheckOut = (visitorId: number, visitorName: string) => {
    setVisitors(visitors.map(visitor => 
      visitor.id === visitorId 
        ? { ...visitor, status: "checked-out" as const }
        : visitor
    ));
    toast.success(`${visitorName} ha sido marcado como salida`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Invitados / Visitas
          </h2>
          <p className="text-gray-500">
            Listado de visitantes en la residencia
          </p>
        </div>
      </div>

      {/* Stats Card */}
      <Card className="border border-gray-100 shadow-sm bg-gradient-to-br from-[#7BD14F]/10 to-[#35C759]/10">
        <CardContent className="p-5">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-[#7BD14F] to-[#35C759] rounded-xl">
              <UserCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{activeVisitorsCount}</p>
              <p className="text-sm text-gray-600">Visitantes activos en la residencia</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar por visitante, residente o habitación..."
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
            <SelectItem value="active">En residencia</SelectItem>
            <SelectItem value="checked-out">Salida</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Lista de Visitantes */}
      <div className="grid gap-4">
        {filteredVisitors.length > 0 ? (
          filteredVisitors.map((visitor) => (
            <Card
              key={visitor.id}
              className="hover:shadow-md transition-shadow border-gray-200"
            >
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  {/* Avatar del visitante */}
                  <Avatar className="h-12 w-12 border border-gray-100">
                    <AvatarFallback className="bg-indigo-100 text-indigo-600 font-bold text-lg">
                      {visitor.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    {/* Nombre del visitante y estado */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-1">
                          {visitor.name}
                        </h3>
                        {visitor.visitPurpose && (
                          <p className="text-xs text-gray-500">
                            {visitor.visitPurpose}
                          </p>
                        )}
                      </div>
                      {getStatusBadge(visitor.status)}
                    </div>

                    {/* Información del residente que invitó */}
                    <div className="bg-gray-50 rounded-lg p-3 mb-3">
                      <div className="flex items-center gap-2 text-sm">
                        <Users className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-600">
                          Invitado por:{" "}
                          <span className="font-medium text-gray-900">
                            {visitor.invitedBy}
                          </span>
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm mt-1 ml-6">
                        <span className="text-gray-500">
                          Hab. {visitor.invitedByRoom}
                        </span>
                      </div>
                    </div>

                    {/* Fecha y hora de entrada */}
                    <div className="flex flex-wrap gap-4 text-sm text-gray-600 items-center justify-between">
                      <div className="flex flex-wrap gap-4">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <span>
                            {new Date(visitor.checkInDate).toLocaleDateString("es-ES", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric"
                            })}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-gray-400" />
                          <span>{visitor.checkInTime}</span>
                        </div>
                      </div>
                      
                      {/* Botón de marcar salida solo para visitantes activos */}
                      {visitor.status === "active" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="bg-red-50 text-red-600 border-red-200 hover:bg-red-100 hover:text-red-700"
                          onClick={() => handleCheckOut(visitor.id, visitor.name)}
                        >
                          <LogOut className="w-3.5 h-3.5 mr-1.5" />
                          Marcar Salida
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className="border-gray-200">
            <CardContent className="p-12 text-center">
              <UserCheck className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">
                No se encontraron visitantes
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Botón flotante de añadir visitante */}
      <Button
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-2xl bg-gradient-to-br from-[#7BD14F] to-[#35C759] hover:from-[#35C759] hover:to-[#1B5E20] text-white p-0 z-50"
        onClick={() => setIsAddVisitorOpen(true)}
      >
        <Plus className="w-7 h-7" />
      </Button>

      {/* Dialog para agregar visitante */}
      <Dialog open={isAddVisitorOpen} onOpenChange={setIsAddVisitorOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar Nuevo Visitante</DialogTitle>
            <DialogDescription>
              Completa la información del visitante que ingresa a la residencia
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="visitor-name">Nombre del visitante *</Label>
              <Input
                id="visitor-name"
                placeholder="Nombre completo"
                value={newVisitor.name}
                onChange={(e) => setNewVisitor({ ...newVisitor, name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="invited-by">Invitado por *</Label>
              <Input
                id="invited-by"
                placeholder="Nombre del residente"
                value={newVisitor.invitedBy}
                onChange={(e) => setNewVisitor({ ...newVisitor, invitedBy: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="room">Habitación *</Label>
              <Input
                id="room"
                placeholder="Ej: 302-B"
                value={newVisitor.invitedByRoom}
                onChange={(e) => setNewVisitor({ ...newVisitor, invitedByRoom: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="purpose">Motivo de la visita</Label>
              <Select 
                value={newVisitor.visitPurpose} 
                onValueChange={(value) => setNewVisitor({ ...newVisitor, visitPurpose: value })}
              >
                <SelectTrigger id="purpose">
                  <SelectValue placeholder="Selecciona un motivo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Visita familiar">Visita familiar</SelectItem>
                  <SelectItem value="Visita de amigos">Visita de amigos</SelectItem>
                  <SelectItem value="Entrega de paquete">Entrega de paquete</SelectItem>
                  <SelectItem value="Visita de trabajo">Visita de trabajo</SelectItem>
                  <SelectItem value="Otro">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="duration">Duración estimada</Label>
              <Select 
                value={newVisitor.expectedDuration} 
                onValueChange={(value) => setNewVisitor({ ...newVisitor, expectedDuration: value })}
              >
                <SelectTrigger id="duration">
                  <SelectValue placeholder="Tiempo esperado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1-2 horas">1-2 horas</SelectItem>
                  <SelectItem value="2-4 horas">2-4 horas</SelectItem>
                  <SelectItem value="Medio día">Medio día</SelectItem>
                  <SelectItem value="Día completo">Día completo</SelectItem>
                  <SelectItem value="Varios días">Varios días</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setIsAddVisitorOpen(false);
                  setNewVisitor({
                    name: "",
                    invitedBy: "",
                    invitedByRoom: "",
                    visitPurpose: "",
                    expectedDuration: "",
                  });
                }}
              >
                <X className="w-4 h-4 mr-2" />
                Cancelar
              </Button>
              <Button
                className="flex-1 bg-gradient-to-r from-[#7BD14F] to-[#35C759] hover:from-[#35C759] hover:to-[#1B5E20]"
                onClick={handleAddVisitor}
              >
                <Plus className="w-4 h-4 mr-2" />
                Registrar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}