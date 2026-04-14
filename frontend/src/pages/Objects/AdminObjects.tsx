import { Eye, Filter, Plus, RefreshCw, Package, Search, Tag, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "../../components/ui/sheet";
import { objectsService, AdminObjectRental, ObjectItem, ObjectLabelItem, RentalsByStatus } from "../../services/objects";
import { RentalHistoryView } from "../../components/RentalHistoryView";

const OBJECT_NAME_REGEX = /^[\p{L}\p{N} _().,-]+$/u;
const ADMIN_CANCELLATION_REASON_MAX_LENGTH = 200;
const OBJECT_NAME_MAX_LENGTH = 30;
const OBJECT_DESCRIPTION_MAX_LENGTH = 255;
const OBJECT_LOCATION_MAX_LENGTH = 100;
const OBJECT_IMAGE_URL_MAX_LENGTH = 300;
const OBJECT_LABEL_MAX_LENGTH = 15;
type GlobalStatusFilter = "ALL" | "ACTIVE" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";

function filterGlobalRentals(
  rentals: AdminObjectRental[],
  search: string,
  statusFilter: GlobalStatusFilter,
  onlyOverdue: boolean,
  dateFilter: string,
): AdminObjectRental[] {
  const query = search.trim().toLowerCase();

  return rentals.filter((rental) => {
    const fields = [
      rental.object.name,
      rental.object.location ?? "",
      `${rental.user.first_name ?? ""} ${rental.user.last_name ?? ""}`,
      getGlobalRentalStatusLabel(rental),
    ];

    const matchesQuery = !query || fields.some((field) => field.toLowerCase().includes(query));
    const matchesStatus = statusFilter === "ALL" || getGlobalEffectiveStatus(rental) === statusFilter;
    const matchesOverdue = !onlyOverdue || isGlobalRentalOverdue(rental);
    const matchesDate = !dateFilter || rental.start_date.slice(0, 10) === dateFilter || rental.end_date.slice(0, 10) === dateFilter;

    return matchesQuery && matchesStatus && matchesOverdue && matchesDate;
  });
}

function countGlobalRentals(rentals: AdminObjectRental[]) {
  return {
    total: rentals.length,
    active: rentals.filter((r) => getGlobalEffectiveStatus(r) === "ACTIVE").length,
    inProgress: rentals.filter((r) => getGlobalEffectiveStatus(r) === "IN_PROGRESS").length,
    completed: rentals.filter((r) => getGlobalEffectiveStatus(r) === "COMPLETED").length,
    cancelled: rentals.filter((r) => r.status === "CANCELLED").length,
  };

function isValidHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function formatDateTime(date: string): string {
  return new Intl.DateTimeFormat("es-ES", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));
}

function getGlobalRentalStatusLabel(rental: AdminObjectRental): string {
  const overdueInProgress = rental.status === "IN_PROGRESS" && new Date(rental.end_date).getTime() <= Date.now();
  if (overdueInProgress) return "Con retraso";
  if (rental.status === "ACTIVE") return "Reservada";
  if (rental.status === "IN_PROGRESS") return "En curso";
  if (rental.status === "COMPLETED") return rental.is_overdue ? "Finalizada con retraso" : "Finalizada";
  if (rental.status === "CANCELLED") return "Cancelada";
  return rental.status;
}

function getGlobalRentalStatusTone(rental: AdminObjectRental): string {
  const overdueInProgress = rental.status === "IN_PROGRESS" && new Date(rental.end_date).getTime() <= Date.now();
  if (overdueInProgress) return "bg-red-100 text-red-700 border-red-200";
  if (rental.status === "ACTIVE") return "bg-blue-100 text-blue-700 border-blue-200";
  if (rental.status === "IN_PROGRESS") return "bg-amber-100 text-amber-800 border-amber-200";
  if (rental.status === "COMPLETED") {
    return rental.is_overdue ? "bg-red-100 text-red-700 border-red-200" : "bg-emerald-100 text-emerald-700 border-emerald-200";
  }
  if (rental.status === "CANCELLED") return "bg-slate-100 text-slate-700 border-slate-200";
  return "bg-slate-100 text-slate-700 border-slate-200";
}

function getGlobalEffectiveStatus(rental: AdminObjectRental): "ACTIVE" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED" {
  if (rental.status === "CANCELLED") {
    return "CANCELLED";
  }

  if (rental.status === "COMPLETED") {
    return "COMPLETED";
  }

  if (rental.status === "IN_PROGRESS" && new Date(rental.end_date).getTime() <= Date.now()) {
    return "COMPLETED";
  }

  return rental.status;
}

