import { Plus, RefreshCw, Package, Tag, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "../../components/ui/sheet";
import { objectsService, ObjectItem, ObjectLabelItem, RentalsByStatus } from "../../services/objects";
import { RentalHistoryView } from "../../components/RentalHistoryView";

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
    <article className="rounded-xl border border-border/80 bg-white p-5 shadow-sm flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-base font-semibold text-gray-900 truncate">{object.name}</h3>
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                object.can_rent
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-slate-200 text-gray-500"
              }`}
            >
              {object.can_rent ? "Disponible" : "No disponible"}
            </span>
          </div>
          {object.description && (
            <p className="mt-1 text-sm text-gray-500 line-clamp-2">{object.description}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-sm">
        <div className="rounded-lg bg-muted/60 px-3 py-2">
          <p className="text-xs text-gray-500">Ubicación</p>
          <p className="font-semibold text-gray-900 truncate">{object.location || "No especificada"}</p>
        </div>
        <div className="rounded-lg bg-muted/60 px-3 py-2 text-center">
          <p className="text-xs text-gray-500">Stock total</p>
          <p className="font-semibold text-gray-900">{object.stock_total}</p>
        </div>
        <div className="rounded-lg bg-muted/60 px-3 py-2 text-center">
          <p className="text-xs text-gray-500">Stock asignado ahora</p>
          <p className="font-semibold text-gray-900">{object.current_reserved_stock}</p>
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
  const [labels, setLabels] = useState<ObjectLabelItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingLabels, setLoadingLabels] = useState(true);
  const [isLabelsOpen, setIsLabelsOpen] = useState(false);
  const [newLabelName, setNewLabelName] = useState("");
  const [creatingLabel, setCreatingLabel] = useState(false);
  const [deletingLabelIds, setDeletingLabelIds] = useState<number[]>([]);
  const objectsRequestIdRef = useRef(0);

  // Create form
  const [formOpen, setFormOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    location: "",
    stock_total: "1",
    label_ids: [] as number[],
    image_url: "",
  });

  // Rentals drawer
  const [rentalsOpen, setRentalsOpen] = useState(false);
  const [selectedObject, setSelectedObject] = useState<ObjectItem | null>(null);
  const [rentalsByStatus, setRentalsByStatus] = useState<RentalsByStatus>({
    active: [],
    cancelled: [],
    completed: [],
  });
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
      setRentalsByStatus(data);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Error al cargar préstamos"));
    } finally {
      setLoadingRentals(false);
    }
  };

  const loadLabels = useCallback(async () => {
    setLoadingLabels(true);
    try {
      const data = await objectsService.listLabels();
      setLabels(data);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Error al cargar etiquetas de objetos"));
    } finally {
      setLoadingLabels(false);
    }
  }, []);

  useEffect(() => {
    void loadObjects();
  }, [loadObjects]);

  useEffect(() => {
    void loadLabels();
  }, [loadLabels]);

  const handleOpenForm = () => {
    setFormData({ name: "", description: "", location: "", stock_total: "1", label_ids: [], image_url: "" });
    setFormOpen(true);
  };

  const handleCloseForm = () => {
    setFormOpen(false);
    setFormData({ name: "", description: "", location: "", stock_total: "1", label_ids: [], image_url: "" });
  };

  const toggleLabelSelection = (labelId: number) => {
    setFormData((prev) => {
      const isSelected = prev.label_ids.includes(labelId);
      return {
        ...prev,
        label_ids: isSelected ? prev.label_ids.filter((id) => id !== labelId) : [...prev.label_ids, labelId],
      };
    });
  };

  const handleCreateLabel = async () => {
    const trimmed = newLabelName.trim();
    if (!trimmed) {
      toast.error("El nombre de la etiqueta es obligatorio");
      return;
    }

    setCreatingLabel(true);
    try {
      const created = await objectsService.createLabel(trimmed);
      setLabels((prev) => [...prev, created]);
      setNewLabelName("");
      toast.success(`Etiqueta "${trimmed}" creada.`);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Error al crear etiqueta"));
    } finally {
      setCreatingLabel(false);
    }
  };

  const handleDeleteLabel = async (label: ObjectLabelItem) => {
    if (deletingLabelIds.includes(label.id)) {
      return;
    }

    setDeletingLabelIds((prev) => [...prev, label.id]);
    try {
      await objectsService.deleteLabel(label.id);
      setLabels((prev) => prev.filter((item) => item.id !== label.id));
      setFormData((prev) => ({
        ...prev,
        label_ids: prev.label_ids.filter((id) => id !== label.id),
      }));
      toast.success("Etiqueta eliminada.");
    } catch (err: unknown) {
      const message = getErrorMessage(err, "Error al eliminar etiqueta");
      if (message.includes("Etiqueta no encontrada")) {
        setLabels((prev) => prev.filter((item) => item.id !== label.id));
        setFormData((prev) => ({
          ...prev,
          label_ids: prev.label_ids.filter((id) => id !== label.id),
        }));
        toast.success("Etiqueta eliminada.");
      } else {
        toast.error(message);
      }
    } finally {
      setDeletingLabelIds((prev) => prev.filter((id) => id !== label.id));
    }
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
        stock_total: Number.parseInt(formData.stock_total, 10) || 1,
        label_ids: formData.label_ids,
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
      setRentalsByStatus({ active: [], cancelled: [], completed: [] });
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
      <header className="rounded-xl border border-border/80 bg-white p-4 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Gestión de objetos</h2>
            <p className="mt-1 text-sm text-gray-500">
              Administra los objetos disponibles para préstamo
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsLabelsOpen(true)}
            >
              <Tag className="mr-2 h-4 w-4" />
              Gestionar etiquetas
            </Button>
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
          <CardContent className="p-4 text-sm text-gray-500">Cargando objetos...</CardContent>
        </Card>
      ) : objects.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-12 text-center">
            <Package className="h-12 w-12 text-gray-500 mb-3" />
            <h3 className="text-lg font-semibold mb-2">No hay objetos</h3>
            <p className="text-sm text-gray-500 mb-4">
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
                <Label htmlFor="stock_total">Stock total *</Label>
                <Input
                  id="stock_total"
                  type="number"
                  min={1}
                  step={1}
                  value={formData.stock_total}
                  onChange={(e) => setFormData({ ...formData, stock_total: e.target.value })}
                  required
                  placeholder="Ej: 10"
                />
              </div>

              <div className="grid gap-2">
                <Label>Etiquetas</Label>
                {loadingLabels ? (
                  <p className="text-sm text-gray-500">Cargando etiquetas...</p>
                ) : labels.length === 0 ? (
                  <p className="text-sm text-gray-500">No hay etiquetas disponibles. Crea una en el panel de gestion.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {labels.map((label) => {
                      const selected = formData.label_ids.includes(label.id);
                      return (
                        <button
                          key={label.id}
                          type="button"
                          onClick={() => toggleLabelSelection(label.id)}
                          className={`rounded-md border px-2 py-1 text-xs font-medium transition-colors ${
                            selected
                              ? "border-green-700 bg-green-700 text-white"
                              : "border-border bg-background text-gray-700 hover:border-green-700 hover:text-green-700"
                          }`}
                        >
                          {label.name}
                        </button>
                      );
                    })}
                  </div>
                )}
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

      {/* Rentals Sheet */}
      <Sheet open={rentalsOpen} onOpenChange={setRentalsOpen}>
        <SheetContent className="w-full sm:max-w-2xl">
          <SheetHeader className="mb-6">
            <SheetTitle>Historial de Reservas</SheetTitle>
            <SheetDescription>
              {selectedObject?.name}
            </SheetDescription>
          </SheetHeader>
          <div className="overflow-y-auto max-h-[calc(100vh-120px)]">
            <RentalHistoryView 
              rentalsByStatus={rentalsByStatus} 
              loading={loadingRentals} 
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* Dialog: Gestionar etiquetas */}
      <Dialog open={isLabelsOpen} onOpenChange={setIsLabelsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gestionar etiquetas</DialogTitle>
            <DialogDescription>
              Crea o elimina etiquetas personalizadas. Estarán disponibles al crear un objeto.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Input
                value={newLabelName}
                onChange={(e) => setNewLabelName(e.target.value)}
                placeholder="Nombre de la etiqueta..."
                className="flex-1"
                maxLength={30}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void handleCreateLabel();
                  }
                }}
              />
              <Button
                className="bg-primary text-primary-foreground hover:bg-primary/90"
                onClick={() => void handleCreateLabel()}
                disabled={creatingLabel || !newLabelName.trim()}
              >
                <Plus className="w-4 h-4 mr-1" />
                Añadir
              </Button>
            </div>

            {loadingLabels ? (
              <p className="text-sm text-gray-500">Cargando etiquetas...</p>
            ) : labels.length === 0 ? (
              <p className="text-sm text-gray-500">No hay etiquetas personalizadas.</p>
            ) : (
              <>
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Personalizadas</div>
                <div className="flex flex-wrap gap-2">
                  {labels.map((label) => (
                    <span
                      key={label.id}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium bg-primary/10 text-primary"
                    >
                      <Tag className="w-3 h-3" /> {label.name}
                      <button
                        type="button"
                        onClick={() => void handleDeleteLabel(label)}
                        className="ml-1 hover:text-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Eliminar etiqueta"
                        disabled={deletingLabelIds.includes(label.id)}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsLabelsOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
