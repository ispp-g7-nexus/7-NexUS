import { Plus, RefreshCw, Package } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { objectsService, ObjectItem, ObjectRental } from "../../services/objects";

const OBJECT_NAME_REGEX = /^[\p{L}\p{N} _().,-]+$/u;

function ObjectCard({
  object,
  onDelete,
  onViewRentals,
}: {
  object: ObjectItem;
  onDelete: (object: ObjectItem) => void;
  onViewRentals: (object: ObjectItem) => void;
}) {
  return (
    <article className="rounded-xl border border-border/80 bg-card p-5 shadow-sm flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-base font-semibold text-foreground truncate">{object.name}</h3>
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                object.can_rent
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-slate-200 text-slate-600"
              }`}
            >
              {object.can_rent ? "Disponible" : "No disponible"}
            </span>
          </div>
          {object.description && (
            <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{object.description}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="rounded-lg bg-muted/60 px-3 py-2">
          <p className="text-xs text-muted-foreground">Ubicación</p>
          <p className="font-semibold text-foreground truncate">{object.location || "No especificada"}</p>
        </div>
        <div className="rounded-lg bg-muted/60 px-3 py-2 text-center">
          <p className="text-xs text-muted-foreground">Reservas</p>
          <p className="font-semibold text-foreground">{object.rentals_count}</p>
        </div>
      </div>

      {object.tags && (
        <div className="flex flex-wrap gap-1">
          {object.tags.split(',').map((tag, idx) => (
            <span key={idx} className="rounded-md bg-blue-100 px-2 py-1 text-xs text-blue-700">
              {tag.trim()}
            </span>
          ))}
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        <Button variant="outline" size="sm" onClick={() => onViewRentals(object)}>
          Ver préstamos
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/40"
          onClick={() => onDelete(object)}
        >
          Eliminar
        </Button>
      </div>
    </article>
  );
}

export function AdminObjects() {
  const [objects, setObjects] = useState<ObjectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const objectsRequestIdRef = useRef(0);

  // Create form
  const [formOpen, setFormOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    location: "",
    tags: "",
    image_url: "",
  });

  // Rentals drawer
  const [rentalsOpen, setRentalsOpen] = useState(false);
  const [selectedObject, setSelectedObject] = useState<ObjectItem | null>(null);
  const [rentals, setRentals] = useState<ObjectRental[]>([]);
  const [loadingRentals, setLoadingRentals] = useState(false);
  const getErrorMessage = (err: unknown, fallback: string) =>
    err instanceof Error && err.message ? err.message : fallback;

  const loadObjects = useCallback(async (options?: { silent?: boolean }) => {
    const requestId = ++objectsRequestIdRef.current;
    const silent = options?.silent ?? false;
    if (!silent) {
      setLoading(true);
    }

    try {
      const data = await objectsService.getObjects();
      if (requestId === objectsRequestIdRef.current) {
        setObjects(data);
      }
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Error al cargar objetos"));
    } finally {
      if (!silent && requestId === objectsRequestIdRef.current) {
        setLoading(false);
      }
    }
  }, []);

  const loadRentals = async (objectId: number) => {
    setLoadingRentals(true);
    try {
      const data = await objectsService.getObjectRentals(objectId);
      setRentals(data);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Error al cargar préstamos"));
    } finally {
      setLoadingRentals(false);
    }
  };

  useEffect(() => {
    void loadObjects();
  }, [loadObjects]);

  const handleOpenForm = () => {
    setFormData({ name: "", description: "", location: "", tags: "", image_url: "" });
    setFormOpen(true);
  };

  const handleCloseForm = () => {
    setFormOpen(false);
    setFormData({ name: "", description: "", location: "", tags: "", image_url: "" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = formData.name.trim();
    if (!trimmedName) {
      toast.error("El nombre del objeto es obligatorio");
      return;
    }
    if (!OBJECT_NAME_REGEX.test(trimmedName)) {
      toast.error("El nombre contiene caracteres no válidos");
      return;
    }

    setSubmitting(true);

    try {
      await objectsService.createObject({
        name: trimmedName,
        description: formData.description || undefined,
        location: formData.location || undefined,
        tags: formData.tags || undefined,
        image_url: formData.image_url || undefined,
      });
      toast.success("Objeto creado exitosamente");
      handleCloseForm();
      await loadObjects();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Error al crear objeto"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (object: ObjectItem) => {
    if (!confirm(`¿Estás seguro de eliminar "${object.name}"?`)) return;

    setObjects((prev) => prev.filter((item) => item.id !== object.id));
    if (selectedObject?.id === object.id) {
      setRentalsOpen(false);
      setSelectedObject(null);
      setRentals([]);
    }

    try {
      await objectsService.deleteObject(object.id);
      toast.success("Objeto eliminado");
      await loadObjects({ silent: true });
    } catch (err: unknown) {
      await loadObjects({ silent: true });
      toast.error(getErrorMessage(err, "Error al eliminar objeto"));
    }
  };

  const handleViewRentals = (object: ObjectItem) => {
    setSelectedObject(object);
    setRentalsOpen(true);
    loadRentals(object.id);
  };

  return (
    <section className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <header className="rounded-xl border border-border/80 bg-card p-4 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Gestión de objetos</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Administra los objetos disponibles para préstamo
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => void loadObjects()}
              disabled={loading}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Actualizar
            </Button>
            <Button onClick={handleOpenForm}>
              <Plus className="mr-2 h-4 w-4" />
              Crear objeto
            </Button>
          </div>
        </div>
      </header>

      {loading ? (
        <Card>
          <CardContent className="p-4 text-sm text-muted-foreground">Cargando objetos...</CardContent>
        </Card>
      ) : objects.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-12 text-center">
            <Package className="h-12 w-12 text-muted-foreground mb-3" />
            <h3 className="text-lg font-semibold mb-2">No hay objetos</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Comienza creando el primer objeto disponible para préstamo
            </p>
            <Button onClick={handleOpenForm}>
              <Plus className="mr-2 h-4 w-4" />
              Crear objeto
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {objects.map((object) => (
            <ObjectCard
              key={object.id}
              object={object}
              onDelete={handleDelete}
              onViewRentals={handleViewRentals}
            />
          ))}
        </div>
      )}

      {/* Create Object Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>Crear nuevo objeto</DialogTitle>
              <DialogDescription>
                Añade un nuevo objeto para que los residentes puedan reservarlo
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Nombre *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder="Ej: Bicicleta de montaña"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe el objeto..."
                  rows={3}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="location">Ubicación</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="Ej: Almacén principal"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="tags">Etiquetas (separadas por comas)</Label>
                <Input
                  id="tags"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  placeholder="Ej: deportes, exterior, bicicleta"
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseForm}>
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Creando..." : "Crear objeto"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Rentals Drawer */}
      <Dialog open={rentalsOpen} onOpenChange={setRentalsOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Préstamos de {selectedObject?.name}</DialogTitle>
            <DialogDescription>
              Historial de préstamos activos y pasados
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[400px] overflow-y-auto">
            {loadingRentals ? (
              <p className="text-sm text-muted-foreground p-4">Cargando préstamos...</p>
            ) : rentals.length === 0 ? (
              <p className="text-sm text-muted-foreground p-4 text-center">
                No hay préstamos registrados para este objeto
              </p>
            ) : (
              <div className="space-y-3">
                {rentals.map((rental) => (
                  <div
                    key={rental.id}
                    className="rounded-lg border border-border p-3 text-sm"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-medium">
                          {rental.user.first_name} {rental.user.last_name}
                        </p>
                      </div>
</div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                      <div>
                        <span className="font-medium">Inicio:</span>{" "}
                        {new Date(rental.start_date).toLocaleString("es-ES")}
                      </div>
                      <div>
                        <span className="font-medium">Fin:</span>{" "}
                        {new Date(rental.end_date).toLocaleString("es-ES")}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
