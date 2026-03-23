import { motion } from "framer-motion";
import { Bed, Building2, Edit2, Grid3x3, List, Plus, Search as SearchIcon, Trash2, User, Users } from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import roomSvg from "../../assets/room.svg";
import "../../index.css";
import {
  createBedroom,
  deleteBedroom,
  listBedrooms,
  updateBedroom,
  type Bedroom,
  type BedroomResident,
} from "../../services/bedrooms";

import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";

import {
  Select1,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";


function validateNumero(v: string): string {
  if (!v.trim()) return "El número es obligatorio";
  if (v.trim().length > 50) return "Máximo 50 caracteres";
  return "";
}
function validateEdificio(v: string): string {
  if (!v.trim()) return "El edificio es obligatorio";
  if (v.trim().length > 100) return "Máximo 100 caracteres";
  return "";
}
function validatePlanta(v: string): string {
  if (!v) return "";
  const n = Number.parseInt(v);
  if (isNaN(n)) return "Debe ser un número";
  if (n < -5 || n > 200) return "La planta debe estar entre -5 y 200";
  return "";
}
function validateUnidades(v: string, isEditing: boolean): string {
  if (isEditing) return "";
  const n = Number.parseInt(v);
  return isNaN(n) || n < 1 ? "Debe ser al menos 1" : "";
}

const CAPACITY_BY_TYPE: Record<string, number> = { Individual: 1, Doble: 2, Triple: 3 };

function getErrorMessage(detail: unknown, fallback: string): string {
  if (typeof detail === "string" && detail.trim()) return detail;
  if (Array.isArray(detail)) return detail.map(String).join(" ");
  if (detail && typeof detail === "object") {
    const messages = Object.values(detail as Record<string, unknown>)
      .flatMap((v) => (Array.isArray(v) ? v : [v]))
      .map(String)
      .filter(Boolean);
    if (messages.length) return messages.join(" ");
  }
  return fallback;
}

export function Rooms() {
  const [rooms, setRooms] = useState<Bedroom[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter] = useState("todos");
  const [viewLayout, setViewLayout] = useState<"list" | "map">("list");
  const [selectedRoom, setSelectedRoom] = useState<Bedroom | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateField = (name: string, value: string | number): boolean => {
    const v = String(value);
    const validators: Record<string, () => string> = {
      numero:    () => validateNumero(v),
      edificio:  () => validateEdificio(v),
      planta:    () => validatePlanta(v),
      unidades:  () => validateUnidades(v, isEditing),
    };
    const error = validators[name]?.() ?? "";
    setErrors((prev) => ({ ...prev, [name]: error }));
    return !error;
  };

  const [form, setForm] = useState({
    numero: "",
    edificio: "",
    planta: "",
    tipo: "Individual",
    unidades: 1,
  });

  useEffect(() => {
    fetchRooms();
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setIsModalOpen(false);
      setSelectedRoom(null);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const fetchRooms = async () => {
    setLoading(true);
    try {
      const data = await listBedrooms();
      setRooms(data);
    } catch (err) {
      console.error(err);
      toast.error("Error al cargar las habitaciones.");
    } finally {
      setLoading(false);
    }
  };

  const stats = useMemo(() => {
    const ocupadas = rooms.filter((r) => r.ocupantes_actuales > 0).length;
    return { total: rooms.length, ocupadas, libres: rooms.length - ocupadas };
  }, [rooms]);

  const [filterTipo, setFilterTipo] = useState("todos");
  const [filterEdificio, setFilterEdificio] = useState("todos");
  const [buildingOptions, setBuildingOptions] = useState([]);

  useEffect(() => {
    const fetchBuildingOptions = async () => {
      try {
        const res = await fetch("/api/bedrooms/buildings");
        if (!res.ok) throw new Error("Error fetching buildings");
        const data = await res.json();
        const dataUnique = Array.from(new Set(data.filter((b: string) => b && b.trim())));
        setBuildingOptions(dataUnique);
      } catch (error) {
        console.error("Failed to fetch building options:", error);
      }
    };
    fetchBuildingOptions();
  }, []);

  const filteredRooms = useMemo(() => {
    let list = [...rooms];
    if (filter === "ocupadas") list = list.filter((r) => r.ocupantes_actuales > 0);
    if (filter === "libres") list = list.filter((r) => r.ocupantes_actuales === 0);
    if (filterTipo !== "todos") list = list.filter((r) => r.tipo === filterTipo);
    if (filterEdificio !== "todos") list = list.filter((r) => r.edificio === filterEdificio);
    if (search)
      list = list.filter((r) => r.numero.toLowerCase().includes(search.toLowerCase()));
    return list;
  }, [rooms, search, filter, filterTipo, filterEdificio]);

  const roomsByBuildingAndFloor = useMemo(() => groupByBuildingAndFloor(filteredRooms), [filteredRooms]);

  const onChange = (k: string, v: string | number) => {
    setForm((prev) => ({ ...prev, [k]: v }));
    validateField(k, v);
  };

  const saveOneBedroom = async (payload: Record<string, unknown>) => {
    if (isEditing && editingId) {
      const res = await updateBedroom(editingId, payload);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(getErrorMessage((body as { detail?: unknown }).detail, `Error ${res.status}`));
      }
    } else {
      const res = await createBedroom(payload);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(getErrorMessage((body as { detail?: unknown }).detail, `Error ${res.status}`));
      }
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const fieldsToValidate = ["numero", "edificio", "planta", "unidades"];
    const valid = fieldsToValidate.every((field) => validateField(field, form[field as keyof typeof form]));
    if (!valid) return;

    const base = Number.parseInt(form.numero.replace(/\D/g, "")) || 0;
    const prefix = form.numero.replace(/\d/g, "");
    const payloadBase = {
      planta: form.planta ? Number.parseInt(form.planta) : null,
      edificio: form.edificio,
      tipo: form.tipo,
      capacidad_maxima: CAPACITY_BY_TYPE[form.tipo] ?? 1,
    };

    try {
      for (let i = 0; i < form.unidades; i++) {
        const numero = form.unidades > 1 ? `${prefix}${base + i}` : form.numero;
        await saveOneBedroom({ ...payloadBase, numero });
      }
      toast.success(isEditing ? "Habitación actualizada." : "Habitación(es) creada(s).");
      setIsModalOpen(false);
      fetchRooms();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al guardar la habitación.";
      setErrors((prev) => ({ ...prev, general: message }));
      toast.error(message);
    }
  };

  const openCreate = () => {
    setForm({ numero: "", edificio: "", planta: "", tipo: "Individual", unidades: 1 });
    setErrors({});
    setIsEditing(false);
    setIsModalOpen(true);
  };

  const openEdit = (room: Bedroom) => {
    setEditingId(room.id);
    setForm({
      numero: room.numero,
      edificio: room.edificio,
      planta: room.planta == null ? "" : String(room.planta),
      tipo: room.tipo,
      unidades: 1,
    });
    setErrors({});
    setIsEditing(true);
    setIsModalOpen(true);
  };

  const handleDelete = async (room: Bedroom) => {
    if (!confirm("¿Eliminar habitación?")) return;
    try {
      const res = await deleteBedroom(room.id);
      if (res.ok) {
        toast.success("Habitación eliminada correctamente.");
        setSelectedRoom(null);
        fetchRooms();
      } else {
        const body = await res.json().catch(() => ({}));
        const detail = (body as { detail?: string }).detail;
        if (res.status === 409) toast.error(detail || "No se puede eliminar: tiene residentes asignados.");
        else if (res.status === 404) toast.error("La habitación no existe.");
        else toast.error(detail || `Error ${res.status} al eliminar la habitación.`);
      }
    } catch {
      toast.error("Error de conexión al eliminar la habitación.");
    }
  };

  if (loading) return <div className="p-10">Cargando...</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <img src={roomSvg} alt="Rooms" className="w-12 h-12" />
          <div>
            <h1 className="text-3xl font-bold">Habitaciones</h1>
            <p className="text-muted-foreground">Gestiona las habitaciones</p>
          </div>
        </div>
        <Button onClick={openCreate}>
          <Plus className="w-4 h-4 mr-2" />Nueva habitación
        </Button>
      </div>

      {/* Stats */}
      <div className="grid sm:grid-cols-3 gap-4">
        <Stat title="Total" value={stats.total} />
        <Stat title="Ocupadas" value={stats.ocupadas} />
        <Stat title="Libres" value={stats.libres} />
      </div>

      {/* Toggle Lista / Mapa */}
      <div className="flex items-center justify-center gap-1 bg-gray-100 p-1 rounded-lg">
        <button type="button" aria-pressed={viewLayout === "list"} onClick={() => setViewLayout("list")} className={`flex items-center gap-1.5 px-4 py-1.5 rounded text-sm font-medium transition-all ${viewLayout === "list" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
          <List className="w-4 h-4" />Lista
        </button>
        <button type="button" aria-pressed={viewLayout === "map"} onClick={() => setViewLayout("map")} className={`flex items-center gap-1.5 px-4 py-1.5 rounded text-sm font-medium transition-all ${viewLayout === "map" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
          <Grid3x3 className="w-4 h-4" />Mapa
        </button>
      </div>

      {/* Buscador */}
      <Card>
        <CardContent className="flex flex-col gap-3 p-4 lg:flex-row">
          <div className="flex items-center gap-2 w-full rounded-xl border border-slate-200 bg-white px-3 shadow-sm">
            <SearchIcon className="w-4 h-4 text-slate-400" />
            <Input
              placeholder="Buscar por número..."
              value={search}
              onChange={(e) => setSearch((e.target as HTMLInputElement).value)}
              className="flex-1 border-0 shadow-none focus-visible:ring-0"
            />
          </div>

          <Select1 value={filterEdificio} onValueChange={setFilterEdificio}>
            <SelectTrigger className="h-11 min-w-[220px] rounded-xl border-slate-200 bg-white/95 px-3 shadow-sm transition-all hover:border-emerald-300 hover:shadow-md focus:ring-2 focus:ring-emerald-200 data-[state=open]:border-emerald-400 data-[state=open]:ring-emerald-100">
              <span className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-emerald-100 bg-emerald-50 text-emerald-700">
                  <Building2 className="h-4 w-4" />
                </span>
                <SelectValue placeholder="Todos los edificios" />
              </span>
            </SelectTrigger>
            <SelectContent className="rounded-2xl border-slate-200 bg-white/95 p-2 shadow-xl backdrop-blur">
              <SelectItem className="rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 focus:bg-emerald-50 focus:text-emerald-800" value="todos">Todos los edificios</SelectItem>
              {buildingOptions.map((building) => (
                <SelectItem key={building} value={building} className="rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 focus:bg-emerald-50 focus:text-emerald-800">
                  {building}
                </SelectItem>
              ))}
            </SelectContent>
          </Select1>

          <Select1 value={filterTipo} onValueChange={setFilterTipo}>
            <SelectTrigger className="h-11 min-w-[220px] rounded-xl border-slate-200 bg-white/95 px-3 shadow-sm transition-all hover:border-emerald-300 hover:shadow-md focus:ring-2 focus:ring-emerald-200 data-[state=open]:border-emerald-400 data-[state=open]:ring-emerald-100">
              <span className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-emerald-100 bg-emerald-50 text-emerald-700">
                  <User className="h-4 w-4" />
                </span>
                <SelectValue placeholder="Todos los tipos" />
              </span>
            </SelectTrigger>
            <SelectContent className="rounded-2xl border-slate-200 bg-white/95 p-2 shadow-xl backdrop-blur">
              <SelectItem className="rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 focus:bg-emerald-50 focus:text-emerald-800" value="todos">Todos los tipos</SelectItem>
              <SelectItem className="rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 focus:bg-emerald-50 focus:text-emerald-800" value="Individual">Individual</SelectItem>
              <SelectItem className="rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 focus:bg-emerald-50 focus:text-emerald-800" value="Doble">Doble</SelectItem>
              <SelectItem className="rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 focus:bg-emerald-50 focus:text-emerald-800" value="Triple">Triple</SelectItem>
            </SelectContent>
          </Select1>
        </CardContent>
      </Card>

      {/* Lista */}
      {viewLayout === "list" && (
        <div className="grid gap-4">
          {filteredRooms.map((r) => (
            <Card
              key={r.id}
              className={`hover:shadow-md transition cursor-pointer ${!r.is_active ? 'border-destructive/30 bg-destructive/5' : 'bg-card'}`}
              onClick={() => setSelectedRoom(r)}
            >
              <CardContent className="flex justify-between items-start gap-4 p-4">
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Bed className="w-5 h-5 text-muted-foreground" /> {r.numero}-{r.edificio}
                  </h3>
                  <p className="text-sm text-muted-foreground">Planta {r.planta ?? "-"} · {r.tipo} · {r.ocupantes_actuales}/{r.capacidad_maxima} ocupantes</p>
                  <div className="mt-2 flex items-start gap-2 min-w-0">
                    <Users className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                    <ResidentsInlineList residents={r.residentes} />
                  </div>
                </div>
                <div className="flex gap-3 items-center shrink-0">
                  <Badge variant={r.ocupantes_actuales > 0 ? "default" : "secondary"}>
                    {r.ocupantes_actuales >= r.capacidad_maxima
                      ? "Completa"
                      : r.ocupantes_actuales > 0
                        ? "Parcial"
                        : "Libre"}
                  </Badge>
                  <Button variant="outline" onClick={(e) => { e.stopPropagation(); setSelectedRoom(r); }}>
                    Ver detalles
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Mapa */}
      {viewLayout === "map" && (
        <div className="space-y-4">
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span className="flex items-center gap-1.5"><span className="w-4 h-4 rounded border-2 border-green-400 bg-green-50 inline-block" />Libre</span>
            <span className="flex items-center gap-1.5"><span className="w-4 h-4 rounded border-2 border-yellow-400 bg-yellow-50 inline-block" />Parcial</span>
            <span className="flex items-center gap-1.5"><span className="w-4 h-4 rounded border-2 border-red-400 bg-red-50 inline-block" />Completa</span>
          </div>
          {Object.entries(roomsByBuildingAndFloor)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([building, floors]) => (
              <motion.div key={building} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <Card className="border border-gray-100 shadow-sm overflow-hidden">
                  <div className="bg-[#509550] text-white px-4 py-2 flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    <span className="font-bold text-sm">Edificio {building}</span>
                  </div>
                  <CardContent className="p-3 space-y-4">
                    {Object.entries(floors)
                      .sort(([a], [b]) => Number.parseInt(b) - Number.parseInt(a))
                      .map(([floor, floorRooms]) => (
                        <FloorRow key={floor} floor={floor} rooms={floorRooms} onSelectRoom={setSelectedRoom} />
                      ))}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
        </div>
      )}

      {/* Detalle habitación */}
      {selectedRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div role="button" tabIndex={-1} aria-label="Cerrar detalle" className="fixed inset-0 bg-black/50" onClick={() => setSelectedRoom(null)} onKeyDown={(e) => { if (e.key === "Escape" || e.key === "Enter") setSelectedRoom(null); }} />
          <div className="relative bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className={`p-2 rounded-xl ${selectedRoom.ocupantes_actuales > 0 ? "bg-red-100" : "bg-green-100"}`}>
                <Bed className={`w-5 h-5 ${selectedRoom.ocupantes_actuales > 0 ? "text-red-600" : "text-green-600"}`} />
              </div>
              <div>
                <h2 className="text-lg font-semibold leading-tight">Habitación {selectedRoom.numero}</h2>
                <p className="text-sm text-muted-foreground">Edificio {selectedRoom.edificio} · Planta {selectedRoom.planta ?? "—"}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 py-2">
              <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                <p className="text-[10px] uppercase tracking-wider text-gray-500 font-bold mb-1">Tipo</p>
                <p className="text-sm font-semibold">{selectedRoom.tipo}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                <p className="text-[10px] uppercase tracking-wider text-gray-500 font-bold mb-1">Ocupación</p>
                <p className="text-sm font-semibold">{selectedRoom.ocupantes_actuales}/{selectedRoom.capacidad_maxima} ocupantes</p>
              </div>
              <div className="col-span-2 bg-gray-50 p-3 rounded-xl border border-gray-100">
                <p className="text-[10px] uppercase tracking-wider text-gray-500 font-bold mb-1">Estado</p>
                <Badge className={getRoomState(selectedRoom.ocupantes_actuales, selectedRoom.capacidad_maxima).badgeClass}>
                  {getRoomState(selectedRoom.ocupantes_actuales, selectedRoom.capacidad_maxima).label}
                </Badge>
              </div>
              <div className="col-span-2 bg-gray-50 p-3 rounded-xl border border-gray-100">
                <p className="text-[10px] uppercase tracking-wider text-gray-500 font-bold mb-2">Residentes</p>
                <ResidentsInlineList residents={selectedRoom.residentes} showEmail />
              </div>
            </div>

            {/* Acciones */}
            <div className="flex gap-2 mt-4">
              <Button
                className="flex-1"
                variant="outline"
                onClick={() => {
                  setSelectedRoom(null);
                  openEdit(selectedRoom);
                }}
              >
                <Edit2 className="w-4 h-4 mr-2" />Editar
              </Button>
              <Button
                className="flex-1"
                variant="destructive"
                onClick={() => handleDelete(selectedRoom)}
              >
                <Trash2 className="w-4 h-4 mr-2" />Eliminar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal crear/editar */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div role="button" tabIndex={-1} aria-label="Cerrar modal" className="fixed inset-0 bg-black/50" onClick={() => setIsModalOpen(false)} onKeyDown={(e) => { if (e.key === "Escape" || e.key === "Enter") setIsModalOpen(false); }} />
          <div className="relative bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4">
              {isEditing ? "Editar habitación" : "Nueva habitación"}
            </h2>
            {errors.general && (
              <div className="bg-destructive/10 text-destructive p-3 rounded-md mb-4">
                {errors.general}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <Label>Número</Label>
                <Input
                  value={form.numero}
                  onChange={(e) => onChange("numero", (e.target as HTMLInputElement).value)}
                />
                {errors.numero && <p className="text-sm text-destructive mt-1">{errors.numero}</p>}
              </div>

              <div>
                <Label>Edificio</Label>
                <Input
                  value={form.edificio}
                  onChange={(e) => onChange("edificio", (e.target as HTMLInputElement).value)}
                />
                {errors.edificio && <p className="text-sm text-destructive mt-1">{errors.edificio}</p>}
              </div>

              <div>
                <Label>Planta</Label>
                <Input
                  value={form.planta}
                  onChange={(e) => onChange("planta", (e.target as HTMLInputElement).value)}
                />
                {errors.planta && <p className="text-sm text-destructive mt-1">{errors.planta}</p>}
              </div>

              <div>
                <Label>Tipo</Label>
                <select
                  value={form.tipo}
                  onChange={(e) => onChange("tipo", e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-all duration-300 hover:bg-green-50 hover:border-green-400"
                >
                  <option value="Individual">Individual</option>
                  <option value="Doble">Doble</option>
                  <option value="Triple">Triple</option>
                </select>
              </div>

              {!isEditing && (
                <div>
                  <Label>Unidades</Label>
                  <Input
                    type="number"
                    value={String(form.unidades)}
                    onChange={(e) => onChange("unidades", Number.parseInt((e.target as HTMLInputElement).value || '1'))}
                  />
                  {errors.unidades && <p className="text-sm text-destructive mt-1">{errors.unidades}</p>}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setIsModalOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" className="flex-1" disabled={Object.values(errors).some((e) => e)}>
                  Guardar
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function groupByBuildingAndFloor(rooms: Bedroom[]): Record<string, Record<number, Bedroom[]>> {
  const organized: Record<string, Record<number, Bedroom[]>> = {};
  for (const room of rooms) {
    const b = room.edificio ?? "—";
    const f = room.planta ?? 0;
    organized[b] ??= {};
    organized[b][f] ??= [];
    organized[b][f].push(room);
  }
  for (const floors of Object.values(organized)) {
    for (const floorRooms of Object.values(floors)) {
      floorRooms.sort((a, b) => a.numero.localeCompare(b.numero));
    }
  }
  return organized;
}

const ROOM_STATES = {
  full:    { label: "Completa", badgeClass: "bg-red-100 text-red-700 border-0",       cellClass: "bg-red-50 border-red-400 hover:bg-red-100",        iconClass: "text-red-500",    textClass: "text-red-700"    },
  partial: { label: "Parcial",  badgeClass: "bg-yellow-100 text-yellow-700 border-0", cellClass: "bg-yellow-50 border-yellow-400 hover:bg-yellow-100", iconClass: "text-yellow-600", textClass: "text-yellow-700" },
  free:    { label: "Libre",    badgeClass: "bg-green-100 text-green-700 border-0",   cellClass: "bg-green-50 border-green-400 hover:bg-green-100",   iconClass: "text-green-600",  textClass: "text-green-700"  },
} as const;

function getRoomState(ocupantes: number, capacidad: number) {
  if (ocupantes >= capacidad) return ROOM_STATES.full;
  if (ocupantes > 0) return ROOM_STATES.partial;
  return ROOM_STATES.free;
}

function FloorRow({ floor, rooms, onSelectRoom }: Readonly<{ floor: string; rooms: Bedroom[]; onSelectRoom: (r: Bedroom) => void }>) {
  const occupied = rooms.filter((r) => r.ocupantes_actuales > 0).length;
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="bg-gray-100 px-2 py-1 rounded text-xs font-bold text-gray-600">
          {Number.parseInt(floor) === 0 ? "Planta baja" : `Planta ${floor}`}
        </div>
        <div className="flex-1 h-px bg-gray-200" />
        <span className="text-[11px] text-gray-400">{occupied}/{rooms.length} ocupadas</span>
      </div>
      <div className="grid grid-cols-5 sm:grid-cols-8 gap-2">
        {rooms.map((room) => (
          <RoomMapCell key={room.id} room={room} onClick={() => onSelectRoom(room)} />
        ))}
      </div>
    </div>
  );
}

function RoomMapCell({ room, onClick }: Readonly<{ room: Bedroom; onClick: () => void }>) {
  const { label, cellClass, iconClass, textClass } = getRoomState(room.ocupantes_actuales, room.capacidad_maxima);
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      aria-label={`Hab. ${room.numero} — ${label}`}
      title={`Hab. ${room.numero} — ${label}`}
      className={`relative aspect-square rounded-lg border-2 flex flex-col items-center justify-center p-1.5 transition-all ${cellClass}`}
    >
      <Bed className={`w-4 h-4 mb-0.5 ${iconClass}`} />
      <span className={`text-[9px] font-bold leading-tight text-center ${textClass}`}>{room.numero}</span>
    </motion.button>
  );
}

interface StatProps { title: string; value: React.ReactNode }
function Stat({ title, value }: Readonly<StatProps>) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}

function ResidentsInlineList({ residents, showEmail = false }: { readonly residents: BedroomResident[]; readonly showEmail?: boolean }) {
  if (residents.length === 0) {
    return <p className="text-sm text-muted-foreground">No hay residentes asignados</p>;
  }
  return (
    <ul className="min-w-0 space-y-0.5">
      {residents.map((resident) => (
        <li key={resident.id} className="min-w-0">
          <p className="text-sm text-foreground truncate" title={resident.full_name}>
            {resident.full_name}
          </p>
          {showEmail && resident.email && (
            <p className="text-xs text-muted-foreground truncate">{resident.email}</p>
          )}
        </li>
      ))}
    </ul>
  );
}

export default Rooms;