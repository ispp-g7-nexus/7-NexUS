import React, { useEffect, useMemo, useState } from "react";
import { listBedrooms, createBedroom, updateBedroom, deleteBedroom } from "../../services/bedrooms";
import "../../index.css";
import roomSvg from "../../assets/room.svg";
import { Plus, Edit2, Trash2, Search as SearchIcon, Bed } from "lucide-react";

import { Input } from "../../components/ui/input";
import {
  Select1,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { Button } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../../components/ui/dialog";
import { Label } from "../../components/ui/label";

export function Rooms() {
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("todos");

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
        const num = parseInt(value);
        if (isNaN(num)) error = "Debe ser un número";
        else if (num < -5 || num > 200)
          error = "La planta debe estar entre -5 y 200";
      }
      break;

    case "unidades":
      if (!isEditing) {
        const num = parseInt(value);
        if (isNaN(num) || num < 1)
          error = "Debe ser al menos 1";
      }
      break;
    }

    setErrors((prev) => ({
        ...prev,
        [name]: error,
    }));

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

  const fetchRooms = async () => {
    setLoading(true);
    try {
      const res = await listBedrooms();
      const data = await res.json();
      setRooms(data);
    } finally {
      setLoading(false);
    }
  };

  const stats = useMemo(() => {
    const ocupadas = rooms.filter((r) => !r.is_active).length;
    return {
      total: rooms.length,
      ocupadas,
      libres: rooms.length - ocupadas,
    };
  }, [rooms]);

  const filteredRooms = useMemo(() => {
    let list = [...rooms];

    if (filter === "ocupadas") list = list.filter((r) => !r.is_active);
    if (filter === "libres") list = list.filter((r) => r.is_active);

    if (search)
      list = list.filter((r) =>
        r.numero.toLowerCase().includes(search.toLowerCase())
      );

    return list;
  }, [rooms, search, filter]);

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

    const base = parseInt(form.numero.replace(/\D/g, "")) || 0;
    const prefix = form.numero.replace(/\d/g, "");

    const payloadBase = {
      planta: form.planta ? parseInt(form.planta) : null,
      edificio: form.edificio,
      tipo: form.tipo,
      capacidad_maxima: form.tipo === "Individual" ? 1 : form.tipo === "Doble" ? 2 : 3,
    };

    for (let i = 0; i < form.unidades; i++) {
      const numero =
        form.unidades > 1 ? `${prefix}${base + i}` : form.numero;

      const payload = { ...payloadBase, numero };

      if (isEditing && editingId) {
        await updateBedroom(editingId, payload);
      } else {
        await createBedroom(payload);
      }
    }

    setIsModalOpen(false);
    fetchRooms();
  };

  const openCreate = () => {
    setForm({
      numero: "",
      edificio: "",
      planta: "",
      tipo: "Individual",
      unidades: 1,
    });
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

          <Select1 value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filtro" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="ocupadas">Ocupadas</SelectItem>
              <SelectItem value="libres">Libres</SelectItem>
            </SelectContent>
          </Select1>
        </CardContent>
      </Card>

      {/* Lista */}
      <div className="grid gap-4">
        {filteredRooms.map((r) => (
          <Card
            key={r.id}
            className={`hover:shadow-md transition ${!r.is_active ? 'border-destructive/30 bg-destructive/5' : 'bg-card'} `}
          >
            <CardContent className="flex justify-between items-center p-4">
              <div>
                <h3 className="font-semibold flex items-center gap-2">
                  <Bed className="w-5 h-5 text-muted-foreground" /> {r.numero}-{r.edificio}{console.log(r)}
                </h3>
                <p className="text-sm text-muted-foreground">Planta {r.planta ?? "-"} · {r.tipo}</p>
              </div>

              <div className="flex gap-3 items-center">
                <Badge variant={!r.is_active ? "default" : "secondary"}>{!r.is_active ? "Ocupada" : "Libre"}</Badge>

                <Button
                  variant="outline"
                  onClick={() => {
                    setEditingId(r.id);
                    setForm({
                      numero: r.numero,
                      edificio: r.edificio,
                      planta: r.planta,
                      tipo: r.tipo,
                      unidades: 1,
                    });
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
                      await deleteBedroom(r.id);
                      fetchRooms();
                    } catch (err) {
                      console.error(err);
                      alert("Error al eliminar");
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

      {/* Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isEditing ? "Editar habitación" : "Nueva habitación"}
            </DialogTitle>
          </DialogHeader>
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
                    <p className="text-sm text-destructive mt-1">
                    {errors.numero}
                    </p>
                )}
            </div>

            <div>
              <Label>Edificio</Label>
                <Input
                  value={form.edificio}
                  onChange={(e) => onChange("edificio", (e.target as HTMLInputElement).value)}
                />
                {errors.edificio && (
                    <p className="text-sm text-destructive mt-1">
                    {errors.edificio}
                    </p>
                )}
            </div>

            <div>
              <Label>Planta</Label>
              <Input
                value={form.planta}
                onChange={(e) => onChange("planta", (e.target as HTMLInputElement).value)}
              />
                {errors.planta && (
                    <p className="text-sm text-destructive mt-1">
                    {errors.planta}
                    </p>
                )}
            </div>

            <div>
              <Label>Tipo</Label>
              <Select1
                value={form.tipo}
                onValueChange={(v) => onChange("tipo", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Individual">Individual</SelectItem>
                  <SelectItem value="Doble">Doble</SelectItem>
                  <SelectItem value="Triple">Triple</SelectItem>
                </SelectContent>
              </Select1>
            </div>

            {!isEditing && (
              <div>
                <Label>Unidades</Label>
                <Input
                  type="number"
                  value={String(form.unidades)}
                  onChange={(e) => onChange("unidades", parseInt((e.target as HTMLInputElement).value || '1'))}
                />
                {errors.unidades && (
                    <p className="text-sm text-destructive mt-1">
                    {errors.unidades}
                    </p>
                )}
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={Object.values(errors).some((e) => e)}
              >
                Guardar
            </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
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