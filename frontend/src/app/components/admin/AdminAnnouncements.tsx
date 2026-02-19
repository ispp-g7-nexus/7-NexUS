import { useState } from "react";
import {
  Plus,
  Calendar,
  AlertCircle,
  Wrench,
  MessageCircle,
  Clock,
  Edit2,
  Trash2,
} from "lucide-react";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { Badge } from "../ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "../ui/dialog";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Label } from "../ui/label";
import { toast } from "sonner";

interface Announcement {
  id: number;
  category: "urgent" | "event" | "maintenance" | "general";
  title: string;
  description?: string;
  date: string;
  time: string;
  status: "active" | "scheduled";
}

export function AdminAnnouncements() {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [newAnnouncement, setNewAnnouncement] = useState({
    title: "",
    category: "general" as "urgent" | "event" | "maintenance" | "general",
    description: "",
    date: "",
    time: "",
  });

  const [announcements, setAnnouncements] = useState<Announcement[]>([
    {
      id: 1,
      category: "urgent",
      title: "Corte de Agua Programado",
      description: "Se realizará mantenimiento en las tuberías principales",
      date: "2026-01-30",
      time: "09:00",
      status: "active",
    },
    {
      id: 2,
      category: "event",
      title: "Asamblea General de Residentes - Febrero 2026",
      description: "Asamblea mensual para discutir mejoras en la residencia",
      date: "2026-02-08",
      time: "11:00",
      status: "scheduled",
    },
    {
      id: 3,
      category: "maintenance",
      title: "Revisión Ascensores",
      description: "Mantenimiento preventivo de ascensores",
      date: "2026-02-15",
      time: "08:00",
      status: "scheduled",
    },
  ]);

  const categories = [
    { id: "all", label: "Todos" },
    { id: "urgent", label: "Urgente", color: "red" },
    { id: "event", label: "Evento", color: "blue" },
    { id: "maintenance", label: "Mantenimiento", color: "orange" },
    { id: "general", label: "General", color: "gray" },
  ];

  // Filtrar avisos por categoría
  const filteredAnnouncements = announcements.filter((announcement) => {
    if (selectedCategory === "all") return true;
    return announcement.category === selectedCategory;
  });

  // Función para crear aviso
  const handleCreateAnnouncement = () => {
    if (!newAnnouncement.title || !newAnnouncement.date || !newAnnouncement.time) {
      toast.error("Por favor, completa todos los campos obligatorios");
      return;
    }

    const announcementToAdd: Announcement = {
      id: announcements.length > 0 ? Math.max(...announcements.map(a => a.id)) + 1 : 1,
      title: newAnnouncement.title,
      category: newAnnouncement.category,
      description: newAnnouncement.description,
      date: newAnnouncement.date,
      time: newAnnouncement.time,
      status: "scheduled",
    };

    setAnnouncements([...announcements, announcementToAdd]);
    
    // Resetear formulario
    setNewAnnouncement({
      title: "",
      category: "general",
      description: "",
      date: "",
      time: "",
    });
    
    setIsDialogOpen(false);
    toast.success("Aviso publicado correctamente");
  };

  // Función para editar aviso
  const handleEditAnnouncement = () => {
    if (!editingAnnouncement) return;

    const updatedAnnouncements = announcements.map(a => 
      a.id === editingAnnouncement.id ? editingAnnouncement : a
    );

    setAnnouncements(updatedAnnouncements);
    setIsEditDialogOpen(false);
    setEditingAnnouncement(null);
    toast.success("Aviso actualizado correctamente");
  };

  // Función para eliminar aviso
  const handleDeleteAnnouncement = (id: number) => {
    setAnnouncements(announcements.filter(a => a.id !== id));
    toast.success("Aviso eliminado correctamente");
  };

  // Función para abrir diálogo de edición
  const openEditDialog = (announcement: Announcement) => {
    setEditingAnnouncement({ ...announcement });
    setIsEditDialogOpen(true);
  };

  // Calcular estadísticas
  const totalAnnouncements = announcements.length;
  const activeAnnouncements = announcements.filter(a => a.status === "active").length;
  const thisMonthAnnouncements = announcements.filter(a => {
    const announcementDate = new Date(a.date);
    const now = new Date();
    return announcementDate.getMonth() === now.getMonth() && 
           announcementDate.getFullYear() === now.getFullYear();
  }).length;

  return (
    <div className="space-y-4 pb-6">
      {/* Header */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Gestión de Avisos</h2>
            <p className="text-sm text-gray-500 mt-1">
              Comunica noticias y eventos a los residentes
            </p>
          </div>
          <Button 
            className="bg-[#4A7C59] hover:bg-[#3d6448] text-white"
            onClick={() => setIsDialogOpen(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Aviso
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-[#F5F5F5] rounded-xl p-3">
            <p className="text-xs text-gray-500 mb-1">Total Avisos</p>
            <p className="text-2xl font-bold text-gray-900">{totalAnnouncements}</p>
          </div>
          <div className="bg-[#F5F5F5] rounded-xl p-3">
            <p className="text-xs text-gray-500 mb-1">Activos</p>
            <p className="text-2xl font-bold text-[#4A7C59]">{activeAnnouncements}</p>
          </div>
          <div className="bg-[#F5F5F5] rounded-xl p-3">
            <p className="text-xs text-gray-500 mb-1">Este Mes</p>
            <p className="text-2xl font-bold text-gray-900">{thisMonthAnnouncements}</p>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 px-1">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
              selectedCategory === cat.id
                ? "bg-[#4A7C59] text-white shadow-md"
                : "bg-white text-gray-600 border border-gray-200 hover:border-[#4A7C59]/30"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Announcements List */}
      <div className="space-y-3">
        {filteredAnnouncements.map((announcement) => (
          <Card key={announcement.id} className="border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    {getCategoryBadge(announcement.category)}
                    {announcement.status === "active" && (
                      <Badge className="bg-[#4A7C59]/10 text-[#4A7C59] border-0">
                        Activo
                      </Badge>
                    )}
                  </div>
                  <h3 className="font-bold text-gray-900 mb-1">{announcement.title}</h3>
                  {announcement.description && (
                    <p className="text-sm text-gray-600 mb-2">{announcement.description}</p>
                  )}
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(announcement.date).toLocaleDateString('es-ES', { 
                        day: 'numeric', 
                        month: 'short', 
                        year: 'numeric' 
                      })}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {announcement.time}
                    </span>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-gray-600"
                    onClick={() => openEditDialog(announcement)}
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-red-600"
                    onClick={() => handleDeleteAnnouncement(announcement.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {filteredAnnouncements.length === 0 && (
          <Card className="border border-gray-100">
            <CardContent className="p-8 text-center">
              <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No hay avisos en esta categoría</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Dialog Crear Aviso */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl max-w-[90%]">
          <DialogHeader>
            <DialogTitle>Crear Nuevo Aviso</DialogTitle>
            <DialogDescription>
              Crea un nuevo aviso para los estudiantes de la residencia
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Título *</Label>
              <Input 
                id="title"
                placeholder="Ej: Corte de agua programado" 
                value={newAnnouncement.title}
                onChange={(e) => setNewAnnouncement({ ...newAnnouncement, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Categoría *</Label>
              <Select 
                value={newAnnouncement.category}
                onValueChange={(value: "urgent" | "event" | "maintenance" | "general") =>
                  setNewAnnouncement({ ...newAnnouncement, category: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona categoría" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="urgent">Urgente</SelectItem>
                  <SelectItem value="event">Evento</SelectItem>
                  <SelectItem value="maintenance">Mantenimiento</SelectItem>
                  <SelectItem value="general">General</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                placeholder="Describe el aviso en detalle..."
                rows={4}
                value={newAnnouncement.description}
                onChange={(e) => setNewAnnouncement({ ...newAnnouncement, description: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="date">Fecha *</Label>
                <Input 
                  id="date"
                  type="date" 
                  value={newAnnouncement.date}
                  onChange={(e) => setNewAnnouncement({ ...newAnnouncement, date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="time">Hora *</Label>
                <Input 
                  id="time"
                  type="time" 
                  value={newAnnouncement.time}
                  onChange={(e) => setNewAnnouncement({ ...newAnnouncement, time: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              className="bg-[#4A7C59] hover:bg-[#3d6448] text-white"
              onClick={handleCreateAnnouncement}
            >
              <Plus className="w-4 h-4 mr-2" />
              Publicar Aviso
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Editar Aviso */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl max-w-[90%]">
          <DialogHeader>
            <DialogTitle>Editar Aviso</DialogTitle>
            <DialogDescription>
              Modifica la información del aviso
            </DialogDescription>
          </DialogHeader>
          {editingAnnouncement && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-title">Título *</Label>
                <Input 
                  id="edit-title"
                  placeholder="Ej: Corte de agua programado" 
                  value={editingAnnouncement.title}
                  onChange={(e) => setEditingAnnouncement({ 
                    ...editingAnnouncement, 
                    title: e.target.value 
                  })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-category">Categoría *</Label>
                <Select 
                  value={editingAnnouncement.category}
                  onValueChange={(value: "urgent" | "event" | "maintenance" | "general") =>
                    setEditingAnnouncement({ ...editingAnnouncement, category: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="urgent">Urgente</SelectItem>
                    <SelectItem value="event">Evento</SelectItem>
                    <SelectItem value="maintenance">Mantenimiento</SelectItem>
                    <SelectItem value="general">General</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-description">Descripción</Label>
                <Textarea
                  id="edit-description"
                  placeholder="Describe el aviso en detalle..."
                  rows={4}
                  value={editingAnnouncement.description || ""}
                  onChange={(e) => setEditingAnnouncement({ 
                    ...editingAnnouncement, 
                    description: e.target.value 
                  })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="edit-date">Fecha *</Label>
                  <Input 
                    id="edit-date"
                    type="date" 
                    value={editingAnnouncement.date}
                    onChange={(e) => setEditingAnnouncement({ 
                      ...editingAnnouncement, 
                      date: e.target.value 
                    })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-time">Hora *</Label>
                  <Input 
                    id="edit-time"
                    type="time" 
                    value={editingAnnouncement.time}
                    onChange={(e) => setEditingAnnouncement({ 
                      ...editingAnnouncement, 
                      time: e.target.value 
                    })}
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              className="bg-[#4A7C59] hover:bg-[#3d6448] text-white"
              onClick={handleEditAnnouncement}
            >
              Guardar Cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function getCategoryBadge(category: string) {
  switch (category) {
    case "urgent":
      return (
        <Badge className="bg-red-100 text-red-700 border-0">
          <AlertCircle className="w-3 h-3 mr-1" />
          Urgente
        </Badge>
      );
    case "event":
      return (
        <Badge className="bg-blue-100 text-blue-700 border-0">
          <Calendar className="w-3 h-3 mr-1" />
          Evento
        </Badge>
      );
    case "maintenance":
      return (
        <Badge className="bg-orange-100 text-orange-700 border-0">
          <Wrench className="w-3 h-3 mr-1" />
          Mantenimiento
        </Badge>
      );
    default:
      return (
        <Badge className="bg-gray-100 text-gray-700 border-0">
          <MessageCircle className="w-3 h-3 mr-1" />
          General
        </Badge>
      );
  }
}