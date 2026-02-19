import { useState, useMemo, useEffect } from "react";
import {
  Building2,
  Bed,
  Users,
  Search,
  Filter,
  Plus,
  X,
  Hash,
  Layout,
  Info,
  Check,
  Trash2,
  ArrowLeft,
  Mail,
  Phone,
  Calendar as CalendarIcon,
  Clock,
  Save,
  Grid3x3,
  List,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Badge } from "../ui/badge";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
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
import { toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";

interface Room {
  id: number;
  number: string;
  building: string;
  type: "single" | "double" | "triple";
  occupied: boolean;
  residents: string[];
  floor: number;
  description?: string;
  features?: string[];
  lastMaintenance?: string;
}

export function AdminRooms() {
  const [filterBuilding, setFilterBuilding] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddingRoom, setIsAddingRoom] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [viewLayout, setViewLayout] = useState<"list" | "map">("list");
  
  // View Modes: details, student, history, edit
  const [viewMode, setViewMode] = useState<"details" | "student" | "history" | "edit">("details");
  const [selectedStudentName, setSelectedStudentName] = useState<string | null>(null);
  
  // Edit Form State
  const [editForm, setEditForm] = useState<Room | null>(null);

  const [rooms, setRooms] = useState<Room[]>([
    {
      id: 1,
      number: "302-B",
      building: "A",
      type: "double",
      occupied: true,
      residents: ["María González", "Ana Martínez"],
      floor: 3,
      description: "Habitación doble exterior con vistas al jardín. Incluye escritorio doble y armario empotrado.",
      features: ["Wifi", "Calefacción", "Escritorio", "Aire Acondicionado"],
      lastMaintenance: "15/01/2026",
    },
    {
      id: 2,
      number: "305-A",
      building: "A",
      type: "single",
      occupied: true,
      residents: ["Carlos Ruiz"],
      floor: 3,
      description: "Habitación individual premium con baño privado.",
      features: ["Wifi", "Calefacción", "Baño Privado"],
      lastMaintenance: "10/02/2026",
    },
    {
      id: 3,
      number: "201-B",
      building: "B",
      type: "double",
      occupied: true,
      residents: ["Laura Sánchez"],
      floor: 2,
      description: "Habitación doble compartida amplia.",
      features: ["Wifi", "Calefacción"],
      lastMaintenance: "05/12/2025",
    },
    {
      id: 4,
      number: "402-C",
      building: "C",
      type: "triple",
      occupied: false,
      residents: [],
      floor: 4,
      description: "Habitación triple ideal para grupos.",
      features: ["Wifi", "Calefacción", "Nevera pequeña"],
      lastMaintenance: "20/01/2026",
    },
    {
      id: 5,
      number: "105-A",
      building: "A",
      type: "single",
      occupied: false,
      residents: [],
      floor: 1,
      description: "Habitación individual estándar planta baja.",
      features: ["Wifi", "Calefacción"],
      lastMaintenance: "12/02/2026",
    },
    // Edificio A - Planta 1
    {
      id: 6,
      number: "101-A",
      building: "A",
      type: "single",
      occupied: true,
      residents: ["Pedro López"],
      floor: 1,
      features: ["Wifi", "Calefacción"],
      lastMaintenance: "10/02/2026",
    },
    {
      id: 7,
      number: "102-A",
      building: "A",
      type: "double",
      occupied: false,
      residents: [],
      floor: 1,
      features: ["Wifi", "Calefacción"],
      lastMaintenance: "08/02/2026",
    },
    {
      id: 8,
      number: "103-A",
      building: "A",
      type: "double",
      occupied: true,
      residents: ["Sofía Ramírez", "Julia Torres"],
      floor: 1,
      features: ["Wifi", "Calefacción"],
      lastMaintenance: "11/02/2026",
    },
    // Edificio A - Planta 2
    {
      id: 9,
      number: "201-A",
      building: "A",
      type: "single",
      occupied: true,
      residents: ["David Hernández"],
      floor: 2,
      features: ["Wifi", "Calefacción"],
      lastMaintenance: "09/02/2026",
    },
    {
      id: 10,
      number: "202-A",
      building: "A",
      type: "double",
      occupied: true,
      residents: ["Elena Vega", "Carmen Silva"],
      floor: 2,
      features: ["Wifi", "Calefacción", "Aire Acondicionado"],
      lastMaintenance: "12/02/2026",
    },
    {
      id: 11,
      number: "203-A",
      building: "A",
      type: "single",
      occupied: false,
      residents: [],
      floor: 2,
      features: ["Wifi", "Calefacción"],
      lastMaintenance: "07/02/2026",
    },
    {
      id: 12,
      number: "204-A",
      building: "A",
      type: "double",
      occupied: true,
      residents: ["Miguel Ángel"],
      floor: 2,
      features: ["Wifi", "Calefacción"],
      lastMaintenance: "13/02/2026",
    },
    // Edificio A - Planta 3
    {
      id: 13,
      number: "301-A",
      building: "A",
      type: "single",
      occupied: false,
      residents: [],
      floor: 3,
      features: ["Wifi", "Calefacción"],
      lastMaintenance: "06/02/2026",
    },
    {
      id: 14,
      number: "303-A",
      building: "A",
      type: "double",
      occupied: true,
      residents: ["Patricia Mora", "Isabel Ruiz"],
      floor: 3,
      features: ["Wifi", "Calefacción", "Escritorio"],
      lastMaintenance: "14/02/2026",
    },
    // Edificio B - Planta 1
    {
      id: 15,
      number: "101-B",
      building: "B",
      type: "single",
      occupied: true,
      residents: ["Antonio Jiménez"],
      floor: 1,
      features: ["Wifi", "Calefacción"],
      lastMaintenance: "05/02/2026",
    },
    {
      id: 16,
      number: "102-B",
      building: "B",
      type: "double",
      occupied: false,
      residents: [],
      floor: 1,
      features: ["Wifi", "Calefacción"],
      lastMaintenance: "04/02/2026",
    },
    {
      id: 17,
      number: "103-B",
      building: "B",
      type: "single",
      occupied: true,
      residents: ["Rosa Medina"],
      floor: 1,
      features: ["Wifi", "Calefacción"],
      lastMaintenance: "15/02/2026",
    },
    // Edificio B - Planta 2
    {
      id: 18,
      number: "202-B",
      building: "B",
      type: "double",
      occupied: true,
      residents: ["Alberto García", "Fernando Díaz"],
      floor: 2,
      features: ["Wifi", "Calefacción"],
      lastMaintenance: "08/02/2026",
    },
    {
      id: 19,
      number: "203-B",
      building: "B",
      type: "single",
      occupied: false,
      residents: [],
      floor: 2,
      features: ["Wifi", "Calefacción"],
      lastMaintenance: "03/02/2026",
    },
    // Edificio C - Planta 1
    {
      id: 20,
      number: "101-C",
      building: "C",
      type: "single",
      occupied: false,
      residents: [],
      floor: 1,
      features: ["Wifi", "Calefacción"],
      lastMaintenance: "02/02/2026",
    },
    {
      id: 21,
      number: "102-C",
      building: "C",
      type: "double",
      occupied: true,
      residents: ["Lucía Fernández", "Andrea Vargas"],
      floor: 1,
      features: ["Wifi", "Calefacción"],
      lastMaintenance: "16/02/2026",
    },
    // Edificio C - Planta 2
    {
      id: 22,
      number: "201-C",
      building: "C",
      type: "single",
      occupied: true,
      residents: ["Javier Romero"],
      floor: 2,
      features: ["Wifi", "Calefacción"],
      lastMaintenance: "01/02/2026",
    },
    {
      id: 23,
      number: "202-C",
      building: "C",
      type: "double",
      occupied: false,
      residents: [],
      floor: 2,
      features: ["Wifi", "Calefacción"],
      lastMaintenance: "17/02/2026",
    },
    // Edificio C - Planta 3
    {
      id: 24,
      number: "301-C",
      building: "C",
      type: "triple",
      occupied: true,
      residents: ["Raúl Castro", "Marcos Prieto", "Álvaro Núñez"],
      floor: 3,
      features: ["Wifi", "Calefacción", "Nevera pequeña"],
      lastMaintenance: "11/01/2026",
    },
    {
      id: 25,
      number: "302-C",
      building: "C",
      type: "single",
      occupied: false,
      residents: [],
      floor: 3,
      features: ["Wifi", "Calefacción"],
      lastMaintenance: "28/01/2026",
    },
  ]);

  // Reset view mode when dialog closes or room changes
  useEffect(() => {
    if (!selectedRoom) {
      setViewMode("details");
      setSelectedStudentName(null);
      setEditForm(null);
    } else {
      setEditForm(JSON.parse(JSON.stringify(selectedRoom)));
    }
  }, [selectedRoom]);

  // Form State for Adding Room
  const [newRoom, setNewRoom] = useState({
    number: "",
    building: "A",
    floor: 1,
    type: "single" as const,
    quantity: 1,
  });

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "single":
        return "Individual";
      case "double":
        return "Doble";
      case "triple":
        return "Triple";
      default:
        return type;
    }
  };

  const filteredRooms = useMemo(() => {
    return rooms.filter((room) => {
      const matchesBuilding =
        filterBuilding === "all" || room.building === filterBuilding;
      const matchesType = 
        filterType === "all" || room.type === filterType;
      const matchesSearch = 
        room.number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        room.residents.some(r => r.toLowerCase().includes(searchQuery.toLowerCase()));
      
      return matchesBuilding && matchesType && matchesSearch;
    });
  }, [rooms, filterBuilding, filterType, searchQuery]);

  const stats = useMemo(() => ({
    total: rooms.length,
    occupied: rooms.filter((r) => r.occupied).length,
    available: rooms.filter((r) => !r.occupied).length,
  }), [rooms]);

  // Organize rooms by building and floor for map view
  const roomsByBuildingAndFloor = useMemo(() => {
    const organized: Record<string, Record<number, Room[]>> = {};
    
    filteredRooms.forEach(room => {
      if (!organized[room.building]) {
        organized[room.building] = {};
      }
      if (!organized[room.building][room.floor]) {
        organized[room.building][room.floor] = [];
      }
      organized[room.building][room.floor].push(room);
    });

    // Sort rooms within each floor by room number
    Object.keys(organized).forEach(building => {
      Object.keys(organized[building]).forEach(floor => {
        organized[building][parseInt(floor)].sort((a, b) => 
          a.number.localeCompare(b.number)
        );
      });
    });

    return organized;
  }, [filteredRooms]);

  const handleAddRooms = () => {
    if (!newRoom.number) {
      toast.error("Por favor, introduce un número de habitación base");
      return;
    }

    const newRoomsToAdd: Room[] = [];
    const baseNumber = parseInt(newRoom.number.replace(/\D/g, "")) || 0;
    const prefix = newRoom.number.replace(/\d/g, "");

    for (let i = 0; i < newRoom.quantity; i++) {
      const roomNum = prefix + (baseNumber + i);
      newRoomsToAdd.push({
        id: Date.now() + i,
        number: roomNum,
        building: newRoom.building,
        floor: newRoom.floor,
        type: newRoom.type,
        occupied: false,
        residents: [],
        description: `Habitación ${getTypeLabel(newRoom.type)} generada automáticamente.`,
        features: ["Wifi", "Calefacción"],
        lastMaintenance: new Date().toLocaleDateString('es-ES'),
      });
    }

    setRooms([...rooms, ...newRoomsToAdd]);
    setIsAddingRoom(false);
    setNewRoom({
      number: "",
      building: "A",
      floor: 1,
      type: "single",
      quantity: 1,
      
    });
    toast.success(`${newRoom.quantity} ${newRoom.quantity === 1 ? 'habitación añadida' : 'habitaciones añadidas'} con éxito`);
  };

  const handleUpdateRoom = () => {
    if (!editForm || !selectedRoom) return;

    const updatedRooms = rooms.map(r => r.id === selectedRoom.id ? editForm : r);
    setRooms(updatedRooms);
    setSelectedRoom(editForm);
    setViewMode("details");
    toast.success("Información de la habitación actualizada");
  };

  const handleDeleteRoom = () => {
    if (!selectedRoom) return;
    
    if (confirm("¿Estás seguro de que deseas eliminar esta habitación? Esta acción no se puede deshacer.")) {
      const updatedRooms = rooms.filter(r => r.id !== selectedRoom.id);
      setRooms(updatedRooms);
      setSelectedRoom(null); // Closes the dialog
      toast.success("Habitación eliminada correctamente");
    }
  };

  // Mock data generator for student profile
  const getStudentDetails = (name: string) => {
    return {
      name: name,
      email: name.toLowerCase().replace(/\s/g, ".") + "@nexus.edu",
      phone: "+34 600 123 456",
      checkIn: "15/09/2025",
      career: "Ingeniería Informática",
      age: 21,
    };
  };

  // Mock data for room history
  const getRoomHistory = () => {
    return [
      { date: "10/02/2026", type: "Mantenimiento", description: "Revisión de aire acondicionado", user: "Técnico J.L." },
      { date: "15/09/2025", type: "Check-in", description: "Entrada de residentes", user: "Admin" },
      { date: "01/09/2025", type: "Limpieza", description: "Limpieza a fondo pre-curso", user: "Servicio Limpieza" },
      { date: "15/06/2025", type: "Check-out", description: "Salida de residentes curso anterior", user: "Admin" },
    ];
  };

  return (
    <div className="space-y-4 pb-20">
      {/* Header Card with Stats */}
      <Card className="border border-gray-100 shadow-sm">
        <CardContent className="p-4">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Habitaciones</h2>
              <p className="text-sm text-gray-500 mt-1">
                Gestiona las habitaciones de la residencia
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => setIsAddingRoom(true)}
              className="bg-[#35C759] hover:bg-[#1B5E20] text-white h-9"
            >
              <Plus className="w-4 h-4 mr-1" />
              Nueva
            </Button>
          </div>

          {/* View Toggle */}
          <div className="flex items-center justify-center gap-1 bg-gray-100 p-1 rounded-lg mb-3">
            <button
              onClick={() => setViewLayout("list")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-all ${
                viewLayout === "list"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <List className="w-3.5 h-3.5" />
              Lista
            </button>
            <button
              onClick={() => setViewLayout("map")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-all ${
                viewLayout === "map"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Grid3x3 className="w-3.5 h-3.5" />
              Mapa
            </button>
          </div>

          {/* Mini Stats */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-[#F5F5F5] rounded-lg p-3 text-center">
              <p className="text-xl font-bold text-gray-900">{stats.total}</p>
              <p className="text-[10px] text-gray-500 mt-0.5">Total</p>
            </div>
            <div className="bg-[#35C759]/10 rounded-lg p-3 text-center">
              <p className="text-xl font-bold text-[#35C759]">{stats.occupied}</p>
              <p className="text-[10px] text-gray-500 mt-0.5">Ocupadas</p>
            </div>
            <div className="bg-blue-50 rounded-lg p-3 text-center">
              <p className="text-xl font-bold text-blue-600">{stats.available}</p>
              <p className="text-[10px] text-gray-500 mt-0.5">Libres</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Buscar por número o residente..."
            className="pl-9 bg-white border-gray-200"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          <Select value={filterBuilding} onValueChange={setFilterBuilding}>
            <SelectTrigger className="w-full min-w-[100px] bg-white border-gray-200">
              <Building2 className="w-4 h-4 mr-1 shrink-0" />
              <SelectValue placeholder="Edificio" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="A">Edif. A</SelectItem>
              <SelectItem value="B">Edif. B</SelectItem>
              <SelectItem value="C">Edif. C</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-full min-w-[100px] bg-white border-gray-200">
              <Layout className="w-4 h-4 mr-1 shrink-0" />
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tipos</SelectItem>
              <SelectItem value="single">Individual</SelectItem>
              <SelectItem value="double">Doble</SelectItem>
              <SelectItem value="triple">Triple</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Rooms Grid */}
      {viewLayout === "list" && (
        <div className="grid grid-cols-1 gap-3">
          <AnimatePresence mode="popLayout">
            {filteredRooms.map((room) => (
              <motion.div
                key={room.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                layout
              >
                <Card
                  className="border border-gray-100 shadow-sm hover:shadow-md transition-all group overflow-hidden cursor-pointer"
                  onClick={() => setSelectedRoom(room)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="bg-gray-50 p-2.5 rounded-xl group-hover:bg-[#35C759]/10 transition-colors">
                          <Bed className="w-5 h-5 text-gray-500 group-hover:text-[#35C759] transition-colors" />
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-900 text-lg leading-tight">
                            {room.number}
                          </h3>
                          <p className="text-[11px] text-gray-500">
                            Edificio {room.building} • Planta {room.floor}
                          </p>
                        </div>
                      </div>
                      <Badge
                        variant={room.occupied ? "default" : "secondary"}
                        className={
                          room.occupied
                            ? "bg-[#35C759]/10 text-[#35C759] border-0"
                            : "bg-blue-50 text-blue-600 border-0"
                        }
                      >
                        {room.occupied ? "Ocupada" : "Libre"}
                      </Badge>
                    </div>

                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-xs font-semibold text-gray-600 mb-1">
                          {getTypeLabel(room.type)}
                        </p>
                        {room.occupied && room.residents.length > 0 ? (
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <Users className="w-3.5 h-3.5" />
                            <span className="truncate max-w-[150px]">
                              {room.residents.join(", ")}
                            </span>
                          </div>
                        ) : (
                          <p className="text-xs text-gray-400 italic">Sin residentes</p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-[#35C759] hover:bg-[#35C759]/10 h-8 text-xs px-2"
                      >
                        Ver detalles
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Map View */}
      {viewLayout === "map" && (
        <div className="space-y-4">
          {Object.entries(roomsByBuildingAndFloor)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([building, floors]) => (
              <motion.div
                key={building}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className="border border-gray-100 shadow-sm overflow-hidden">
                  <div className="bg-[#35C759] text-white px-4 py-2 flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    <span className="font-bold text-sm">Edificio {building}</span>
                  </div>
                  <CardContent className="p-3 space-y-4">
                    {Object.entries(floors)
                      .sort(([a], [b]) => parseInt(b) - parseInt(a))
                      .map(([floor, rooms]) => (
                        <div key={floor} className="space-y-2">
                          <div className="flex items-center gap-2">
                            <div className="bg-gray-100 px-2 py-1 rounded text-xs font-bold text-gray-600">
                              Planta {floor}
                            </div>
                            <div className="flex-1 h-px bg-gray-200"></div>
                          </div>
                          <div className="grid grid-cols-4 gap-2">
                            {rooms.map((room) => (
                              <motion.button
                                key={room.id}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setSelectedRoom(room)}
                                className={`relative aspect-square rounded-lg border-2 flex flex-col items-center justify-center p-2 transition-all ${
                                  room.occupied
                                    ? "bg-red-50 border-red-400 hover:bg-red-100"
                                    : "bg-green-50 border-green-400 hover:bg-green-100"
                                }`}
                              >
                                <Bed
                                  className={`w-4 h-4 mb-1 ${
                                    room.occupied ? "text-red-600" : "text-green-600"
                                  }`}
                                />
                                <span
                                  className={`text-[10px] font-bold ${
                                    room.occupied ? "text-red-700" : "text-green-700"
                                  }`}
                                >
                                  {room.number}
                                </span>
                                {room.occupied && (
                                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                                    <span className="text-[8px] text-white font-bold">
                                      {room.residents.length}
                                    </span>
                                  </div>
                                )}
                              </motion.button>
                            ))}
                          </div>
                        </div>
                      ))}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
        </div>
      )}

      {filteredRooms.length === 0 && (
        <Card className="border border-gray-100 shadow-sm">
          <CardContent className="p-8 text-center">
            <Building2 className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <p className="text-sm text-gray-500">
              No se encontraron habitaciones con los filtros actuales
            </p>
            <Button 
              variant="link" 
              className="mt-2 text-[#4A7C59]"
              onClick={() => {
                setFilterBuilding("all");
                setFilterType("all");
                setSearchQuery("");
              }}
            >
              Limpiar filtros
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Add Room Dialog */}
      <Dialog open={isAddingRoom} onOpenChange={setIsAddingRoom}>
        <DialogContent className="max-w-[90vw] rounded-2xl sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Nueva Habitación</DialogTitle>
            <DialogDescription>
              Añade una o varias habitaciones nuevas al sistema.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="number" className="text-right">Número</Label>
              <Input
                id="number"
                value={newRoom.number}
                onChange={(e) => setNewRoom({...newRoom, number: e.target.value})}
                placeholder="Ej: 101"
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="building" className="text-right">Edificio</Label>
              <Select 
                value={newRoom.building} 
                onValueChange={(val) => setNewRoom({...newRoom, building: val})}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="A">Edificio A</SelectItem>
                  <SelectItem value="B">Edificio B</SelectItem>
                  <SelectItem value="C">Edificio C</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="floor" className="text-right">Planta</Label>
              <Input
                id="floor"
                type="number"
                value={newRoom.floor}
                onChange={(e) => setNewRoom({...newRoom, floor: parseInt(e.target.value) || 1})}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="type" className="text-right">Tipo</Label>
              <Select 
                value={newRoom.type} 
                onValueChange={(val: any) => setNewRoom({...newRoom, type: val})}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="single">Individual</SelectItem>
                  <SelectItem value="double">Doble</SelectItem>
                  <SelectItem value="triple">Triple</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="quantity" className="text-right">Unidades</Label>
              <div className="col-span-3 flex items-center gap-3">
                <Button 
                  variant="outline" 
                  size="icon" 
                  className="h-8 w-8"
                  onClick={() => setNewRoom({...newRoom, quantity: Math.max(1, newRoom.quantity - 1)})}
                >
                  -
                </Button>
                <span className="font-bold w-8 text-center">{newRoom.quantity}</span>
                <Button 
                  variant="outline" 
                  size="icon" 
                  className="h-8 w-8"
                  onClick={() => setNewRoom({...newRoom, quantity: Math.min(20, newRoom.quantity + 1)})}
                >
                  +
                </Button>
                <span className="text-[10px] text-gray-400 italic">(Generación múltiple)</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button 
              className="w-full bg-[#4A7C59] hover:bg-[#3d6448]" 
              onClick={handleAddRooms}
            >
              Crear {newRoom.quantity > 1 ? `${newRoom.quantity} habitaciones` : 'habitación'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Room Details & Management Dialog */}
      <Dialog open={!!selectedRoom} onOpenChange={(open) => !open && setSelectedRoom(null)}>
        <DialogContent className="max-w-[90vw] rounded-2xl sm:max-w-[425px]">
          {selectedRoom && (
            <>
              {/* DETAILS VIEW */}
              {viewMode === "details" && (
                <>
                  <DialogHeader>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="bg-[#4A7C59]/10 p-2 rounded-xl">
                        <Bed className="w-6 h-6 text-[#4A7C59]" />
                      </div>
                      <div>
                        <DialogTitle className="text-xl">Habitación {selectedRoom.number}</DialogTitle>
                        <DialogDescription>
                          Edificio {selectedRoom.building} • Planta {selectedRoom.floor}
                        </DialogDescription>
                      </div>
                    </div>
                  </DialogHeader>
                  <div className="space-y-4 py-2">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                        <p className="text-[10px] uppercase tracking-wider text-gray-500 font-bold mb-1">Tipo</p>
                        <p className="text-sm font-semibold">{getTypeLabel(selectedRoom.type)}</p>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                        <p className="text-[10px] uppercase tracking-wider text-gray-500 font-bold mb-1">Estado</p>
                        <p className={`text-sm font-semibold ${selectedRoom.occupied ? 'text-[#4A7C59]' : 'text-blue-600'}`}>
                          {selectedRoom.occupied ? 'Ocupada' : 'Libre'}
                        </p>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
                        <Users className="w-4 h-4 text-[#4A7C59]" />
                        Residentes actuales
                      </h4>
                      <div className="space-y-2">
                        {selectedRoom.residents.length > 0 ? (
                          selectedRoom.residents.map((resident, idx) => (
                            <div key={idx} className="flex items-center justify-between bg-white p-2 rounded-lg border border-gray-100">
                              <span className="text-sm font-medium">{resident}</span>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-7 text-xs text-[#4A7C59] hover:bg-[#4A7C59]/10"
                                onClick={() => {
                                  setSelectedStudentName(resident);
                                  setViewMode("student");
                                }}
                              >
                                Perfil
                              </Button>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-gray-500 italic px-2">No hay residentes asignados</p>
                        )}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
                        <Info className="w-4 h-4 text-[#4A7C59]" />
                        Descripción y Equipamiento
                      </h4>
                      <p className="text-xs text-gray-600 mb-3 leading-relaxed">
                        {selectedRoom.description}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {selectedRoom.features?.map((f, i) => (
                          <span key={i} className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-[10px] flex items-center gap-1">
                            <Check className="w-3 h-3 text-[#4A7C59]" /> {f}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-gray-100 flex justify-between items-center text-[11px] text-gray-400">
                      <span>Último mantenimiento: {selectedRoom.lastMaintenance}</span>
                      <Button 
                        variant="link" 
                        className="h-auto p-0 text-[11px] text-[#4A7C59]"
                        onClick={() => setViewMode("history")}
                      >
                        Ver historial
                      </Button>
                    </div>
                  </div>
                  <DialogFooter className="sm:justify-start">
                    <Button 
                      className="w-full bg-[#4A7C59] hover:bg-[#3d6448]"
                      onClick={() => setViewMode("edit")}
                    >
                      Editar Información
                    </Button>
                  </DialogFooter>
                </>
              )}

              {/* STUDENT PROFILE VIEW */}
              {viewMode === "student" && selectedStudentName && (
                <>
                  <DialogHeader>
                    <div className="flex items-center gap-2 mb-2">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 -ml-2"
                        onClick={() => setViewMode("details")}
                      >
                        <ArrowLeft className="w-4 h-4" />
                      </Button>
                      <DialogTitle className="text-xl">Perfil del Estudiante</DialogTitle>
                    </div>
                  </DialogHeader>
                  <div className="py-4 space-y-6">
                    <div className="flex flex-col items-center">
                      <Avatar className="w-20 h-20 mb-3 border-2 border-[#4A7C59]/20">
                        <AvatarFallback className="bg-[#4A7C59]/10 text-[#4A7C59] text-2xl font-bold">
                          {selectedStudentName.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <h3 className="text-xl font-bold text-gray-900">{selectedStudentName}</h3>
                      <p className="text-sm text-gray-500">Residente</p>
                    </div>

                    <div className="space-y-4">
                      {/* Generando datos mockeados basados en el nombre */}
                      {(() => {
                        const details = getStudentDetails(selectedStudentName);
                        return (
                          <>
                            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                              <Mail className="w-5 h-5 text-gray-400" />
                              <div>
                                <p className="text-xs text-gray-500">Correo electrónico</p>
                                <p className="text-sm font-medium">{details.email}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                              <Phone className="w-5 h-5 text-gray-400" />
                              <div>
                                <p className="text-xs text-gray-500">Teléfono</p>
                                <p className="text-sm font-medium">{details.phone}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                              <CalendarIcon className="w-5 h-5 text-gray-400" />
                              <div>
                                <p className="text-xs text-gray-500">Fecha de ingreso</p>
                                <p className="text-sm font-medium">{details.checkIn}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                              <Building2 className="w-5 h-5 text-gray-400" />
                              <div>
                                <p className="text-xs text-gray-500">Asignación actual</p>
                                <p className="text-sm font-medium">Habitación {selectedRoom.number} - Edif. {selectedRoom.building}</p>
                              </div>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                  <DialogFooter>
                    <Button 
                      className="w-full bg-[#4A7C59]"
                      onClick={() => toast.info("Funcionalidad de chat próximamente")}
                    >
                      Contactar
                    </Button>
                  </DialogFooter>
                </>
              )}

              {/* HISTORY VIEW */}
              {viewMode === "history" && (
                <>
                  <DialogHeader>
                    <div className="flex items-center gap-2 mb-2">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 -ml-2"
                        onClick={() => setViewMode("details")}
                      >
                        <ArrowLeft className="w-4 h-4" />
                      </Button>
                      <DialogTitle className="text-xl">Historial de la Habitación</DialogTitle>
                    </div>
                    <DialogDescription>
                      Registro de eventos, mantenimientos y ocupación.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="py-4">
                    <div className="relative border-l border-gray-200 ml-3 space-y-6">
                      {getRoomHistory().map((item, index) => (
                        <div key={index} className="mb-6 ml-6 relative">
                          <span className="absolute -left-[31px] flex items-center justify-center w-6 h-6 bg-[#4A7C59]/10 rounded-full ring-4 ring-white">
                            <Clock className="w-3 h-3 text-[#4A7C59]" />
                          </span>
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-gray-900">{item.type}</span>
                            <span className="text-xs text-gray-500 mb-1">{item.date} • {item.user}</span>
                            <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded-lg mt-1">
                              {item.description}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* EDIT VIEW */}
              {viewMode === "edit" && editForm && (
                <>
                  <DialogHeader>
                    <div className="flex items-center gap-2 mb-2">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 -ml-2"
                        onClick={() => setViewMode("details")}
                      >
                        <ArrowLeft className="w-4 h-4" />
                      </Button>
                      <DialogTitle className="text-xl">Editar Habitación</DialogTitle>
                    </div>
                  </DialogHeader>
                  <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto px-1">
                    <div className="grid gap-2">
                      <Label htmlFor="edit-number">Número</Label>
                      <Input
                        id="edit-number"
                        value={editForm.number}
                        onChange={(e) => setEditForm({...editForm, number: e.target.value})}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="edit-building">Edificio</Label>
                        <Select 
                          value={editForm.building} 
                          onValueChange={(val) => setEditForm({...editForm, building: val})}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="A">Edificio A</SelectItem>
                            <SelectItem value="B">Edificio B</SelectItem>
                            <SelectItem value="C">Edificio C</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="edit-floor">Planta</Label>
                        <Input
                          id="edit-floor"
                          type="number"
                          value={editForm.floor}
                          onChange={(e) => setEditForm({...editForm, floor: parseInt(e.target.value) || 0})}
                        />
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="edit-type">Tipo</Label>
                      <Select 
                        value={editForm.type} 
                        onValueChange={(val: any) => setEditForm({...editForm, type: val})}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="single">Individual</SelectItem>
                          <SelectItem value="double">Doble</SelectItem>
                          <SelectItem value="triple">Triple</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="edit-desc">Descripción</Label>
                      <Input
                        id="edit-desc"
                        value={editForm.description || ""}
                        onChange={(e) => setEditForm({...editForm, description: e.target.value})}
                      />
                    </div>
                    
                    <div className="pt-4 border-t border-gray-100 mt-2">
                      <Button 
                        variant="destructive" 
                        className="w-full bg-red-50 text-red-600 hover:bg-red-100 border border-red-100"
                        onClick={handleDeleteRoom}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Eliminar Habitación
                      </Button>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button 
                      className="w-full bg-[#4A7C59] hover:bg-[#3d6448]" 
                      onClick={handleUpdateRoom}
                    >
                      <Save className="w-4 h-4 mr-2" />
                      Guardar Cambios
                    </Button>
                  </DialogFooter>
                </>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}