import { useState } from "react";
import {
  Calendar,
  MapPin,
  Users,
  Plus,
  Edit,
  Trash2,
  Clock,
  Tag,
  Search,
  Image as ImageIcon,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "../ui/dialog";
import { toast } from "sonner";

interface Event {
  id: string;
  name: string;
  description: string;
  photo: string;
  dateTime: string;
  location: string;
  limit: string;
  labels: string;
  preRegistered: string;
  attendees: number;
  createdBy: string;
  status: "active" | "cancelled";
}

export function AdminEvents() {
  const [events, setEvents] = useState<Event[]>([
    {
      id: "1",
      name: "Noche de Cine y Palomitas",
      description: "Vamos a ver una película en el salón común con palomitas gratis para todos",
      photo: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&q=80&w=400",
      dateTime: "2026-02-19T20:00",
      location: "Salón Común",
      limit: "30",
      labels: "Social, Entretenimiento, Cine",
      preRegistered: "Laura P., David M., Ana S.",
      attendees: 24,
      createdBy: "María G.",
      status: "active",
    },
    {
      id: "2",
      name: "Torneo de FIFA",
      description: "Competencia amistosa de FIFA 24. ¡Trae tu mejor juego!",
      photo: "https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?auto=format&fit=crop&q=80&w=400",
      dateTime: "2026-02-20T16:00",
      location: "Sala de Juegos",
      limit: "16",
      labels: "Videojuegos, Competición, Social",
      preRegistered: "Carlos R., Juan M.",
      attendees: 12,
      createdBy: "David M.",
      status: "active",
    },
    {
      id: "3",
      name: "Clase de Yoga Grupal",
      description: "Sesión de yoga matutina para todos los niveles. Trae tu esterilla.",
      photo: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&q=80&w=400",
      dateTime: "2026-02-21T10:00",
      location: "Gimnasio",
      limit: "20",
      labels: "Wellness, Deporte, Salud",
      preRegistered: "Laura P., María G., Ana S., Sofia L.",
      attendees: 18,
      createdBy: "Laura P.",
      status: "active",
    },
  ]);

  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [newEvent, setNewEvent] = useState({
    name: "",
    description: "",
    photo: "",
    dateTime: "",
    location: "",
    limit: "",
    labels: "",
    preRegistered: "",
  });

  const handleCreateEvent = (e: React.FormEvent) => {
    e.preventDefault();
    const event: Event = {
      id: Date.now().toString(),
      ...newEvent,
      attendees: 0,
      createdBy: "Administrador",
      status: "active",
    };
    setEvents([event, ...events]);
    toast.success("Evento creado", {
      description: "El evento ha sido publicado exitosamente.",
    });
    setIsCreateOpen(false);
    setNewEvent({
      name: "",
      description: "",
      photo: "",
      dateTime: "",
      location: "",
      limit: "",
      labels: "",
      preRegistered: "",
    });
  };

  const handleEditEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEvent) return;
    
    setEvents(events.map(event => 
      event.id === editingEvent.id ? editingEvent : event
    ));
    toast.success("Evento actualizado", {
      description: "Los cambios han sido guardados correctamente.",
    });
    setEditingEvent(null);
  };

  const handleDeleteEvent = (id: string) => {
    setEvents(events.filter(event => event.id !== id));
    toast.success("Evento eliminado", {
      description: "El evento ha sido eliminado correctamente.",
    });
  };

  const handleToggleStatus = (id: string) => {
    setEvents(events.map(event => 
      event.id === id 
        ? { ...event, status: event.status === "active" ? "cancelled" : "active" }
        : event
    ));
    const event = events.find(e => e.id === id);
    toast.info(
      event?.status === "active" ? "Evento cancelado" : "Evento reactivado",
      {
        description: event?.status === "active" 
          ? "El evento ha sido cancelado y los residentes serán notificados."
          : "El evento ha sido reactivado.",
      }
    );
  };

  const filteredEvents = events.filter(event =>
    event.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    event.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
    event.createdBy.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4 pb-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-900">
            Gestión de Eventos
          </h2>
          <p className="text-sm text-gray-500">
            {events.length} eventos • {events.filter(e => e.status === "active").length} activos
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#35C759] hover:bg-[#1B5E20] rounded-full gap-2">
              <Plus className="w-4 h-4" />
              Crear Evento
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto rounded-2xl">
            <DialogHeader>
              <DialogTitle>Crear Nuevo Evento</DialogTitle>
              <DialogDescription>
                Crea un evento para todos los residentes de la residencia.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateEvent} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre del evento</Label>
                <Input
                  id="name"
                  placeholder="Ej: Tarde de Juegos"
                  value={newEvent.name}
                  onChange={(e) => setNewEvent({ ...newEvent, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  placeholder="Explica de qué trata el evento..."
                  className="resize-none"
                  value={newEvent.description}
                  onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dateTime">Fecha y hora</Label>
                  <Input
                    id="dateTime"
                    type="datetime-local"
                    value={newEvent.dateTime}
                    onChange={(e) => setNewEvent({ ...newEvent, dateTime: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="limit">Límite de personas</Label>
                  <Input
                    id="limit"
                    type="number"
                    placeholder="Sin límite"
                    value={newEvent.limit}
                    onChange={(e) => setNewEvent({ ...newEvent, limit: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Lugar</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="location"
                    placeholder="Ej: Sala Común"
                    className="pl-10"
                    value={newEvent.location}
                    onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="photo">URL de la foto</Label>
                <div className="relative">
                  <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="photo"
                    placeholder="https://..."
                    className="pl-10"
                    value={newEvent.photo}
                    onChange={(e) => setNewEvent({ ...newEvent, photo: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="labels">Etiquetas (separadas por comas)</Label>
                <div className="relative">
                  <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="labels"
                    placeholder="Ej: Juegos, Relax, Social"
                    className="pl-10"
                    value={newEvent.labels}
                    onChange={(e) => setNewEvent({ ...newEvent, labels: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="preRegistered">Usuarios Pre-Confirmados (nombres separados por comas)</Label>
                <Input
                  id="preRegistered"
                  placeholder="Ej: Juan, María, Pedro"
                  value={newEvent.preRegistered}
                  onChange={(e) => setNewEvent({ ...newEvent, preRegistered: e.target.value })}
                />
              </div>
              <DialogFooter className="pt-4">
                <Button type="submit" className="w-full bg-[#35C759] hover:bg-[#1B5E20]">
                  Publicar Evento
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          placeholder="Buscar eventos por nombre, lugar o creador..."
          className="pl-10"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Events List */}
      <div className="space-y-3">
        {filteredEvents.length === 0 ? (
          <Card className="border-gray-100">
            <CardContent className="p-8 text-center">
              <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">No se encontraron eventos</p>
            </CardContent>
          </Card>
        ) : (
          filteredEvents.map((event) => (
            <Card
              key={event.id}
              className={`border-gray-100 shadow-sm ${
                event.status === "cancelled" ? "opacity-60" : ""
              }`}
            >
              <CardContent className="p-0">
                <div className="flex">
                  {/* Image */}
                  <div className="w-24 h-24 bg-gray-200 flex-shrink-0 relative">
                    {event.photo ? (
                      <img
                        src={event.photo}
                        alt={event.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Calendar className="w-8 h-8 text-gray-400" />
                      </div>
                    )}
                    {event.status === "cancelled" && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <XCircle className="w-8 h-8 text-white" />
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 p-3 space-y-2">
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-gray-900 mb-1 leading-tight">
                          {event.name}
                        </h3>
                        <p className="text-xs text-gray-500 line-clamp-1">
                          {event.description}
                        </p>
                      </div>
                      <Badge
                        className={`flex-shrink-0 ${
                          event.status === "active"
                            ? "bg-green-100 text-green-700 border-green-200"
                            : "bg-red-100 text-red-700 border-red-200"
                        }`}
                      >
                        {event.status === "active" ? "Activo" : "Cancelado"}
                      </Badge>
                    </div>

                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(event.dateTime).toLocaleDateString("es-ES", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {event.location}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {event.attendees}
                        {event.limit && `/${event.limit}`}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-xs text-gray-400">
                        Por: {event.createdBy}
                      </span>
                      <div className="flex gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          onClick={() => setEditingEvent(event)}
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className={`h-7 w-7 ${
                            event.status === "active"
                              ? "text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                              : "text-green-600 hover:text-green-700 hover:bg-green-50"
                          }`}
                          onClick={() => handleToggleStatus(event.id)}
                        >
                          {event.status === "active" ? (
                            <XCircle className="w-3.5 h-3.5" />
                          ) : (
                            <CheckCircle className="w-3.5 h-3.5" />
                          )}
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleDeleteEvent(event.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>

                    {/* Pre-registered users */}
                    {event.preRegistered && (
                      <div className="pt-2 border-t border-gray-100">
                        <p className="text-xs text-gray-500 mb-1">Pre-confirmados:</p>
                        <div className="flex flex-wrap gap-1">
                          {event.preRegistered.split(",").map((name, idx) => (
                            <Badge
                              key={idx}
                              variant="outline"
                              className="text-xs bg-[#35C759]/10 text-[#1B5E20] border-[#35C759]/20"
                            >
                              {name.trim()}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingEvent} onOpenChange={(open) => !open && setEditingEvent(null)}>
        <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle>Editar Evento</DialogTitle>
            <DialogDescription>
              Modifica los detalles del evento según sea necesario.
            </DialogDescription>
          </DialogHeader>
          {editingEvent && (
            <form onSubmit={handleEditEvent} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Nombre del evento</Label>
                <Input
                  id="edit-name"
                  placeholder="Ej: Tarde de Juegos"
                  value={editingEvent.name}
                  onChange={(e) =>
                    setEditingEvent({ ...editingEvent, name: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-description">Descripción</Label>
                <Textarea
                  id="edit-description"
                  placeholder="Explica de qué trata el evento..."
                  className="resize-none"
                  value={editingEvent.description}
                  onChange={(e) =>
                    setEditingEvent({ ...editingEvent, description: e.target.value })
                  }
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-dateTime">Fecha y hora</Label>
                  <Input
                    id="edit-dateTime"
                    type="datetime-local"
                    value={editingEvent.dateTime}
                    onChange={(e) =>
                      setEditingEvent({ ...editingEvent, dateTime: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-limit">Límite de personas</Label>
                  <Input
                    id="edit-limit"
                    type="number"
                    placeholder="Sin límite"
                    value={editingEvent.limit}
                    onChange={(e) =>
                      setEditingEvent({ ...editingEvent, limit: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-location">Lugar</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="edit-location"
                    placeholder="Ej: Sala Común"
                    className="pl-10"
                    value={editingEvent.location}
                    onChange={(e) =>
                      setEditingEvent({ ...editingEvent, location: e.target.value })
                    }
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-photo">URL de la foto</Label>
                <div className="relative">
                  <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="edit-photo"
                    placeholder="https://..."
                    className="pl-10"
                    value={editingEvent.photo}
                    onChange={(e) =>
                      setEditingEvent({ ...editingEvent, photo: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-labels">Etiquetas (separadas por comas)</Label>
                <div className="relative">
                  <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="edit-labels"
                    placeholder="Ej: Juegos, Relax, Social"
                    className="pl-10"
                    value={editingEvent.labels}
                    onChange={(e) =>
                      setEditingEvent({ ...editingEvent, labels: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-preRegistered">
                  Usuarios Pre-Confirmados (nombres separados por comas)
                </Label>
                <Input
                  id="edit-preRegistered"
                  placeholder="Ej: Juan, María, Pedro"
                  value={editingEvent.preRegistered}
                  onChange={(e) =>
                    setEditingEvent({ ...editingEvent, preRegistered: e.target.value })
                  }
                />
              </div>
              <DialogFooter className="pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingEvent(null)}
                >
                  Cancelar
                </Button>
                <Button type="submit" className="bg-[#35C759] hover:bg-[#1B5E20]">
                  Guardar Cambios
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
