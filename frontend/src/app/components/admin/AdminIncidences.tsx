import { useState, useMemo } from "react";
import {
  AlertCircle,
  Clock,
  CheckCircle2,
  User,
  MapPin,
  Search,
  Filter,
  MoreVertical,
  Wrench,
  MessageSquare,
  ChevronRight,
  Send,
} from "lucide-react";
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { Avatar, AvatarFallback } from "../ui/avatar";
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
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../ui/dialog";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";

interface Incidence {
  id: number;
  title: string;
  description: string;
  category: string;
  priority: "low" | "medium" | "high";
  status: "pending" | "in_progress" | "resolved";
  reportedBy: string;
  location: string;
  createdAt: string;
  assignedTo?: string;
  updates?: { date: string; text: string; user: string }[];
}

export function AdminIncidences() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedIncidence, setSelectedIncidence] = useState<Incidence | null>(null);
  
  const [incidences, setIncidences] = useState<Incidence[]>([
    {
      id: 1,
      title: "Calefacción no funciona",
      description:
        "La calefacción de la habitación hace un ruido extraño y no calienta nada desde ayer.",
      category: "Habitación",
      priority: "high",
      status: "in_progress",
      reportedBy: "María González",
      location: "Habitación 302-B",
      createdAt: "Hace 2 horas",
      assignedTo: "Juan Técnico",
      updates: [
        { date: "Hace 1 hora", text: "Técnico asignado y en camino.", user: "Admin" }
      ]
    },
    {
      id: 2,
      title: "Luz del pasillo fundida",
      description:
        "Hay poca visibilidad en el pasillo del tercer piso.",
      category: "Zonas Comunes",
      priority: "low",
      status: "pending",
      reportedBy: "Carlos Ruiz",
      location: "Pasillo Planta 3",
      createdAt: "Hace 5 horas",
      updates: []
    },
    {
      id: 3,
      title: "Gotera en techo",
      description: "Pequeña filtración de agua en el baño de la planta 2.",
      category: "Mantenimiento",
      priority: "medium",
      status: "pending",
      reportedBy: "Ana Martínez",
      location: "Baño Común P2",
      createdAt: "Ayer",
      updates: []
    }
  ]);

  // Management Form State
  const [mgmtStatus, setMgmtStatus] = useState<string>("");
  const [mgmtAssign, setMgmtAssign] = useState<string>("");
  const [mgmtNote, setMgmtNote] = useState<string>("");

  const filteredIncidences = useMemo(() => {
    return incidences.filter((item) => {
      const matchesStatus = filterStatus === "all" || item.status === filterStatus;
      const matchesSearch = 
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.reportedBy.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.location.toLowerCase().includes(searchQuery.toLowerCase());
      
      return matchesStatus && matchesSearch;
    });
  }, [incidences, filterStatus, searchQuery]);

  const getPriorityColor = (p: string) => {
    switch (p) {
      case "high":
        return "bg-red-100 text-red-700 border-red-200";
      case "medium":
        return "bg-orange-100 text-orange-700 border-orange-200";
      default:
        return "bg-blue-100 text-blue-700 border-blue-200";
    }
  };

  const getStatusBadge = (s: string) => {
    switch (s) {
      case "resolved":
        return (
          <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-green-200">
            <CheckCircle2 className="w-3 h-3 mr-1" /> Resuelto
          </Badge>
        );
      case "in_progress":
        return (
          <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-blue-200">
            <Clock className="w-3 h-3 mr-1" /> En Proceso
          </Badge>
        );
      default:
        return (
          <Badge className="bg-gray-100 text-gray-700 hover:bg-gray-100 border-gray-200">
            <AlertCircle className="w-3 h-3 mr-1" /> Pendiente
          </Badge>
        );
    }
  };

  const handleManage = (incidence: Incidence) => {
    setSelectedIncidence(incidence);
    setMgmtStatus(incidence.status);
    setMgmtAssign(incidence.assignedTo || "");
    setMgmtNote("");
  };

  const saveManagement = () => {
    if (!selectedIncidence) return;

    const updatedIncidences = incidences.map(inc => {
      if (inc.id === selectedIncidence.id) {
        const newUpdates = [...(inc.updates || [])];
        if (mgmtNote) {
          newUpdates.push({
            date: "Ahora mismo",
            text: mgmtNote,
            user: "Administrador"
          });
        }
        
        return {
          ...inc,
          status: mgmtStatus as any,
          assignedTo: mgmtAssign || inc.assignedTo,
          updates: newUpdates
        };
      }
      return inc;
    });

    setIncidences(updatedIncidences);
    setSelectedIncidence(null);
    toast.success("Incidencia actualizada correctamente");
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Header Actions */}
      <div className="flex flex-col gap-4">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar por título, persona o lugar..."
            className="pl-10 bg-white border-gray-200"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="flex-1 bg-white border-gray-200">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-500" />
                <SelectValue placeholder="Filtrar por estado" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              <SelectItem value="pending">Pendientes</SelectItem>
              <SelectItem value="in_progress">En proceso</SelectItem>
              <SelectItem value="resolved">Resueltos</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Cards List */}
      <div className="space-y-4">
        <AnimatePresence mode="popLayout">
          {filteredIncidences.map((item) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              layout
            >
              <Card className="border border-gray-200 hover:shadow-md transition-all group overflow-hidden">
                <CardContent className="p-0">
                  <div className="p-4 border-b border-gray-50 flex items-start justify-between bg-gray-50/30">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 border border-white shadow-sm">
                        <AvatarFallback className="bg-[#4A7C59]/10 text-[#4A7C59] font-bold">
                          {item.reportedBy.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-bold text-sm text-gray-900 leading-none mb-1">
                          {item.reportedBy}
                        </p>
                        <p className="text-[10px] text-gray-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {item.createdAt}
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={`${getPriorityColor(item.priority)} text-[10px] uppercase font-bold px-2 py-0.5`}
                    >
                      {item.priority === "high" ? "Alta" : item.priority === "medium" ? "Media" : "Baja"}
                    </Badge>
                  </div>

                  <div className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-base font-bold text-gray-900 leading-tight">
                        {item.title}
                      </h3>
                    </div>
                    
                    <div className="flex items-center gap-1 text-[11px] text-gray-500 mb-3">
                      <MapPin className="w-3 h-3 text-[#FF7A00]" />
                      {item.location}
                    </div>

                    <div className="bg-white p-3 rounded-xl text-xs text-gray-600 border border-gray-100 mb-4 line-clamp-2">
                      {item.description}
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <div className="flex gap-1.5 flex-wrap">
                        {getStatusBadge(item.status)}
                        {item.assignedTo && (
                          <Badge variant="secondary" className="bg-gray-100 text-gray-600 font-normal border-0 text-[10px]">
                            <Wrench className="w-3 h-3 mr-1" /> {item.assignedTo}
                          </Badge>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleManage(item)}
                        className="text-[#4A7C59] font-semibold hover:bg-[#4A7C59]/5 h-8 flex items-center gap-1"
                      >
                        Gestionar
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>

        {filteredIncidences.length === 0 && (
          <div className="text-center py-12 px-4 bg-white rounded-3xl border border-dashed border-gray-200">
            <AlertCircle className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">No se encontraron incidencias que coincidan con la búsqueda.</p>
            <Button 
              variant="link" 
              className="mt-2 text-[#4A7C59]"
              onClick={() => {
                setFilterStatus("all");
                setSearchQuery("");
              }}
            >
              Ver todas las incidencias
            </Button>
          </div>
        )}
      </div>

      {/* Manage Incidence Dialog */}
      <Dialog open={!!selectedIncidence} onOpenChange={() => setSelectedIncidence(null)}>
        <DialogContent className="max-w-[95vw] rounded-2xl sm:max-w-[425px]">
          {selectedIncidence ? (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2 mb-1">
                  <div className={`w-2 h-2 rounded-full ${
                    selectedIncidence.priority === 'high' ? 'bg-red-500' : 
                    selectedIncidence.priority === 'medium' ? 'bg-orange-500' : 'bg-blue-500'
                  }`} />
                  <DialogTitle className="text-lg">{selectedIncidence.title}</DialogTitle>
                </div>
                <DialogDescription>
                  Reportada por {selectedIncidence.reportedBy} en {selectedIncidence.location}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto pr-1 custom-scrollbar">
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-gray-500 uppercase">Estado actual</Label>
                    <Select value={mgmtStatus} onValueChange={setMgmtStatus}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pendiente</SelectItem>
                        <SelectItem value="in_progress">En proceso</SelectItem>
                        <SelectItem value="resolved">Resuelto</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-gray-500 uppercase">Asignar técnico</Label>
                    <Select value={mgmtAssign} onValueChange={setMgmtAssign}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Seleccionar técnico..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Juan Técnico">Juan Técnico (Mantenimiento)</SelectItem>
                        <SelectItem value="Pedro Fontanero">Pedro Fontanero</SelectItem>
                        <SelectItem value="Ana Electricista">Ana Electricista</SelectItem>
                        <SelectItem value="Empresa Externa">Empresa Externa</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-gray-500 uppercase">Nueva actualización / Nota</Label>
                    <Textarea 
                      placeholder="Escribe un comentario sobre el estado..."
                      className="resize-none min-h-[80px]"
                      value={mgmtNote}
                      onChange={(e) => setMgmtNote(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-3 pt-4 border-t border-gray-100">
                  <Label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2">
                    <MessageSquare className="w-3.5 h-3.5" /> Historial de actualizaciones
                  </Label>
                  <div className="space-y-3">
                    {selectedIncidence.updates && selectedIncidence.updates.length > 0 ? (
                      selectedIncidence.updates.map((update, i) => (
                        <div key={i} className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-[10px] font-bold text-gray-700">{update.user}</span>
                            <span className="text-[10px] text-gray-400">{update.date}</span>
                          </div>
                          <p className="text-xs text-gray-600">{update.text}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-gray-400 italic text-center py-2">No hay actualizaciones registradas</p>
                    )}
                  </div>
                </div>
              </div>

              <DialogFooter>
                <div className="flex gap-2 w-full">
                  <Button variant="outline" className="flex-1" onClick={() => setSelectedIncidence(null)}>
                    Cancelar
                  </Button>
                  <Button 
                    className="flex-1 bg-[#4A7C59] hover:bg-[#3d6448]"
                    onClick={saveManagement}
                  >
                    Guardar cambios
                  </Button>
                </div>
              </DialogFooter>
            </>
          ) : (
            <div className="p-4 text-center">Cargando...</div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
