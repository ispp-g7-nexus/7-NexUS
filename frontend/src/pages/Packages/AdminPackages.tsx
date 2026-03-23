import type { ChangeEvent, FormEvent, ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarClock,
  Check,
  CheckCircle2,
  ChevronsUpDown,
  Edit2,
  Eye,
  ImagePlus,
  Loader2,
  Package,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Truck,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { NativeSelect } from "../../components/ui/native-select";
import { Popover, PopoverContent, PopoverTrigger } from "../../components/ui/popover";
import { Textarea } from "../../components/ui/textarea";
import type {
  CreatePackagePayload,
  PackageAdminItem,
  PackageLabelPreview,
  PackageResidentCandidate,
  PackageStatus,
  UpdatePackagePayload,
} from "../../services/packages";
import { packagesService } from "../../services/packages";
import type { Resident } from "../../services/residents";
import { residentsService } from "../../services/residents";

type StatusFilter = "all" | PackageStatus;

type PackageFormState = {
  resident_id: string;
  carrier: string;
  tracking_number: string;
  notes: string;
  status: PackageStatus;
  received_at: string;
};

const EMPTY_FORM: PackageFormState = {
  resident_id: "",
  carrier: "",
  tracking_number: "",
  notes: "",
  status: "RECEIVED",
  received_at: "",
};

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

function isPermissionError(error: unknown): boolean {
  const message = getErrorMessage(error, "").toLowerCase();
  return (
    message.includes("403") ||
    message.includes("permission") ||
    message.includes("permiso")
  );
}

function formatDateTime(value?: string | null): string {
  if (!value) {
    return "No disponible";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "Fecha invalida";
  }

  return parsed.toLocaleString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function toDateTimeLocal(value?: string | null): string {
  if (!value) {
    return "";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  const offsetMs = parsed.getTimezoneOffset() * 60_000;
  return new Date(parsed.getTime() - offsetMs).toISOString().slice(0, 16);
}

function sortPackagesByDate(items: PackageAdminItem[]): PackageAdminItem[] {
  return [...items].sort((left, right) => {
    const leftReceived = Date.parse(left.received_at || left.created_at);
    const rightReceived = Date.parse(right.received_at || right.created_at);

    if (rightReceived !== leftReceived) {
      return rightReceived - leftReceived;
    }

    return Date.parse(right.created_at) - Date.parse(left.created_at);
  });
}

function formatLocation(room?: string, building?: string): string {
  const roomLabel = room ? `Hab. ${room}` : "";
  const buildingLabel = building ? `Edif. ${building}` : "";

  return [roomLabel, buildingLabel].filter(Boolean).join(" - ") || "Sin ubicacion";
}

function getResidentOptionLabel(resident: Resident): string {
  const location = formatLocation(resident.room, resident.building);
  const status = resident.is_active ? "" : " - Inactivo";
  return `${resident.full_name} - ${location}${status}`;
}

function getReasonLabel(reason: string): string {
  switch (reason) {
    case "exact_name_match":
      return "Coincidencia exacta por nombre";
    case "name_db_search_match":
      return "Coincidencia por tokens del nombre";
    case "fuzzy_name_match":
      return "Coincidencia aproximada por nombre";
    case "name_room_disambiguated_match":
      return "Coincidencia por nombre y habitacion";
    case "unique_room_match":
      return "Coincidencia unica por habitacion";
    case "resident_name_subset_match":
      return "Coincidencia por nombre base";
    case "ambiguous_name_match":
      return "Nombre ambiguo";
    case "ambiguous_room_match":
      return "Habitacion compartida o ambigua";
    case "low_confidence":
      return "Coincidencia con baja confianza";
    case "no_match":
      return "Sin coincidencia automatica";
    default:
      return "Resultado del analisis disponible";
  }
}

function getPackageStatusLabel(status: PackageStatus): string {
  return status === "DELIVERED" ? "Entregado" : "Recibido";
}

function packageToFormState(packageItem: PackageAdminItem): PackageFormState {
  return {
    resident_id: String(packageItem.resident_id),
    carrier: packageItem.carrier || "",
    tracking_number: packageItem.tracking_number || "",
    notes: packageItem.notes || "",
    status: packageItem.status,
    received_at: toDateTimeLocal(packageItem.received_at),
  };
}

function buildResidentOptions(
  residents: Resident[],
  packageItem: PackageAdminItem | null,
): Resident[] {
  const options = new Map<number, Resident>();

  residents.forEach((resident) => {
    if (resident.is_active || resident.id === packageItem?.resident_id) {
      options.set(resident.id, resident);
    }
  });

  if (packageItem && !options.has(packageItem.resident_id)) {
    options.set(packageItem.resident_id, {
      id: packageItem.resident_id,
      full_name: packageItem.resident_name,
      email: "",
      is_active: false,
      bedroom_id: null,
      room: packageItem.room,
      building: packageItem.building,
      check_in_date: null,
      created_at: "",
    });
  }

  return Array.from(options.values()).sort((left, right) =>
    left.full_name.localeCompare(right.full_name, "es"),
  );
}

function PackageStatusBadge({ status }: { status: PackageStatus }) {
  return (
    <Badge variant={status === "DELIVERED" ? "success" : "warning"}>
      {getPackageStatusLabel(status)}
    </Badge>
  );
}

function PackagesStatCard({
  label,
  value,
  icon,
  iconClassName,
  iconBgClassName,
}: {
  label: string;
  value: number;
  icon: ReactNode;
  iconClassName?: string;
  iconBgClassName?: string;
}) {
  return (
    <Card className="border-gray-100 shadow-sm">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm text-gray-500">{label}</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
          </div>
          <div
            className={`flex h-11 w-11 items-center justify-center rounded-xl ${
              iconBgClassName || "bg-gray-100"
            }`}
          >
            <span className={iconClassName || "text-gray-600"}>{icon}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function PackageCard({
  packageItem,
  onView,
  onEdit,
  onDelete,
  onDeliver,
}: {
  packageItem: PackageAdminItem;
  onView: (packageItem: PackageAdminItem) => void;
  onEdit: (packageItem: PackageAdminItem) => void;
  onDelete: (packageItem: PackageAdminItem) => void;
  onDeliver: (packageItem: PackageAdminItem) => void;
}) {
  return (
    <Card className="border-gray-100 shadow-sm transition-shadow hover:shadow-md">
      <CardContent className="p-5">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="truncate text-lg font-semibold text-gray-900">
                  {packageItem.resident_name}
                </h3>
                <PackageStatusBadge status={packageItem.status} />
                {packageItem.is_unread && packageItem.status === "RECEIVED" && (
                  <Badge variant="info">Sin ver por el residente</Badge>
                )}
              </div>
              <p className="mt-1 flex items-center gap-2 text-sm text-gray-500">
                <Truck className="h-4 w-4" />
                {packageItem.carrier || "Transportista no indicado"}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => onView(packageItem)}>
                <Eye className="h-4 w-4" />
                Ver detalle
              </Button>
              <Button variant="outline" size="sm" onClick={() => onEdit(packageItem)}>
                <Edit2 className="h-4 w-4" />
                Editar
              </Button>
              {packageItem.status !== "DELIVERED" && (
                <Button
                  size="sm"
                  className="bg-[#509550] text-white hover:bg-[#3d7a3d]"
                  onClick={() => onDeliver(packageItem)}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Entregar
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                onClick={() => onDelete(packageItem)}
              >
                <Trash2 className="h-4 w-4" />
                Eliminar
              </Button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl bg-gray-50 p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                Tracking
              </p>
              <p className="mt-1 font-mono text-sm text-gray-900">
                {packageItem.tracking_number || "Sin tracking"}
              </p>
            </div>
            <div className="rounded-xl bg-gray-50 p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                Ubicacion
              </p>
              <p className="mt-1 text-sm text-gray-900">
                {formatLocation(packageItem.room, packageItem.building)}
              </p>
            </div>
            <div className="rounded-xl bg-gray-50 p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                Recepcion
              </p>
              <p className="mt-1 text-sm text-gray-900">
                {formatDateTime(packageItem.received_at)}
              </p>
            </div>
            <div className="rounded-xl bg-gray-50 p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                Entrega
              </p>
              <p className="mt-1 text-sm text-gray-900">
                {packageItem.delivered_at
                  ? formatDateTime(packageItem.delivered_at)
                  : "Pendiente"}
              </p>
            </div>
          </div>

          {packageItem.notes && (
            <div className="rounded-xl border border-dashed border-gray-200 bg-white p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                Notas
              </p>
              <p className="mt-1 line-clamp-2 text-sm text-gray-600">
                {packageItem.notes}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function PackageDetailsDialog({
  packageItem,
  onClose,
}: {
  packageItem: PackageAdminItem | null;
  onClose: () => void;
}) {
  return (
    <Dialog open={packageItem !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[680px]">
        <DialogHeader>
          <DialogTitle>Detalle del paquete</DialogTitle>
          <DialogDescription>
            Consulta toda la informacion registrada para este envio.
          </DialogDescription>
        </DialogHeader>

        {packageItem && (
          <div className="grid gap-4 py-2 sm:grid-cols-2">
            <div className="rounded-xl bg-gray-50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                Residente
              </p>
              <p className="mt-1 text-base font-semibold text-gray-900">
                {packageItem.resident_name}
              </p>
            </div>
            <div className="rounded-xl bg-gray-50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                Estado
              </p>
              <div className="mt-2">
                <PackageStatusBadge status={packageItem.status} />
              </div>
            </div>
            <div className="rounded-xl bg-gray-50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                Ubicacion del residente
              </p>
              <p className="mt-1 text-sm text-gray-900">
                {formatLocation(packageItem.room, packageItem.building)}
              </p>
            </div>
            <div className="rounded-xl bg-gray-50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                Transportista
              </p>
              <p className="mt-1 text-sm text-gray-900">
                {packageItem.carrier || "No indicado"}
              </p>
            </div>
            <div className="rounded-xl bg-gray-50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                Tracking
              </p>
              <p className="mt-1 break-all font-mono text-sm text-gray-900">
                {packageItem.tracking_number || "Sin tracking"}
              </p>
            </div>
            <div className="rounded-xl bg-gray-50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                Recibido el
              </p>
              <p className="mt-1 text-sm text-gray-900">
                {formatDateTime(packageItem.received_at)}
              </p>
            </div>
            <div className="rounded-xl bg-gray-50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                Entregado el
              </p>
              <p className="mt-1 text-sm text-gray-900">
                {packageItem.delivered_at
                  ? formatDateTime(packageItem.delivered_at)
                  : "Pendiente"}
              </p>
            </div>
            <div className="rounded-xl bg-gray-50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                Ultima actualizacion
              </p>
              <p className="mt-1 text-sm text-gray-900">
                {formatDateTime(packageItem.updated_at)}
              </p>
            </div>
            <div className="sm:col-span-2 rounded-xl bg-gray-50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                Notas internas
              </p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-gray-700">
                {packageItem.notes || "No hay notas registradas."}
              </p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function DeletePackageDialog({
  packageItem,
  onClose,
  onConfirm,
}: {
  packageItem: PackageAdminItem | null;
  onClose: () => void;
  onConfirm: (id: number) => Promise<boolean>;
}) {
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!packageItem) {
      setSubmitting(false);
    }
  }, [packageItem]);

  async function handleConfirm() {
    if (!packageItem) {
      return;
    }

    setSubmitting(true);
    const ok = await onConfirm(packageItem.id);
    setSubmitting(false);

    if (ok) {
      onClose();
    }
  }

  return (
    <Dialog open={packageItem !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Eliminar paquete</DialogTitle>
          <DialogDescription>
            Esta accion borrara el registro del paquete de{" "}
            <span className="font-semibold text-gray-900">
              {packageItem?.resident_name}
            </span>
            .
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="mt-4">
          <Button variant="outline" disabled={submitting} onClick={onClose}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            disabled={submitting}
            onClick={() => void handleConfirm()}
          >
            <Trash2 className="h-4 w-4" />
            {submitting ? "Eliminando..." : "Eliminar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeliveryDialog({
  packageItem,
  onClose,
  onConfirm,
}: {
  packageItem: PackageAdminItem | null;
  onClose: () => void;
  onConfirm: (id: number) => Promise<boolean>;
}) {
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setSubmitting(false);
  }, [packageItem]);

  async function handleSubmit() {
    if (!packageItem) {
      return;
    }

    setSubmitting(true);
    const ok = await onConfirm(packageItem.id);
    setSubmitting(false);

    if (ok) {
      onClose();
    }
  }

  return (
    <Dialog open={packageItem !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Registrar entrega</DialogTitle>
          <DialogDescription>
            Verifica que el codigo coincida con el provisto por el residente.
          </DialogDescription>
        </DialogHeader>

        {packageItem && (
          <div className="grid gap-4 py-2">
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
              <p className="font-semibold text-gray-900">{packageItem.resident_name}</p>
              <p className="mt-1 text-sm text-gray-500">
                {packageItem.carrier || "Transportista no indicado"} -{" "}
                {packageItem.tracking_number || "Sin tracking"}
              </p>
            </div>

            <div className="space-y-4 text-center py-4">
              <p className="text-sm font-medium text-gray-700">Codigo de recogida esperado:</p>
              <div className="flex justify-center">
                <div className="bg-gray-100 px-6 py-3 rounded-xl border-2 border-dashed border-gray-300">
                  <span className="text-4xl font-mono font-bold tracking-widest text-gray-800">
                    {packageItem.delivery_code || "N/A"}
                  </span>
                </div>
              </div>
              <p className="text-base text-gray-900 mt-4">¿Es correcto el codigo?</p>
            </div>
          </div>
        )}

        <DialogFooter className="mt-2">
          <Button variant="outline" disabled={submitting} onClick={onClose}>
            Cancelar
          </Button>
          <Button
            disabled={submitting}
            className="bg-[#509550] text-white hover:bg-[#3d7a3d]"
            onClick={() => void handleSubmit()}
          >
            <CheckCircle2 className="h-4 w-4" />
            {submitting ? "Registrando..." : "Sí, entregar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PackagePreviewCard({
  preview,
  onSelectCandidate,
}: {
  preview: PackageLabelPreview;
  onSelectCandidate: (candidate: PackageResidentCandidate) => void;
}) {
  return (
    <div className="space-y-3 rounded-xl border border-emerald-100 bg-emerald-50/60 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="success">Etiqueta analizada</Badge>
        <span className="text-xs font-medium text-emerald-700">
          {getReasonLabel(preview.resident_match.reason)} - Confianza{" "}
          {Math.round(preview.resident_match.confidence * 100)}%
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-emerald-700/70">
            Destinatario detectado
          </p>
          <p className="mt-1 text-sm text-gray-900">
            {preview.suggested_fields.recipient_name || "No reconocido"}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-emerald-700/70">
            Habitacion
          </p>
          <p className="mt-1 text-sm text-gray-900">
            {formatLocation(
              preview.suggested_fields.room,
              preview.suggested_fields.building,
            )}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-emerald-700/70">
            Transportista
          </p>
          <p className="mt-1 text-sm text-gray-900">
            {preview.suggested_fields.carrier || "No reconocido"}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-emerald-700/70">
            Tracking
          </p>
          <p className="mt-1 break-all text-sm text-gray-900">
            {preview.suggested_fields.tracking_number || "No reconocido"}
          </p>
        </div>
      </div>

      {preview.candidate_residents.length > 0 && (
        <div className="space-y-2 rounded-xl border border-dashed border-emerald-200 bg-white p-3">
          <p className="text-sm font-medium text-gray-900">
            Coincidencias sugeridas
          </p>
          <div className="flex flex-wrap gap-2">
            {preview.candidate_residents.map((candidate) => (
              <Button
                key={candidate.resident_id}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onSelectCandidate(candidate)}
              >
                {candidate.full_name} ({formatLocation(candidate.room, candidate.building)})
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ResidentAutocomplete({
  residents,
  value,
  onChange,
}: {
  residents: Resident[];
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selectedResident = useMemo(
    () => residents.find((resident) => String(resident.id) === value) || null,
    [residents, value],
  );

  const filteredResidents = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return residents;
    }

    return residents.filter((resident) => {
      const searchableText = [
        resident.full_name,
        resident.email,
        resident.room,
        resident.building,
      ]
        .join(" ")
        .toLowerCase();

      return searchableText.includes(normalizedQuery);
    });
  }, [query, residents]);

  useEffect(() => {
    if (!open) {
      setQuery("");
    }
  }, [open]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id="package-resident"
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="h-10 w-full justify-between border-input bg-background px-3 py-2 text-sm font-normal text-foreground hover:bg-accent hover:text-accent-foreground"
        >
          <span className="truncate text-left">
            {selectedResident
              ? getResidentOptionLabel(selectedResident)
              : "Selecciona un residente"}
          </span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[420px] max-w-[calc(100vw-2rem)] p-0">
        <div className="border-b p-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar por nombre, email, habitacion o edificio..."
              className="pl-9"
            />
          </div>
        </div>
        <div className="max-h-64 overflow-y-auto p-2">
          {filteredResidents.length === 0 ? (
            <p className="px-3 py-4 text-sm text-gray-500">
              No hay residentes que coincidan con la busqueda.
            </p>
          ) : (
            filteredResidents.map((resident) => {
              const isSelected = String(resident.id) === value;

              return (
                <button
                  key={resident.id}
                  type="button"
                  onClick={() => {
                    onChange(String(resident.id));
                    setOpen(false);
                  }}
                  className={`flex w-full items-start gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                    isSelected
                      ? "bg-green-50 text-green-900"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <Check
                    className={`mt-0.5 h-4 w-4 shrink-0 ${
                      isSelected ? "opacity-100" : "opacity-0"
                    }`}
                  />
                  <div className="min-w-0">
                    <p className="truncate font-medium">{resident.full_name}</p>
                    <p className="truncate text-xs text-gray-500">
                      {resident.email || "Sin email"} -{" "}
                      {formatLocation(resident.room, resident.building)}
                    </p>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function PackageFormDialog({
  open,
  onOpenChange,
  packageItem,
  residents,
  onCreate,
  onUpdate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  packageItem: PackageAdminItem | null;
  residents: Resident[];
  onCreate: (payload: CreatePackagePayload) => Promise<boolean>;
  onUpdate: (id: number, payload: UpdatePackagePayload) => Promise<boolean>;
}) {
  const isEdit = packageItem !== null;
  const [form, setForm] = useState<PackageFormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [preview, setPreview] = useState<PackageLabelPreview | null>(null);
  const [selectedImageName, setSelectedImageName] = useState("");

  const residentOptions = useMemo(
    () => buildResidentOptions(residents, packageItem),
    [packageItem, residents],
  );

  const selectedResident = useMemo(() => {
    const residentId = Number(form.resident_id);
    return residentOptions.find((resident) => resident.id === residentId) || null;
  }, [form.resident_id, residentOptions]);

  useEffect(() => {
    if (!open) {
      return;
    }

    setForm(isEdit && packageItem ? packageToFormState(packageItem) : EMPTY_FORM);
    setSubmitting(false);
    setPreviewLoading(false);
    setPreview(null);
    setSelectedImageName("");
  }, [isEdit, open, packageItem]);

  function updateField<K extends keyof PackageFormState>(
    key: K,
    value: PackageFormState[K],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleLabelImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setSelectedImageName(file.name);
    setPreviewLoading(true);

    try {
      const nextPreview = await packagesService.previewLabel(file);
      setPreview(nextPreview);
      setForm((current) => ({
        ...current,
        resident_id: nextPreview.resident_match.resident_id
          ? String(nextPreview.resident_match.resident_id)
            : current.resident_id,
        carrier: nextPreview.suggested_fields.carrier || current.carrier,
        tracking_number:
          nextPreview.suggested_fields.tracking_number || current.tracking_number,
        notes: nextPreview.suggested_fields.notes || current.notes,
      }));

      toast.success("Etiqueta analizada. Revisa y confirma los datos.");
    } catch (error) {
      setPreview(null);
      toast.error(getErrorMessage(error, "No se pudo analizar la etiqueta."));
    } finally {
      setPreviewLoading(false);
      event.target.value = "";
    }
  }

  function buildCreatePayload(): CreatePackagePayload | null {
    const residentId = Number(form.resident_id);
    if (!residentId) {
      toast.error("Debes seleccionar un residente.");
      return null;
    }

    return {
      resident_id: residentId,
      carrier: form.carrier.trim(),
      tracking_number: form.tracking_number.trim(),
      notes: form.notes.trim(),
      status: form.status,
      ...(form.received_at
        ? { received_at: new Date(form.received_at).toISOString() }
        : {}),
    };
  }

  function buildUpdatePayload(): UpdatePackagePayload | null {
    if (!packageItem) {
      return null;
    }

    const residentId = Number(form.resident_id);
    if (!residentId) {
      toast.error("Debes seleccionar un residente.");
      return null;
    }

    const payload: UpdatePackagePayload = {};
    const original = packageToFormState(packageItem);

    if (residentId !== packageItem.resident_id) {
      payload.resident_id = residentId;
    }
    if (form.carrier.trim() !== original.carrier) {
      payload.carrier = form.carrier.trim();
    }
    if (form.tracking_number.trim() !== original.tracking_number) {
      payload.tracking_number = form.tracking_number.trim();
    }
    if (form.notes.trim() !== original.notes) {
      payload.notes = form.notes.trim();
    }
    if (form.status !== original.status) {
      payload.status = form.status;
    }
    if (form.received_at && form.received_at !== original.received_at) {
      payload.received_at = new Date(form.received_at).toISOString();
    }

    return payload;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSubmitting(true);
    let ok = false;

    try {
      if (isEdit && packageItem) {
        const payload = buildUpdatePayload();
        if (!payload) {
          return;
        }

        if (Object.keys(payload).length === 0) {
          toast.info("No hay cambios para guardar.");
          ok = true;
        } else {
          ok = await onUpdate(packageItem.id, payload);
        }
      } else {
        const payload = buildCreatePayload();
        if (!payload) {
          return;
        }

        ok = await onCreate(payload);
      }
    } finally {
      setSubmitting(false);
    }

    if (ok) {
      onOpenChange(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[760px] max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {isEdit ? "Editar paquete" : "Registrar llegada de paquete"}
            </DialogTitle>
            <DialogDescription>
              {isEdit
                ? "Actualiza los datos del envio o cambia su estado."
                : "Sube la foto de la etiqueta para autocompletar el destinatario y registrar la llegada."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-5 py-2">
            <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="flex items-center gap-2 text-sm font-medium text-gray-900">
                    <ImagePlus className="h-4 w-4 text-[#509550]" />
                    Analizar etiqueta del paquete
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    Selecciona una imagen y el sistema intentara detectar el
                    residente, transportista y tracking automaticamente.
                  </p>
                </div>
                <Label
                  htmlFor="package-label-image"
                  className="inline-flex cursor-pointer items-center justify-center rounded-md bg-[#509550] px-4 py-2 text-sm font-medium text-white hover:bg-[#3d7a3d]"
                >
                  {previewLoading ? "Analizando..." : "Subir imagen"}
                </Label>
              </div>

              <Input
                id="package-label-image"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => void handleLabelImageChange(event)}
              />

              <div className="mt-3 min-h-[28px]">
                {previewLoading ? (
                  <p className="flex items-center gap-2 text-sm text-gray-600">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Procesando la imagen de la etiqueta...
                  </p>
                ) : selectedImageName ? (
                  <p className="text-sm text-gray-600">
                    Imagen seleccionada:{" "}
                    <span className="font-medium text-gray-900">
                      {selectedImageName}
                    </span>
                  </p>
                ) : null}
              </div>

              {preview && (
                <div className="mt-4">
                  <PackagePreviewCard
                    preview={preview}
                    onSelectCandidate={(candidate) =>
                      updateField("resident_id", String(candidate.resident_id))
                    }
                  />
                </div>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="package-resident">Residente *</Label>
                <ResidentAutocomplete
                  residents={residentOptions}
                  value={form.resident_id}
                  onChange={(value) => updateField("resident_id", value)}
                />
                {selectedResident && (
                  <div className="rounded-xl bg-gray-50 p-3 text-sm text-gray-600">
                    <p className="font-medium text-gray-900">
                      {selectedResident.full_name}
                    </p>
                    <p>{selectedResident.email || "Sin email disponible"}</p>
                    <p>{formatLocation(selectedResident.room, selectedResident.building)}</p>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="package-status">Estado</Label>
                <NativeSelect
                  id="package-status"
                  value={form.status}
                  onChange={(event) =>
                    updateField("status", event.target.value as PackageStatus)
                  }
                >
                  <option value="RECEIVED">Recibido</option>
                  <option value="DELIVERED">Entregado</option>
                </NativeSelect>
              </div>

              <div className="space-y-2">
                <Label htmlFor="package-carrier">Transportista</Label>
                <Input
                  id="package-carrier"
                  value={form.carrier}
                  onChange={(event) => updateField("carrier", event.target.value)}
                  placeholder="Ej: DHL, Correos, GLS..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="package-tracking">Tracking</Label>
                <Input
                  id="package-tracking"
                  value={form.tracking_number}
                  onChange={(event) =>
                    updateField("tracking_number", event.target.value)
                  }
                  placeholder="Codigo de seguimiento"
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="package-received-at">Fecha de recepcion</Label>
                <Input
                  id="package-received-at"
                  type="datetime-local"
                  value={form.received_at}
                  onChange={(event) => updateField("received_at", event.target.value)}
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="package-notes">Notas</Label>
                <Textarea
                  id="package-notes"
                  rows={4}
                  value={form.notes}
                  onChange={(event) => updateField("notes", event.target.value)}
                  placeholder="Observaciones internas sobre el paquete"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              disabled={submitting}
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="bg-[#509550] text-white hover:bg-[#3d7a3d]"
            >
              {submitting
                ? isEdit
                  ? "Guardando..."
                  : "Registrando..."
                : isEdit
                  ? "Guardar cambios"
                  : "Registrar paquete"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function AdminPackages() {
  const [packages, setPackages] = useState<PackageAdminItem[]>([]);
  const [residents, setResidents] = useState<Resident[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUnauthorized, setIsUnauthorized] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [residentFilter, setResidentFilter] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<PackageAdminItem | null>(null);
  const [detailPackage, setDetailPackage] = useState<PackageAdminItem | null>(null);
  const [deletingPackage, setDeletingPackage] = useState<PackageAdminItem | null>(
    null,
  );
  const [deliveringPackage, setDeliveringPackage] =
    useState<PackageAdminItem | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);

    try {
      const [packagesData, residentsData] = await Promise.all([
        packagesService.list(),
        residentsService.list(),
      ]);

      setPackages(sortPackagesByDate(packagesData));
      setResidents(residentsData);
      setIsUnauthorized(false);
    } catch (error) {
      if (isPermissionError(error)) {
        setIsUnauthorized(true);
      } else {
        toast.error(getErrorMessage(error, "No se pudo cargar la paqueteria."));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const residentFilterOptions = useMemo(
    () =>
      [...residents].sort((left, right) =>
        left.full_name.localeCompare(right.full_name, "es"),
      ),
    [residents],
  );

  const filteredPackages = useMemo(() => {
    const query = search.trim().toLowerCase();

    return packages.filter((packageItem) => {
      const matchesSearch =
        !query ||
        packageItem.resident_name.toLowerCase().includes(query) ||
        packageItem.carrier.toLowerCase().includes(query) ||
        packageItem.tracking_number.toLowerCase().includes(query) ||
        packageItem.notes.toLowerCase().includes(query) ||
        packageItem.room.toLowerCase().includes(query) ||
        packageItem.building.toLowerCase().includes(query);

      const matchesStatus =
        statusFilter === "all" || packageItem.status === statusFilter;
      const matchesResident =
        residentFilter === "all" ||
        packageItem.resident_id === Number(residentFilter);

      return matchesSearch && matchesStatus && matchesResident;
    });
  }, [packages, residentFilter, search, statusFilter]);

  const receivedCount = useMemo(
    () => packages.filter((packageItem) => packageItem.status === "RECEIVED").length,
    [packages],
  );
  const deliveredCount = useMemo(
    () => packages.filter((packageItem) => packageItem.status === "DELIVERED").length,
    [packages],
  );

  const replacePackage = useCallback((updated: PackageAdminItem) => {
    setPackages((current) =>
      sortPackagesByDate(
        current.some((packageItem) => packageItem.id === updated.id)
          ? current.map((packageItem) =>
              packageItem.id === updated.id ? updated : packageItem,
            )
          : [updated, ...current],
      ),
    );

    setDetailPackage((current) => (current?.id === updated.id ? updated : current));
    setEditingPackage((current) => (current?.id === updated.id ? updated : current));
    setDeliveringPackage((current) =>
      current?.id === updated.id ? updated : current,
    );
  }, []);

  const handleCreatePackage = useCallback(
    async (payload: CreatePackagePayload): Promise<boolean> => {
      try {
        const created = await packagesService.create(payload);
        replacePackage(created);
        toast.success("Paquete registrado correctamente.");
        return true;
      } catch (error) {
        toast.error(getErrorMessage(error, "No se pudo registrar el paquete."));
        return false;
      }
    },
    [replacePackage],
  );

  const handleUpdatePackage = useCallback(
    async (id: number, payload: UpdatePackagePayload): Promise<boolean> => {
      try {
        const updated = await packagesService.update(id, payload);
        replacePackage(updated);
        toast.success("Paquete actualizado correctamente.");
        return true;
      } catch (error) {
        toast.error(getErrorMessage(error, "No se pudo actualizar el paquete."));
        return false;
      }
    },
    [replacePackage],
  );

  const handleDeletePackage = useCallback(async (id: number): Promise<boolean> => {
    try {
      await packagesService.delete(id);
      setPackages((current) => current.filter((packageItem) => packageItem.id !== id));
      setDetailPackage((current) => (current?.id === id ? null : current));
      setEditingPackage((current) => (current?.id === id ? null : current));
      setDeliveringPackage((current) => (current?.id === id ? null : current));
      toast.success("Paquete eliminado correctamente.");
      return true;
    } catch (error) {
      toast.error(getErrorMessage(error, "No se pudo eliminar el paquete."));
      return false;
    }
  }, []);

  const handleDeliverPackage = useCallback(
    async (id: number): Promise<boolean> => {
      try {
        const updated = await packagesService.update(id, { status: "DELIVERED" });

        replacePackage(updated);
        toast.success("Entrega registrada correctamente.");
        return true;
      } catch (error) {
        toast.error(getErrorMessage(error, "No se pudo registrar la entrega."));
        return false;
      }
    },
    [replacePackage],
  );

  if (isUnauthorized) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3 text-gray-500">
        <Package className="h-10 w-10 opacity-40" />
        <p className="text-sm">No tienes permisos para ver la paqueteria.</p>
      </div>
    );
  }

  return (
    <section className="space-y-6 p-1">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Paqueteria</h2>
          <p className="mt-1 text-sm text-gray-500">
            Gestiona entradas, entregas y seguimiento de paquetes para los
            residentes.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => void loadData()} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Actualizar
          </Button>
          <Button
            className="bg-[#509550] text-white hover:bg-[#3d7a3d]"
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="h-4 w-4" />
            Registrar llegada
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <PackagesStatCard
          label="Total paquetes"
          value={packages.length}
          icon={<Package className="h-5 w-5" />}
          iconClassName="text-[#509550]"
          iconBgClassName="bg-[#509550]/10"
        />
        <PackagesStatCard
          label="Pendientes de entrega"
          value={receivedCount}
          icon={<CalendarClock className="h-5 w-5" />}
          iconClassName="text-orange-600"
          iconBgClassName="bg-orange-100"
        />
        <PackagesStatCard
          label="Entregados"
          value={deliveredCount}
          icon={<CheckCircle2 className="h-5 w-5" />}
          iconClassName="text-emerald-600"
          iconBgClassName="bg-emerald-100"
        />
      </div>

      <Card className="border-gray-100 shadow-sm">
        <CardContent className="pt-6">
          <div className="flex flex-col gap-3 xl:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                className="pl-10"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por residente, tracking, transportista o notas..."
              />
            </div>

            <NativeSelect
              className="xl:w-48"
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as StatusFilter)
              }
            >
              <option value="all">Todos los estados</option>
              <option value="RECEIVED">Recibidos</option>
              <option value="DELIVERED">Entregados</option>
            </NativeSelect>

            <NativeSelect
              className="xl:w-64"
              value={residentFilter}
              onChange={(event) => setResidentFilter(event.target.value)}
            >
              <option value="all">Todos los residentes</option>
              {residentFilterOptions.map((resident) => (
                <option key={resident.id} value={resident.id}>
                  {resident.full_name}
                </option>
              ))}
            </NativeSelect>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="grid gap-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-40 animate-pulse rounded-xl border border-gray-200 bg-gray-50"
            />
          ))}
        </div>
      ) : filteredPackages.length === 0 ? (
        <Card className="border-gray-100 shadow-sm">
          <CardContent className="flex flex-col items-center justify-center gap-3 py-14 text-center">
            <Package className="h-12 w-12 text-gray-300" />
            <p className="text-sm text-gray-500">
              {search || statusFilter !== "all" || residentFilter !== "all"
                ? "No hay paquetes que coincidan con los filtros aplicados."
                : "Todavia no hay paquetes registrados."}
            </p>
            {!search && statusFilter === "all" && residentFilter === "all" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCreateOpen(true)}
              >
                <Plus className="h-4 w-4" />
                Registrar el primero
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredPackages.map((packageItem) => (
            <PackageCard
              key={packageItem.id}
              packageItem={packageItem}
              onView={setDetailPackage}
              onEdit={setEditingPackage}
              onDelete={setDeletingPackage}
              onDeliver={setDeliveringPackage}
            />
          ))}
        </div>
      )}

      <PackageFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        packageItem={null}
        residents={residents}
        onCreate={handleCreatePackage}
        onUpdate={handleUpdatePackage}
      />

      <PackageFormDialog
        open={editingPackage !== null}
        onOpenChange={(open) => !open && setEditingPackage(null)}
        packageItem={editingPackage}
        residents={residents}
        onCreate={handleCreatePackage}
        onUpdate={handleUpdatePackage}
      />

      <PackageDetailsDialog
        packageItem={detailPackage}
        onClose={() => setDetailPackage(null)}
      />

      <DeletePackageDialog
        packageItem={deletingPackage}
        onClose={() => setDeletingPackage(null)}
        onConfirm={handleDeletePackage}
      />

      <DeliveryDialog
        packageItem={deliveringPackage}
        onClose={() => setDeliveringPackage(null)}
        onConfirm={handleDeliverPackage}
      />
    </section>
  );
}

export default AdminPackages;
