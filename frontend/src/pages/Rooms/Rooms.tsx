import React, { useEffect, useMemo, useState } from "react";
import { listBedrooms, createBedroom, updateBedroom, deleteBedroom, type Bedroom } from "../../services/bedrooms";
import "../../index.css";
import roomSvg from "../../assets/room.svg";
import { Plus, Edit2, Trash2, Search as SearchIcon, Bed, Building2, Grid3x3, List } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Label } from "../../components/ui/label";

export function Rooms() {
  const [rooms, setRooms] = useState<Bedroom[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("todos");
  const [viewLayout, setViewLayout] = useState<"list" | "map">("list");
  const [selectedRoom, setSelectedRoom] = useState<Bedroom | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateField = (name: string, value: any) => {
    let error = "";

    switch (name) {
      case "numero":
        if (!value.trim()) error = "El número es obligatorio";
        else if (value.trim().length > 50)
          error = "Máximo 50 caracteres";
        break;

      case "edificio":
        if (!value.trim()) error = "El edificio es obligatorio";
        else if (value && value.trim().length > 100)
          error = "Máximo 100 caracteres";
        break;

      case "planta":
        if (value) {
          const num = Number.parseInt(value);
          if (isNaN(num)) error = "Debe ser un número";
          else if (num < -5 || num > 200)
            error = "La planta debe estar entre -5 y 200";
        }
        break;

      case "unidades":
        if (!isEditing) {
          const num = Number.parseInt(value);
          if (isNaN(num) || num < 1)
            error = "Debe ser al menos 1";
        }
        break;
    }

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
    return {
      total: rooms.length,
      ocupadas,
      libres: rooms.length - ocupadas,
    };
  }, [rooms]);

  const filteredRooms = useMemo(() => {
    let list = [...rooms];

    if (filter === "ocupadas") list = list.filter((r) => r.ocupantes_actuales > 0);
    if (filter === "libres") list = list.filter((r) => r.ocupantes_actuales === 0);

    if (search)
      list = list.filter((r) =>
        r.numero.toLowerCase().includes(search.toLowerCase())
      );

    return list;
  }, [rooms, search, filter]);

  const roomsByBuildingAndFloor = useMemo(() => {
    const organized: Record<string, Record<number, Bedroom[]>> = {};

    for (const room of filteredRooms) {
      const b = room.edificio ?? "—";
      const f: number = room.planta ?? 0;
      if (!organized[b]) organized[b] = {};
      if (!organized[b][f]) organized[b][f] = [];
      organized[b][f].push(room);
    }

    for (const floors of Object.values(organized)) {
      for (const floorRooms of Object.values(floors)) {
        floorRooms.sort((a, b) => a.numero.localeCompare(b.numero));
      }
    }

    return organized;
  }, [filteredRooms]);

  const onChange = (k: string, v: any) => {
    setForm((prev) => ({ ...prev, [k]: v }));
    validateField(k, v);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const fieldsToValidate = ["numero", "edificio", "planta", "unidades"];
    let valid = true;

    fieldsToValidate.forEach((field) => {
      if (!validateField(field, form[field as keyof typeof form])) {
        valid = false;
      }
    });

    if (!valid) return;

    const base = Number.parseInt(form.numero.replace(/\D/g, "")) || 0;
    const prefix = form.numero.replace(/\d/g, "");

    const payloadBase = {
      planta: form.planta ? Number.parseInt(form.planta) : null,
      edificio: form.edificio,
      tipo: form.tipo,
      capacidad_maxima: form.tipo === "Individual" ? 1 : form.tipo === "Doble" ? 2 : 3,
    };

    try {
      for (let i = 0; i < form.unidades; i++) {
        const numero = form.unidades > 1 ? `${prefix}${base + i}` : form.numero;
        const payload = { ...payloadBase, numero };
        if (isEditing && editingId) {
          const res = await updateBedroom(editingId, payload);
          if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            throw new Error((body as { detail?: string }).detail || `Error ${res.status}`);
          }
        } else {
          const res = await createBedroom(payload);
          if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            throw new Error((body as { detail?: string }).detail || `Error ${res.status}`);
          }
        }
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
    setForm({
      numero: "",
      edificio: "",
      planta: "",
      tipo: "Individual",
      unidades: 1,
    });
    setErrors({});
    setIsEditing(false);
    setIsModalOpen(true);
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
        <button onClick={() => setViewLayout("list")} className={`flex items-center gap-1.5 px-4 py-1.5 rounded text-sm font-medium transition-all ${viewLayout === "list" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
          <List className="w-4 h-4" />Lista
        </button>
        <button onClick={() => setViewLayout("map")} className={`flex items-center gap-1.5 px-4 py-1.5 rounded text-sm font-medium transition-all ${viewLayout === "map" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
          <Grid3x3 className="w-4 h-4" />Mapa
        </button>
      </div>

      {/* Buscador */}
      <Card>
        <CardContent className="flex gap-3 p-4">
          <div className="flex items-center gap-2 w-full">
            <SearchIcon className="w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por número..."
              value={search}
              onChange={(e) => setSearch((e.target as HTMLInputElement).value)}
              className="flex-1"
            />
          </div>

          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-[180px] h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="todos">Todos</option>
            <option value="ocupadas">Ocupadas</option>
            <option value="libres">Libres</option>
          </select>
        </CardContent>
      </Card>

      {/* Lista */}
      {viewLayout === "list" && (
        <div className="grid gap-4">
          {filteredRooms.map((r) => (
            <Card
              key={r.id}
              className={`hover:shadow-md transition ${r.ocupantes_actuales > 0 ? 'border-destructive/30 bg-destructive/5' : 'bg-card'}`}
            >
              <CardContent className="flex justify-between items-center p-4">
                <div>
                  <h3 className="font-semibold flex items-center gap-2">
                    <Bed className="w-5 h-5 text-muted-foreground" /> {r.numero}-{r.edificio}
                  </h3>
                  <p className="text-sm text-muted-foreground">Planta {r.planta ?? "-"} · {r.tipo} · {r.ocupantes_actuales}/{r.capacidad_maxima} ocupantes</p>
                </div>

                <div className="flex gap-3 items-center">
                  <Badge variant={r.ocupantes_actuales > 0 ? "default" : "secondary"}>
                    {r.ocupantes_actuales >= r.capacidad_maxima
                      ? "Completa"
                      : r.ocupantes_actuales > 0
                        ? "Parcial"
                        : "Libre"}
                  </Badge>

                  <Button
                    variant="outline"
                    onClick={() => {
                      setEditingId(r.id);
                      setForm({
                        numero: r.numero,
                        edificio: r.edificio,
                        planta: r.planta != null ? String(r.planta) : "",
                        tipo: r.tipo,
                        unidades: 1,
                      });
                      setErrors({});
                      setIsEditing(true);
                      setIsModalOpen(true);
                    }}
                  >
                    <Edit2 className="w-4 h-4 mr-2" />Editar
                  </Button>

                  <Button
                    variant="destructive"
                    onClick={async () => {
                      if (!confirm("¿Eliminar habitación?")) return;
                      try {
                        const res = await deleteBedroom(r.id);
                        if (res.ok) {
                          toast.success("Habitación eliminada correctamente.");
                          fetchRooms();
                        } else {
                          const body = await res.json().catch(() => ({}));
                          const detail = (body as { detail?: string }).detail;
                          if (res.status === 409) {
                            toast.error(detail || "No se puede eliminar: tiene residentes asignados.");
                          } else if (res.status === 404) {
                            toast.error("La habitación no existe.");
                          } else {
                            toast.error(detail || `Error ${res.status} al eliminar la habitación.`);
                          }
                        }
                      } catch (err) {
                        console.error(err);
                        toast.error("Error de conexión al eliminar la habitación.");
                      }
                    }}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />Eliminar
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
                        <div key={floor} className="space-y-2">
                          <div className="flex items-center gap-2">
                            <div className="bg-gray-100 px-2 py-1 rounded text-xs font-bold text-gray-600">
                              {Number.parseInt(floor) === 0 ? "Planta baja" : `Planta ${floor}`}
                            </div>
                            <div className="flex-1 h-px bg-gray-200" />
                            <span className="text-[11px] text-gray-400">{floorRooms.filter((r) => r.ocupantes_actuales > 0).length}/{floorRooms.length} ocupadas</span>
                          </div>
                          <div className="grid grid-cols-5 sm:grid-cols-8 gap-2">
                            {floorRooms.map((room) => (
                              <RoomMapCell key={room.id} room={room} onClick={() => setSelectedRoom(room)} />
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

      {/* Detalle habitación (mapa) */}
      {selectedRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50" onClick={() => setSelectedRoom(null)} />
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
                <Badge className={
                  selectedRoom.ocupantes_actuales >= selectedRoom.capacidad_maxima
                    ? "bg-red-100 text-red-700 border-0"
                    : selectedRoom.ocupantes_actuales > 0
                      ? "bg-yellow-100 text-yellow-700 border-0"
                      : "bg-green-100 text-green-700 border-0"
                }>
                  {selectedRoom.ocupantes_actuales >= selectedRoom.capacidad_maxima
                    ? "Completa"
                    : selectedRoom.ocupantes_actuales > 0
                      ? "Parcial"
                      : "Libre"}
                </Badge>
              </div>
            </div>
            <Button className="w-full mt-4" variant="outline" onClick={() => {
              setSelectedRoom(null);
              setEditingId(selectedRoom.id);
              setForm({
                numero: selectedRoom.numero,
                edificio: selectedRoom.edificio,
                planta: selectedRoom.planta != null ? String(selectedRoom.planta) : "",
                tipo: selectedRoom.tipo,
                unidades: 1,
              });
              setErrors({});
              setIsEditing(true);
              setIsModalOpen(true);
            }}>
              <Edit2 className="w-4 h-4 mr-2" />Editar habitación
            </Button>
          </div>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4">
              {isEditing ? "Editar habitación" : "Nueva habitación"}
            </h2>
            {errors.general && (
              <div className="bg-destructive/10 text-destructive p-3 rounded-md">
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
                {errors.numero && (
                  <p className="text-sm text-destructive mt-1">{errors.numero}</p>
                )}
              </div>

              <div>
                <Label>Edificio</Label>
                <Input
                  value={form.edificio}
                  onChange={(e) => onChange("edificio", (e.target as HTMLInputElement).value)}
                />
                {errors.edificio && (
                  <p className="text-sm text-destructive mt-1">{errors.edificio}</p>
                )}
              </div>

              <div>
                <Label>Planta</Label>
                <Input
                  value={form.planta}
                  onChange={(e) => onChange("planta", (e.target as HTMLInputElement).value)}
                />
                {errors.planta && (
                  <p className="text-sm text-destructive mt-1">{errors.planta}</p>
                )}
              </div>

              <div>
                <Label>Tipo</Label>
                <select
                  value={form.tipo}
                  onChange={(e) => onChange("tipo", e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
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
                  {errors.unidades && (
                    <p className="text-sm text-destructive mt-1">{errors.unidades}</p>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={Object.values(errors).some((e) => e)}
                >
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

function RoomMapCell({ room, onClick }: { room: Bedroom; onClick: () => void }) {
  const isFull = room.ocupantes_actuales >= room.capacidad_maxima;
  const isPartial = room.ocupantes_actuales > 0 && !isFull;
  const label = isFull ? "Completa" : isPartial ? "Parcial" : "Libre";
  const cellClass = isFull
    ? "bg-red-50 border-red-400 hover:bg-red-100"
    : isPartial
      ? "bg-yellow-50 border-yellow-400 hover:bg-yellow-100"
      : "bg-green-50 border-green-400 hover:bg-green-100";
  const iconClass = isFull ? "text-red-500" : isPartial ? "text-yellow-600" : "text-green-600";
  const textClass = isFull ? "text-red-700" : isPartial ? "text-yellow-700" : "text-green-700";

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

function Stat({ title, value }: any) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}

export default Rooms;