function isGlobalRentalOverdue(rental: AdminObjectRental): boolean {
  const overdueInProgress = rental.status === "IN_PROGRESS" && new Date(rental.end_date).getTime() <= Date.now();
  return overdueInProgress || (rental.status === "COMPLETED" && Boolean(rental.is_overdue));
}

function GlobalRentalHistory({
  rentals,
  loading,
  onRefresh,
  onMarkReturned,
  onCancelRental,
}: {
  rentals: AdminObjectRental[];
  loading: boolean;
  onRefresh: () => void;
  onMarkReturned: (objectId: number, rentalId: number) => Promise<void>;
  onCancelRental: (objectId: number, rentalId: number, reason: string) => Promise<void>;
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<GlobalStatusFilter>("ALL");
  const [onlyOverdue, setOnlyOverdue] = useState(false);
  const [dateFilter, setDateFilter] = useState("");
  const [cancelTarget, setCancelTarget] = useState<AdminObjectRental | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelError, setCancelError] = useState("");
  const [isCancelling, setIsCancelling] = useState(false);

  const filteredRentals = useMemo(
    () => filterGlobalRentals(rentals, search, statusFilter, onlyOverdue, dateFilter),
    [rentals, search, statusFilter, onlyOverdue, dateFilter],
  );

  const counts = useMemo(() => countGlobalRentals(rentals), [rentals]);

  const handleCancelSubmit = async () => {
    if (!cancelTarget) {
      return;
    }

    const reason = cancelReason.trim();
    if (!reason) {
      setCancelError("El motivo es requerido");
      return;
    }
    if (reason.length > ADMIN_CANCELLATION_REASON_MAX_LENGTH) {
      setCancelError(`El motivo no puede exceder ${ADMIN_CANCELLATION_REASON_MAX_LENGTH} caracteres`);
      return;
    }

    try {
      setIsCancelling(true);
      setCancelError("");
      await onCancelRental(cancelTarget.object.id, cancelTarget.id, reason);
      setCancelTarget(null);
      setCancelReason("");
    } catch (error) {
      setCancelError(error instanceof Error ? error.message : "Error desconocido");
    } finally {
      setIsCancelling(false);
    }
  };

  const renderRentalCard = (rental: AdminObjectRental) => {
    const titleBadge = getGlobalRentalStatusLabel(rental);
    const badgeTone = getGlobalRentalStatusTone(rental);
    const canMarkReturned = rental.status === "IN_PROGRESS";
    const canCancel = rental.status === "ACTIVE";
    const overdue = isGlobalRentalOverdue(rental);

    return (
      <article key={rental.id} className="rounded-xl border border-border/80 bg-white p-5 shadow-sm min-w-0 overflow-hidden">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-semibold text-gray-900 break-all">{rental.object.name}</h4>
              <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${badgeTone}`}>
                {titleBadge}
              </span>
            </div>
            <p className="mt-1 text-sm text-gray-600 break-all">
              <span className="font-medium">Usuario:</span> {rental.user.first_name} {rental.user.last_name}
            </p>
            {rental.object.location && (
              <p className="text-sm text-gray-500 break-all">
                <span className="font-medium">Ubicación:</span> {rental.object.location}
              </p>
            )}
            <div className="mt-2 space-y-1 text-sm text-gray-600">
              <p>Inicio: {formatDateTime(rental.start_date)}</p>
              <p>Fin: {formatDateTime(rental.end_date)}</p>
            </div>
            {getGlobalEffectiveStatus(rental) === "IN_PROGRESS" && (
              <div className="mt-2 space-y-1 text-sm text-gray-600">
                {rental.remaining_human && (
                  <p>Tiempo restante: {rental.remaining_human}</p>
                )}
                {rental.elapsed_human && (
                  <p>En uso desde hace: {rental.elapsed_human}</p>
                )}
              </div>
            )}
            {overdue && (
              <p className="mt-2 text-sm font-medium text-red-700">
                Retraso: {rental.overdue_human ?? `${rental.overdue_minutes ?? 0} min`}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2 lg:w-48 lg:items-stretch pt-1">
            {canMarkReturned && (
              <Button
                type="button"
                variant="outline"
                onClick={() => void onMarkReturned(rental.object.id, rental.id)}
              >
                Marcar como devuelto
              </Button>
            )}
            {canCancel && (
              <Button
                type="button"
                variant="outline"
                className="text-red-600 hover:text-red-700 border-red-300 hover:bg-red-50"
                onClick={() => {
                  setCancelTarget(rental);
                  setCancelReason("");
                  setCancelError("");
                }}
              >
                Cancelar
              </Button>
            )}
          </div>
        </div>
      </article>
    );
  };

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-border/80 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <Button type="button" variant="outline" onClick={onRefresh} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Actualizar
          </Button>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-lg bg-slate-50 px-3 py-2">
            <p className="text-xs text-gray-500">Total</p>
            <p className="font-semibold text-gray-900">{counts.total}</p>
          </div>
          <div className="rounded-lg bg-blue-50 px-3 py-2">
            <p className="text-xs text-gray-500">Reservadas</p>
            <p className="font-semibold text-blue-700">{counts.active}</p>
          </div>
          <div className="rounded-lg bg-amber-50 px-3 py-2">
            <p className="text-xs text-gray-500">En curso</p>
            <p className="font-semibold text-amber-800">{counts.inProgress}</p>
          </div>
          <div className="rounded-lg bg-emerald-50 px-3 py-2">
            <p className="text-xs text-gray-500">Finalizadas</p>
            <p className="font-semibold text-emerald-700">{counts.completed}</p>
          </div>
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-[1.4fr_1fr_1fr_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por objeto, usuario o estado..."
              className="pl-10"
            />
          </div>

          <div className="relative">
            <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
              className="h-10 w-full rounded-md border border-input bg-background pl-10 pr-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="ALL">Todos los estados</option>
              <option value="ACTIVE">Reservadas</option>
              <option value="IN_PROGRESS">En curso</option>
              <option value="COMPLETED">Finalizadas</option>
              <option value="CANCELLED">Canceladas</option>
            </select>
          </div>

          <Input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
          />

          <Button
            type="button"
            variant={onlyOverdue ? "default" : "outline"}
            onClick={() => setOnlyOverdue((prev) => !prev)}
          >
            Solo con retraso
          </Button>
        </div>
      </div>

      {loading ? (
        <Card>
          <CardContent className="p-4 text-sm text-gray-500">Cargando historial general...</CardContent>
        </Card>
      ) : filteredRentals.length === 0 ? (
        <Card>
          <CardContent className="p-4 text-sm text-gray-500 italic">No hay reservas que coincidan con la búsqueda.</CardContent>
        </Card>
      ) : (
        <div className="space-y-3 px-1 pb-2">{filteredRentals.map(renderRentalCard)}</div>
      )}

      <Dialog open={Boolean(cancelTarget)} onOpenChange={(open) => {
        if (!open) {
          setCancelTarget(null);
          setCancelReason("");
          setCancelError("");
        }
      }}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Cancelar reserva</DialogTitle>
            <DialogDescription>
              {cancelTarget ? `Reserva de ${cancelTarget.object.name}` : ""}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="global-cancel-reason">Motivo *</Label>
            <Textarea
              id="global-cancel-reason"
              value={cancelReason}
              onChange={(e) => {
                setCancelReason(e.target.value);
                setCancelError("");
              }}
              placeholder="Describe el motivo de la cancelación..."
              rows={4}
              maxLength={ADMIN_CANCELLATION_REASON_MAX_LENGTH}
            />
            <p className="text-xs text-gray-500">
              {cancelReason.length}/{ADMIN_CANCELLATION_REASON_MAX_LENGTH} caracteres
            </p>
            {cancelError && (
              <p className="text-sm text-red-600">{cancelError}</p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setCancelTarget(null);
                setCancelReason("");
                setCancelError("");
              }}
              disabled={isCancelling}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              className="bg-red-600 hover:bg-red-700"
              onClick={() => void handleCancelSubmit()}
              disabled={isCancelling || !cancelReason.trim()}
            >
              {isCancelling ? "Cancelando..." : "Confirmar cancelación"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ObjectCard({
  object,
  onViewDetails,
  onDelete,
  onViewRentals,
}: {
  object: ObjectItem;
  onViewDetails: (object: ObjectItem) => void;
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

      <div className="flex gap-2 flex-wrap">
        <Button type="button" variant="outline" onClick={() => onViewDetails(object)}>
          <Eye className="mr-2 h-4 w-4" />
          Ver detalles
        </Button>
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

      {object.tags && (
        <div className="flex flex-wrap gap-1">
          {object.tags.split(",").map((tag, idx) => (
            <span key={idx} className="rounded-md bg-blue-100 px-2 py-1 text-xs text-blue-700">
              {tag.trim()}
            </span>
          ))}
        </div>
      )}
    </article>
  );
}

export function AdminObjects() {
  const [objects, setObjects] = useState<ObjectItem[]>([]);
  const [search, setSearch] = useState("");
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
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [editingObject, setEditingObject] = useState<ObjectItem | null>(null);
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
  const [globalRentalsOpen, setGlobalRentalsOpen] = useState(false);
  const [selectedObject, setSelectedObject] = useState<ObjectItem | null>(null);
  const [rentalsByStatus, setRentalsByStatus] = useState<RentalsByStatus>({
    active: [],
    in_progress: [],
    cancelled: [],
    completed: [],
  });
  const [loadingRentals, setLoadingRentals] = useState(false);
  const [globalRentals, setGlobalRentals] = useState<AdminObjectRental[]>([]);
  const [loadingGlobalRentals, setLoadingGlobalRentals] = useState(false);
  const [completingRentalIds, setCompletingRentalIds] = useState<number[]>([]);
  const [cancellingRentalIds, setCancellingRentalIds] = useState<number[]>([]);
  const getErrorMessage = (err: unknown, fallback: string) =>
    err instanceof Error && err.message ? err.message : fallback;
  const isEditMode = formMode === "edit";
  const dialogTitle = isEditMode ? "Ver detalles del objeto" : "Crear nuevo objeto";
  const dialogDescription = isEditMode
    ? "Revisa la información del objeto y guarda los cambios cuando termines."
    : "Añade un nuevo objeto para que los residentes puedan reservarlo";

  let submitButtonLabel = isEditMode ? "Actualizar" : "Crear objeto";
  if (submitting) {
    submitButtonLabel = isEditMode ? "Actualizando..." : "Creando...";
  }

  const getEmptyFormData = () => ({
    name: "",
    description: "",
    location: "",
    stock_total: "1",
    label_ids: [] as number[],
    image_url: "",
  });

  const getFormDataFromObject = (object: ObjectItem) => ({
    name: object.name ?? "",
    description: object.description ?? "",
    location: object.location ?? "",
    stock_total: String(object.stock_total ?? 1),
    label_ids: object.labels?.map((label) => label.id) ?? [],
    image_url: object.image_url ?? "",
  });

  const filteredObjects = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return objects;
    }

    return objects.filter((object) => {
      const searchableFields = [
        object.name,
        object.description ?? "",
        object.location ?? "",
        object.tags ?? "",
      ];

      return searchableFields.some((field) => field.toLowerCase().includes(query));
    });
  }, [objects, search]);

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

  const loadGlobalRentals = async (options?: { silent?: boolean }) => {
    const silent = options?.silent ?? false;
    if (!silent) {
      setLoadingGlobalRentals(true);
    }

    try {
      const data = await objectsService.getAllObjectRentals();
      setGlobalRentals(data);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Error al cargar el historial general"));
    } finally {
      if (!silent) {
        setLoadingGlobalRentals(false);
      }
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

  useEffect(() => {
    if (globalRentalsOpen && globalRentals.length === 0) {
      void loadGlobalRentals();
    }
  }, [globalRentalsOpen, globalRentals.length]);

  const handleOpenForm = () => {
    setFormMode("create");
    setEditingObject(null);
    setFormData(getEmptyFormData());
    setFormOpen(true);
  };

  const handleViewDetails = (object: ObjectItem) => {
    setFormMode("edit");
    setEditingObject(object);
    setFormData(getFormDataFromObject(object));
    setFormOpen(true);
  };

  const handleCloseForm = () => {
    setFormOpen(false);
    setFormMode("create");
    setEditingObject(null);
    setFormData(getEmptyFormData());
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
    if (trimmed.length > OBJECT_LABEL_MAX_LENGTH) {
      toast.error(`La etiqueta no puede superar ${OBJECT_LABEL_MAX_LENGTH} caracteres`);
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
    const descriptionLength = formData.description.length;
    const locationLength = formData.location.length;
    const imageUrlLength = formData.image_url.length;
    const trimmedDescription = formData.description.trim();
    const trimmedLocation = formData.location.trim();
    const trimmedImageUrl = formData.image_url.trim();

    if (!trimmedName) {
      toast.error("El nombre del objeto es obligatorio");
      return;
    }
    if (trimmedName.length > OBJECT_NAME_MAX_LENGTH) {
      toast.error(`El nombre no puede superar ${OBJECT_NAME_MAX_LENGTH} caracteres`);
      return;
    }
    if (!OBJECT_NAME_REGEX.test(trimmedName)) {
      toast.error("El nombre contiene caracteres no válidos");
      return;
    }
    if (descriptionLength > OBJECT_DESCRIPTION_MAX_LENGTH) {
      toast.error(`La descripción no puede superar ${OBJECT_DESCRIPTION_MAX_LENGTH} caracteres`);
      return;
    }
    if (locationLength > OBJECT_LOCATION_MAX_LENGTH) {
      toast.error(`La ubicación no puede superar ${OBJECT_LOCATION_MAX_LENGTH} caracteres`);
      return;
    }
    if (imageUrlLength > OBJECT_IMAGE_URL_MAX_LENGTH) {
      toast.error(`La URL de imagen no puede superar ${OBJECT_IMAGE_URL_MAX_LENGTH} caracteres`);
    if (trimmedDescription.length > OBJECT_DESCRIPTION_MAX_LENGTH) {
      toast.error(`La descripción no puede superar ${OBJECT_DESCRIPTION_MAX_LENGTH} caracteres`);
      return;
    }
    if (trimmedLocation.length > OBJECT_LOCATION_MAX_LENGTH) {
      toast.error(`La ubicación no puede superar ${OBJECT_LOCATION_MAX_LENGTH} caracteres`);
      return;
    }
    if (trimmedImageUrl.length > OBJECT_IMAGE_URL_MAX_LENGTH) {
      toast.error(`La URL no puede superar ${OBJECT_IMAGE_URL_MAX_LENGTH} caracteres`);
      return;
    }
    if (trimmedImageUrl && !isValidHttpUrl(trimmedImageUrl)) {
      toast.error("La imagen del objeto debe ser una URL válida (http/https)");
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        name: trimmedName,
        description: trimmedDescription || undefined,
        location: trimmedLocation || undefined,
        stock_total: Number.parseInt(formData.stock_total, 10) || 1,
        label_ids: formData.label_ids,
        image_url: formData.image_url || undefined,
      };

      if (formMode === "edit" && editingObject) {
        await objectsService.updateObject(editingObject.id, payload);
        toast.success("Objeto actualizado exitosamente");
      } else {
        await objectsService.createObject(payload);
        toast.success("Objeto creado exitosamente");
      }
      handleCloseForm();
      await loadObjects();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, formMode === "edit" ? "Error al actualizar objeto" : "Error al crear objeto"));
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
      setRentalsByStatus({ active: [], in_progress: [], cancelled: [], completed: [] });
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

  const handleOpenGlobalRentals = () => {
    setGlobalRentalsOpen(true);
    if (globalRentals.length === 0) {
      void loadGlobalRentals();
    }
  };

  const handleMarkRentalReturnedForObject = async (objectId: number, rentalId: number) => {
    if (completingRentalIds.includes(rentalId)) {
      return;
    }

    setCompletingRentalIds((prev) => [...prev, rentalId]);
    try {
      await objectsService.completeObjectRental(objectId, rentalId);
      toast.success("Préstamo marcado como devuelto");
      await Promise.all([
        loadObjects({ silent: true }),
        selectedObject?.id === objectId ? loadRentals(objectId) : Promise.resolve(),
        globalRentalsOpen ? loadGlobalRentals({ silent: true }) : Promise.resolve(),
      ]);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Error al marcar préstamo como devuelto"));
    } finally {
      setCompletingRentalIds((prev) => prev.filter((id) => id !== rentalId));
    }
  };

  const handleCancelRentalForObject = async (objectId: number, rentalId: number, reason: string) => {
    if (cancellingRentalIds.includes(rentalId)) {
      return;
    }

    setCancellingRentalIds((prev) => [...prev, rentalId]);
    try {
      await objectsService.cancelAdminRental(objectId, rentalId, reason);
      toast.success("Préstamo cancelado correctamente");
      await Promise.all([
        loadObjects({ silent: true }),
        selectedObject?.id === objectId ? loadRentals(objectId) : Promise.resolve(),
        globalRentalsOpen ? loadGlobalRentals({ silent: true }) : Promise.resolve(),
      ]);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Error al cancelar préstamo"));
    } finally {
      setCancellingRentalIds((prev) => prev.filter((id) => id !== rentalId));
    }
  };

  const handleMarkRentalReturned = async (rentalId: number) => {
    if (!selectedObject) {
      return;
    }

    await handleMarkRentalReturnedForObject(selectedObject.id, rentalId);
  };

  const handleCancelRental = async (rentalId: number, reason: string) => {
    if (!selectedObject) {
      return;
    }

    await handleCancelRentalForObject(selectedObject.id, rentalId, reason);
  };

  const objectsContent = (() => {
    if (loading) {
      return (
        <Card>
          <CardContent className="p-4 text-sm text-gray-500">Cargando objetos...</CardContent>
        </Card>
      );
    }

    if (objects.length === 0) {
      return (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-12 text-center">
            <Package className="mb-3 h-12 w-12 text-gray-500" />
            <h3 className="mb-2 text-lg font-semibold">No hay objetos</h3>
            <p className="mb-4 text-sm text-gray-500">
              Comienza creando el primer objeto disponible para préstamo
            </p>
            <Button onClick={handleOpenForm}>
              <Plus className="mr-2 h-4 w-4" />
              Crear objeto
            </Button>
          </CardContent>
        </Card>
      );
    }

    if (filteredObjects.length === 0) {
      return (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-12 text-center">
            <Search className="mb-3 h-12 w-12 text-gray-500" />
            <h3 className="mb-2 text-lg font-semibold">Sin coincidencias</h3>
            <p className="mb-4 text-sm text-gray-500">
              No hay objetos que coincidan con la búsqueda actual.
            </p>
            <Button variant="outline" onClick={() => setSearch("")}>
              Limpiar búsqueda
            </Button>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="grid gap-4 sm:grid-cols-2">
        {filteredObjects.map((object) => (
          <ObjectCard
            key={object.id}
            object={object}
            onViewDetails={handleViewDetails}
            onDelete={handleDelete}
            onViewRentals={handleViewRentals}
          />
        ))}
      </div>
    );
  })();

  return (
    <section className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <header className="rounded-xl border border-border/80 bg-white p-4 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Gestión de objetos</h2>
            <p className="mt-1 text-sm text-gray-500">
              {search.trim()
                ? `Mostrando ${filteredObjects.length} de ${objects.length} objeto${objects.length === 1 ? "" : "s"}`
                : `Administra ${objects.length} objeto${objects.length === 1 ? "" : "s"} disponibles para préstamo`}
            </p>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => setIsLabelsOpen(true)}>
              <Tag className="mr-2 h-4 w-4" />
              Gestionar etiquetas
            </Button>
            <Button type="button" variant="outline" onClick={handleOpenGlobalRentals}>
              <Search className="mr-2 h-4 w-4" />
              Historial global
            </Button>
            <Button type="button" variant="outline" onClick={() => void loadObjects()} disabled={loading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Actualizar
            </Button>
            <Button onClick={handleOpenForm}>
              <Plus className="mr-2 h-4 w-4" />
              Crear objeto
            </Button>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre, ubicación o etiqueta..."
              className="pl-10"
            />
          </div>
        </div>
      </header>

      {objectsContent}

      {/* Create / Edit Object Dialog */}
      <Dialog open={formOpen} onOpenChange={(open) => (open ? setFormOpen(true) : handleCloseForm())}>
        <DialogContent className="sm:max-w-[500px]">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>{dialogTitle}</DialogTitle>
              <DialogDescription>{dialogDescription}</DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Nombre *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  maxLength={OBJECT_NAME_MAX_LENGTH}
                  required
                  placeholder="Ej: Bicicleta de montaña"
                  maxLength={30}
                />
                <p className="text-right text-xs text-gray-500">
                  {formData.name.length}/{OBJECT_NAME_MAX_LENGTH}
                </p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe el objeto..."
                  maxLength={OBJECT_DESCRIPTION_MAX_LENGTH}
                  rows={3}
                  maxLength={255}
                />
                <p className="text-right text-xs text-gray-500">
                  {formData.description.length}/{OBJECT_DESCRIPTION_MAX_LENGTH}
                </p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="location">Ubicación</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  maxLength={OBJECT_LOCATION_MAX_LENGTH}
                  placeholder="Ej: Almacén principal"
                  maxLength={100}
                />
                <p className="text-right text-xs text-gray-500">
                  {formData.location.length}/{OBJECT_LOCATION_MAX_LENGTH}
                </p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="image_url">URL de imagen</Label>
                <Input
                  id="image_url"
                  type="url"
                  value={formData.image_url}
                  onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                  maxLength={OBJECT_IMAGE_URL_MAX_LENGTH}
                  placeholder="https://ejemplo.com/imagen.jpg"
                />
                <p className="text-right text-xs text-gray-500">
                  {formData.image_url.length}/{OBJECT_IMAGE_URL_MAX_LENGTH}
                </p>
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
                Volver
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitButtonLabel}
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
            <SheetDescription>{selectedObject?.name}</SheetDescription>
          </SheetHeader>
          <div className="max-h-[calc(100vh-120px)] overflow-y-auto">
            <RentalHistoryView
              rentalsByStatus={rentalsByStatus}
              loading={loadingRentals}
              onMarkReturned={async (rental) => {
                await handleMarkRentalReturned(rental.id);
              }}
              onCancelRental={async (rental, reason) => {
                await handleCancelRental(rental.id, reason);
              }}
              completingRentalIds={completingRentalIds}
              cancellingRentalIds={cancellingRentalIds}
            />
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={globalRentalsOpen} onOpenChange={setGlobalRentalsOpen}>
        <SheetContent className="w-full sm:max-w-3xl">
          <SheetHeader className="mb-1">
            <SheetTitle>Historial general de reservas</SheetTitle>
            <SheetDescription>Todas las reservas de todos los objetos en la residencia</SheetDescription>
          </SheetHeader>
          <div className="max-h-[calc(100vh-120px)] overflow-y-auto">
            <GlobalRentalHistory
              rentals={globalRentals}
              loading={loadingGlobalRentals}
              onRefresh={() => void loadGlobalRentals()}
              onMarkReturned={handleMarkRentalReturnedForObject}
              onCancelRental={handleCancelRentalForObject}
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
                maxLength={OBJECT_LABEL_MAX_LENGTH}
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
                <Plus className="mr-1 h-4 w-4" />
                Añadir
              </Button>
            </div>
            <p className="text-xs text-gray-500 text-right -mt-3">
              {newLabelName.length}/15
            </p>

            {loadingLabels ? (
              <p className="text-sm text-gray-500">Cargando etiquetas...</p>
            ) : labels.length === 0 ? (
              <p className="text-sm text-gray-500">No hay etiquetas personalizadas.</p>
            ) : (
              <>
                <div className="text-xs font-medium uppercase tracking-wide text-gray-500">Personalizadas</div>
                <div className="flex flex-wrap gap-2">
                  {labels.map((label) => (
                    <span
                      key={label.id}
                      className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary"
                    >
                      <Tag className="h-3 w-3" /> {label.name}
                      <button
                        type="button"
                        onClick={() => void handleDeleteLabel(label)}
                        className="ml-1 transition-colors hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                        title="Eliminar etiqueta"
                        disabled={deletingLabelIds.includes(label.id)}
                      >
                        <X className="h-3 w-3" />
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
