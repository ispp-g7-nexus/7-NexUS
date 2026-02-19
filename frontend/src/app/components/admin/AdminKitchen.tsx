import { useState } from "react";
import {
  UtensilsCrossed,
  Calendar,
  Users,
  Clock,
  CheckCircle,
  XCircle,
  Plus,
  Edit,
  Save,
  X,
  ChevronRight,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../ui/tabs";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
import { toast } from "sonner";

interface MenuDish {
  type: string;
  title: string;
  tags: string[];
  image: string;
}

interface DayMenu {
  day: string;
  date: string;
  lunch: MenuDish[];
  dinner: MenuDish[];
}

interface Request {
  id: string;
  name: string;
  room: string;
  type: string;
  date: string;
  reason: string;
}

interface PlannedWeek {
  id: string;
  weekStart: string;
  weekEnd: string;
  menu: DayMenu[];
  status: "draft" | "published";
}

export function AdminKitchen() {
  const [requests, setRequests] = useState<Request[]>([
    {
      id: "1",
      name: "Carlos Ruiz",
      room: "305-A",
      type: "Picnic para llevar",
      date: "18 Feb",
      reason: "Excursión Universidad",
    },
    {
      id: "2",
      name: "Ana Martínez",
      room: "201-B",
      type: "Dieta sin lactosa",
      date: "Permanente",
      reason: "Intolerancia alimentaria",
    },
    {
      id: "3",
      name: "Pedro López",
      room: "402-C",
      type: "Menú vegano",
      date: "Permanente",
      reason: "Preferencia personal",
    },
  ]);

  const [acceptedRequests, setAcceptedRequests] = useState<Request[]>([]);
  const [isPlanDialogOpen, setIsPlanDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingWeek, setEditingWeek] = useState<PlannedWeek | null>(null);
  const [plannedWeeks, setPlannedWeeks] = useState<PlannedWeek[]>([]);

  const [newWeek, setNewWeek] = useState<{
    weekStart: string;
    weekEnd: string;
    menu: DayMenu[];
  }>({
    weekStart: "",
    weekEnd: "",
    menu: [],
  });

  const weekMenu: DayMenu[] = [
    {
      day: "Lunes",
      date: "17 Feb",
      lunch: [
        {
          type: "Principal",
          title: "Pollo al Curry con Arroz Basmati",
          tags: ["Sin Gluten", "Alto Proteína"],
          image: "https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?auto=format&fit=crop&q=80&w=400",
        },
        {
          type: "Segundo",
          title: "Lentejas Estofadas con Verduras",
          tags: ["Vegano", "Alto Fibra"],
          image: "https://images.unsplash.com/photo-1588137378633-dea1336ce1e2?auto=format&fit=crop&q=80&w=400",
        },
      ],
      dinner: [
        {
          type: "Principal",
          title: "Merluza al Horno con Verduras",
          tags: ["Pescado", "Bajo Calórico"],
          image: "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&q=80&w=400",
        },
        {
          type: "Segundo",
          title: "Tortilla de Patatas",
          tags: ["Vegetariano", "Sin Gluten"],
          image: "https://images.unsplash.com/photo-1626200419199-391ae4be7a41?auto=format&fit=crop&q=80&w=400",
        },
      ],
    },
    {
      day: "Martes",
      date: "18 Feb",
      lunch: [
        {
          type: "Principal",
          title: "Paella Mixta",
          tags: ["Mariscos", "Sin Lácteos"],
          image: "https://images.unsplash.com/photo-1534080564583-6be75777b70a?auto=format&fit=crop&q=80&w=400",
        },
        {
          type: "Segundo",
          title: "Ensalada César con Pollo",
          tags: ["Alto Proteína", "Gluten"],
          image: "https://images.unsplash.com/photo-1546793665-c74683f339c1?auto=format&fit=crop&q=80&w=400",
        },
      ],
      dinner: [
        {
          type: "Principal",
          title: "Sopa de Verduras",
          tags: ["Vegano", "Bajo Calórico"],
          image: "https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&q=80&w=400",
        },
        {
          type: "Segundo",
          title: "Hamburguesas de Garbanzos",
          tags: ["Vegano", "Alto Fibra"],
          image: "https://images.unsplash.com/photo-1520072959219-c595dc870360?auto=format&fit=crop&q=80&w=400",
        },
      ],
    },
    {
      day: "Miércoles",
      date: "19 Feb",
      lunch: [
        {
          type: "Principal",
          title: "Lasaña de Carne",
          tags: ["Gluten", "Lácteos"],
          image: "https://images.unsplash.com/photo-1574894709920-11b28e7367e3?auto=format&fit=crop&q=80&w=400",
        },
        {
          type: "Segundo",
          title: "Pechuga a la Plancha",
          tags: ["Sin Gluten", "Alto Proteína"],
          image: "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&q=80&w=400",
        },
      ],
      dinner: [
        {
          type: "Principal",
          title: "Crema de Calabacín",
          tags: ["Vegano", "Bajo Calórico"],
          image: "https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&q=80&w=400",
        },
        {
          type: "Segundo",
          title: "Pizza Margarita",
          tags: ["Vegetariano", "Gluten"],
          image: "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&q=80&w=400",
        },
      ],
    },
    {
      day: "Jueves",
      date: "20 Feb",
      lunch: [
        {
          type: "Principal",
          title: "Arroz con Verduras al Wok",
          tags: ["Vegano", "Sin Gluten"],
          image: "https://images.unsplash.com/photo-1603133872878-684f208fb84b?auto=format&fit=crop&q=80&w=400",
        },
        {
          type: "Segundo",
          title: "Salmón a la Plancha",
          tags: ["Pescado", "Omega 3"],
          image: "https://images.unsplash.com/photo-1485921325833-c519f76c4927?auto=format&fit=crop&q=80&w=400",
        },
      ],
      dinner: [
        {
          type: "Principal",
          title: "Macarrones con Tomate",
          tags: ["Vegetariano", "Gluten"],
          image: "https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?auto=format&fit=crop&q=80&w=400",
        },
        {
          type: "Segundo",
          title: "Albóndigas en Salsa",
          tags: ["Gluten", "Alto Proteína"],
          image: "https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?auto=format&fit=crop&q=80&w=400",
        },
      ],
    },
    {
      day: "Viernes",
      date: "21 Feb",
      lunch: [
        {
          type: "Principal",
          title: "Fideuá de Mariscos",
          tags: ["Mariscos", "Gluten"],
          image: "https://images.unsplash.com/photo-1617093727343-374698b1b08d?auto=format&fit=crop&q=80&w=400",
        },
        {
          type: "Segundo",
          title: "Ensalada Griega",
          tags: ["Vegetariano", "Sin Gluten"],
          image: "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&q=80&w=400",
        },
      ],
      dinner: [
        {
          type: "Principal",
          title: "Tacos de Pollo",
          tags: ["Alto Proteína", "Picante"],
          image: "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?auto=format&fit=crop&q=80&w=400",
        },
        {
          type: "Segundo",
          title: "Quesadillas de Queso",
          tags: ["Vegetariano", "Lácteos"],
          image: "https://images.unsplash.com/photo-1618040996337-56904b7850b9?auto=format&fit=crop&q=80&w=400",
        },
      ],
    },
  ];

  const handleApproveRequest = (request: Request) => {
    setRequests(requests.filter((r) => r.id !== request.id));
    setAcceptedRequests([...acceptedRequests, request]);
    toast.success("Solicitud aprobada", {
      description: `Se ha aprobado la solicitud de ${request.name}`,
    });
  };

  const handleRejectRequest = (requestId: string) => {
    setRequests(requests.filter((r) => r.id !== requestId));
    toast.error("Solicitud rechazada", {
      description: "La solicitud ha sido rechazada",
    });
  };

  // Initialize new week with template when opening dialog
  const openPlanDialog = () => {
    setNewWeek({
      weekStart: "",
      weekEnd: "",
      menu: JSON.parse(JSON.stringify(weekMenu)), // Deep copy of template
    });
    setIsPlanDialogOpen(true);
  };

  const handlePlanMenu = () => {
    if (!newWeek.weekStart || !newWeek.weekEnd) {
      toast.error("Completa todos los campos", {
        description: "Debe seleccionar las fechas de inicio y fin de la semana",
      });
      return;
    }

    const newPlannedWeek: PlannedWeek = {
      id: Date.now().toString(),
      weekStart: newWeek.weekStart,
      weekEnd: newWeek.weekEnd,
      menu: newWeek.menu,
      status: "published",
    };

    setPlannedWeeks([...plannedWeeks, newPlannedWeek]);
    setIsPlanDialogOpen(false);
    setNewWeek({ weekStart: "", weekEnd: "", menu: [] });
    toast.success("Menú planificado", {
      description: "El menú ha sido publicado correctamente",
    });
  };

  const handleEditWeek = (week: PlannedWeek) => {
    setEditingWeek(week);
    setIsEditDialogOpen(true);
  };

  const handleSaveEditedWeek = () => {
    if (!editingWeek) return;
    
    setPlannedWeeks(
      plannedWeeks.map((w) =>
        w.id === editingWeek.id ? editingWeek : w
      )
    );
    setIsEditDialogOpen(false);
    setEditingWeek(null);
    toast.success("Menú actualizado", {
      description: "Los cambios han sido guardados correctamente",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">
          Comedor y Cocina
        </h2>
        <Button
          className="bg-gradient-to-r from-[#7BD14F] to-[#35C759] hover:from-[#35C759] hover:to-[#1B5E20]"
          onClick={openPlanDialog}
        >
          <Calendar className="w-4 h-4 mr-2" /> Planificar Menú
        </Button>
      </div>

      <Tabs defaultValue="menu" className="w-full">
        <TabsList className="bg-gray-100 p-1">
          <TabsTrigger value="menu">Menú Semanal Actual</TabsTrigger>
          <TabsTrigger value="upcoming">Próximas Semanas</TabsTrigger>
          <TabsTrigger value="requests">
            Solicitudes Especiales
            {requests.length > 0 && (
              <Badge className="ml-2 bg-orange-500">{requests.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Tab Menú Semanal Actual */}
        <TabsContent value="menu" className="mt-6 space-y-4">
          <div className="bg-white rounded-lg border p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  Semana del 17 - 21 de Febrero
                </h3>
                <p className="text-sm text-gray-500">Menú publicado y visible para residentes</p>
              </div>
              <Badge className="bg-green-500">Activo</Badge>
            </div>

            <div className="space-y-6">
              {weekMenu.map((dayMenu) => (
                <div key={dayMenu.day} className="space-y-3">
                  <div className="flex items-center gap-2 border-b pb-2">
                    <Calendar className="w-4 h-4 text-[#35C759]" />
                    <h3 className="font-bold text-gray-900">
                      {dayMenu.day} - {dayMenu.date}
                    </h3>
                  </div>

                  {/* Almuerzo */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-orange-400" />
                      Almuerzo (13:00 - 15:30)
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {dayMenu.lunch.map((item, idx) => (
                        <AdminMenuCard key={idx} {...item} />
                      ))}
                    </div>
                  </div>

                  {/* Cena */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-indigo-400" />
                      Cena (20:00 - 22:30)
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {dayMenu.dinner.map((item, idx) => (
                        <AdminMenuCard key={idx} {...item} />
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* Tab Próximas Semanas */}
        <TabsContent value="upcoming" className="mt-6 space-y-4">
          {plannedWeeks.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Calendar className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500 mb-2">
                  No hay menús planificados para próximas semanas
                </p>
                <p className="text-sm text-gray-400 mb-4">
                  Utiliza el botón "Planificar Menú" para crear nuevos menús
                </p>
                <Button
                  onClick={() => setIsPlanDialogOpen(true)}
                  className="bg-gradient-to-r from-[#7BD14F] to-[#35C759] hover:from-[#35C759] hover:to-[#1B5E20]"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Planificar Primer Menú
                </Button>
              </CardContent>
            </Card>
          ) : (
            plannedWeeks.map((week) => (
              <Card key={week.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>
                        Semana del {week.weekStart} al {week.weekEnd}
                      </CardTitle>
                      <p className="text-sm text-gray-500 mt-1">
                        Menú planificado para próximas semanas
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Badge
                        className={
                          week.status === "published"
                            ? "bg-green-500"
                            : "bg-gray-400"
                        }
                      >
                        {week.status === "published" ? "Publicado" : "Borrador"}
                      </Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEditWeek(week)}
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Editar
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {week.menu.slice(0, 2).map((dayMenu) => (
                      <div
                        key={dayMenu.day}
                        className="border-l-4 border-[#35C759] pl-3"
                      >
                        <h4 className="font-semibold text-gray-900 mb-2">
                          {dayMenu.day} - {dayMenu.date}
                        </h4>
                        <div className="text-sm text-gray-600 space-y-1">
                          <p>
                            🍽️ Almuerzo: {dayMenu.lunch[0]?.title || "N/A"}
                          </p>
                          <p>
                            🌙 Cena: {dayMenu.dinner[0]?.title || "N/A"}
                          </p>
                        </div>
                      </div>
                    ))}
                    {week.menu.length > 2 && (
                      <p className="text-sm text-gray-500 italic">
                        + {week.menu.length - 2} días más...
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Tab Solicitudes */}
        <TabsContent value="requests" className="mt-6 space-y-6">
          {/* Solicitudes Pendientes */}
          <Card className="border-gray-200">
            <CardHeader>
              <CardTitle>
                Peticiones Pendientes
                {requests.length > 0 && (
                  <Badge className="ml-2 bg-orange-500">{requests.length}</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {requests.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-500">No hay solicitudes pendientes</p>
                </div>
              ) : (
                requests.map((request) => (
                  <div
                    key={request.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-xl"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600">
                        <UtensilsCrossed className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">
                          {request.type}
                        </h4>
                        <p className="text-sm text-gray-500">
                          {request.name} • Hab {request.room}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          Para: {request.date} • Motivo: {request.reason}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                        onClick={() => handleRejectRequest(request.id)}
                      >
                        <XCircle className="w-4 h-4 mr-1" />
                        Rechazar
                      </Button>
                      <Button
                        size="sm"
                        className="bg-gradient-to-r from-[#7BD14F] to-[#35C759] hover:from-[#35C759] hover:to-[#1B5E20]"
                        onClick={() => handleApproveRequest(request)}
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Aprobar
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Solicitudes Aceptadas */}
          {acceptedRequests.length > 0 && (
            <Card className="border-green-200 bg-green-50/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  Solicitudes Aprobadas
                  <Badge className="bg-green-600">{acceptedRequests.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {acceptedRequests.map((request) => (
                    <div
                      key={request.id}
                      className="flex items-center justify-between p-3 bg-white rounded-lg border border-green-200"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 text-sm">
                            {request.type}
                          </p>
                          <p className="text-xs text-gray-500">
                            {request.name} • Hab {request.room} • {request.date}
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-green-700 border-green-300">
                        Aprobada
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialog Planificar Menú */}
      <Dialog open={isPlanDialogOpen} onOpenChange={setIsPlanDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Planificar Menú Semanal</DialogTitle>
            <DialogDescription>
              Configura el menú para las próximas semanas. Puedes personalizar cada plato y añadir fotos.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Fecha de inicio
                </label>
                <Input
                  type="date"
                  value={newWeek.weekStart}
                  onChange={(e) =>
                    setNewWeek({ ...newWeek, weekStart: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Fecha de fin
                </label>
                <Input
                  type="date"
                  value={newWeek.weekEnd}
                  onChange={(e) =>
                    setNewWeek({ ...newWeek, weekEnd: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="space-y-6">
              {newWeek.menu && newWeek.menu.map((dayMenu, dayIndex) => (
                <div key={dayIndex} className="border rounded-xl p-4 space-y-4">
                  <div className="flex items-center gap-2 border-b pb-2">
                    <Calendar className="w-5 h-5 text-[#35C759]" />
                    <h4 className="font-bold text-gray-900 text-lg">
                      {dayMenu.day}
                    </h4>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Almuerzo */}
                    <div className="space-y-3">
                      <h5 className="font-semibold text-orange-600 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-orange-500" />
                        Almuerzo
                      </h5>
                      {dayMenu.lunch.map((dish, dishIndex) => (
                        <div key={dishIndex} className="p-3 bg-gray-50 rounded-lg border border-gray-100 space-y-2">
                          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{dish.type}</label>
                          <Input
                            value={dish.title}
                            onChange={(e) => {
                              const newMenu = [...newWeek.menu];
                              newMenu[dayIndex].lunch[dishIndex].title = e.target.value;
                              setNewWeek({ ...newWeek, menu: newMenu });
                            }}
                            placeholder="Nombre del plato"
                            className="bg-white"
                          />
                          <div className="flex gap-2">
                            <Input
                              value={dish.image}
                              onChange={(e) => {
                                const newMenu = [...newWeek.menu];
                                newMenu[dayIndex].lunch[dishIndex].image = e.target.value;
                                setNewWeek({ ...newWeek, menu: newMenu });
                              }}
                              placeholder="URL de la imagen (Unsplash)"
                              className="text-xs bg-white flex-1"
                            />
                            {dish.image && (
                              <div className="w-10 h-10 rounded overflow-hidden flex-shrink-0 border bg-gray-200">
                                <img src={dish.image} alt="" className="w-full h-full object-cover" />
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Cena */}
                    <div className="space-y-3">
                      <h5 className="font-semibold text-indigo-600 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-indigo-500" />
                        Cena
                      </h5>
                      {dayMenu.dinner.map((dish, dishIndex) => (
                        <div key={dishIndex} className="p-3 bg-gray-50 rounded-lg border border-gray-100 space-y-2">
                          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{dish.type}</label>
                          <Input
                            value={dish.title}
                            onChange={(e) => {
                              const newMenu = [...newWeek.menu];
                              newMenu[dayIndex].dinner[dishIndex].title = e.target.value;
                              setNewWeek({ ...newWeek, menu: newMenu });
                            }}
                            placeholder="Nombre del plato"
                            className="bg-white"
                          />
                          <div className="flex gap-2">
                            <Input
                              value={dish.image}
                              onChange={(e) => {
                                const newMenu = [...newWeek.menu];
                                newMenu[dayIndex].dinner[dishIndex].image = e.target.value;
                                setNewWeek({ ...newWeek, menu: newMenu });
                              }}
                              placeholder="URL de la imagen (Unsplash)"
                              className="text-xs bg-white flex-1"
                            />
                            {dish.image && (
                              <div className="w-10 h-10 rounded overflow-hidden flex-shrink-0 border bg-gray-200">
                                <img src={dish.image} alt="" className="w-full h-full object-cover" />
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-2 pt-4 border-t sticky bottom-0 bg-white pb-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setIsPlanDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                className="flex-1 bg-gradient-to-r from-[#7BD14F] to-[#35C759] hover:from-[#35C759] hover:to-[#1B5E20]"
                onClick={handlePlanMenu}
              >
                <Save className="w-4 h-4 mr-2" />
                Publicar Menú
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Editar Menú */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Menú Semanal</DialogTitle>
            <DialogDescription>
              Modifica los platos del menú para la semana seleccionada. Puedes cambiar nombres y añadir fotos.
            </DialogDescription>
          </DialogHeader>
          {editingWeek && (
            <div className="space-y-4">
              {editingWeek.menu.map((dayMenu, dayIndex) => (
                <div key={dayIndex} className="border rounded-lg p-4 space-y-3">
                  <h4 className="font-bold text-gray-900">
                    {dayMenu.day} - {dayMenu.date}
                  </h4>
                  
                  {/* Almuerzo */}
                  <div>
                    <label className="text-sm font-semibold text-orange-600 block mb-2">
                      Almuerzo
                    </label>
                    {dayMenu.lunch.map((dish, dishIndex) => (
                      <div key={dishIndex} className="mb-3 p-3 bg-gray-50 rounded-lg">
                        <label className="text-xs text-gray-500 block mb-1">{dish.type}</label>
                        <Input
                          value={dish.title}
                          onChange={(e) => {
                            const newMenu = [...editingWeek.menu];
                            newMenu[dayIndex].lunch[dishIndex].title = e.target.value;
                            setEditingWeek({ ...editingWeek, menu: newMenu });
                          }}
                          placeholder={`Nombre del plato`}
                          className="mb-2"
                        />
                        <div>
                          <label className="text-xs text-gray-500 block mb-1">URL de la foto</label>
                          <Input
                            value={dish.image}
                            onChange={(e) => {
                              const newMenu = [...editingWeek.menu];
                              newMenu[dayIndex].lunch[dishIndex].image = e.target.value;
                              setEditingWeek({ ...editingWeek, menu: newMenu });
                            }}
                            placeholder="https://images.unsplash.com/..."
                            className="text-xs"
                          />
                          {dish.image && (
                            <img 
                              src={dish.image} 
                              alt={dish.title} 
                              className="mt-2 w-20 h-20 object-cover rounded"
                            />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Cena */}
                  <div>
                    <label className="text-sm font-semibold text-indigo-600 block mb-2">
                      Cena
                    </label>
                    {dayMenu.dinner.map((dish, dishIndex) => (
                      <div key={dishIndex} className="mb-3 p-3 bg-gray-50 rounded-lg">
                        <label className="text-xs text-gray-500 block mb-1">{dish.type}</label>
                        <Input
                          value={dish.title}
                          onChange={(e) => {
                            const newMenu = [...editingWeek.menu];
                            newMenu[dayIndex].dinner[dishIndex].title = e.target.value;
                            setEditingWeek({ ...editingWeek, menu: newMenu });
                          }}
                          placeholder={`Nombre del plato`}
                          className="mb-2"
                        />
                        <div>
                          <label className="text-xs text-gray-500 block mb-1">URL de la foto</label>
                          <Input
                            value={dish.image}
                            onChange={(e) => {
                              const newMenu = [...editingWeek.menu];
                              newMenu[dayIndex].dinner[dishIndex].image = e.target.value;
                              setEditingWeek({ ...editingWeek, menu: newMenu });
                            }}
                            placeholder="https://images.unsplash.com/..."
                            className="text-xs"
                          />
                          {dish.image && (
                            <img 
                              src={dish.image} 
                              alt={dish.title} 
                              className="mt-2 w-20 h-20 object-cover rounded"
                            />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setIsEditDialogOpen(false);
                    setEditingWeek(null);
                  }}
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancelar
                </Button>
                <Button
                  className="flex-1 bg-gradient-to-r from-[#7BD14F] to-[#35C759] hover:from-[#35C759] hover:to-[#1B5E20]"
                  onClick={handleSaveEditedWeek}
                >
                  <Save className="w-4 h-4 mr-2" />
                  Guardar Cambios
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AdminMenuCard({ type, title, tags, image }: MenuDish) {
  return (
    <Card className="overflow-hidden border-none shadow-sm">
      <div className="flex">
        <div className="w-24 h-24 relative">
          <img
            src={image}
            alt={title}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="flex-1 p-3 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-bold text-[#35C759] uppercase tracking-wider">
                {type}
              </span>
            </div>
            <h3 className="font-bold text-gray-900 leading-tight mt-1 text-sm">
              {title}
            </h3>
          </div>
          <div className="flex gap-1 mt-2 flex-wrap">
            {tags.map((tag: string) => (
              <Badge
                key={tag}
                variant="secondary"
                className="text-[10px] h-5 bg-gray-100 text-gray-600"
              >
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}