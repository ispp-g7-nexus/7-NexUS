// src/pages/Residents/components/ResidentFormDialog.tsx
import { useEffect, useState } from "react";
import { Edit2, Plus } from "lucide-react";
import { Button } from "../../../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../../components/ui/dialog";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { NativeSelect } from "../../../components/ui/native-select";
import type { CreateResidentPayload, Resident, UpdateResidentPayload } from "../../../services/residents";
import { type AvailableBedroom, listAvailableBedrooms } from "../../../services/bedrooms";

interface FormState {
  full_name: string;
  email: string;
  password: string;
  bedroom_id: number | null;
  checkin_date: string;
  is_active: boolean;
}

type FieldErrors = Partial<Record<keyof FormState, string>>;

interface ResidentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Provide a resident to enter edit mode; omit or pass null for create mode. */
  resident?: Resident | null;
  onCreate: (payload: CreateResidentPayload) => Promise<boolean>;
  onUpdate: (id: number, payload: UpdateResidentPayload) => Promise<boolean>;
}

const EMPTY_FORM: FormState = {
  full_name: "",
  email: "",
  password: "",
  bedroom_id: null,
  checkin_date: "",
  is_active: true,
};

function toFormState(resident: Resident): FormState {
  return {
    full_name: resident.full_name,
    email: resident.email,
    password: "",
    bedroom_id: resident.bedroom_id ?? null,
    checkin_date: resident.check_in_date ?? "",
    is_active: resident.is_active,
  };
}

function validate(form: FormState, isEdit: boolean): FieldErrors {
  const errors: FieldErrors = {};

  if (!form.full_name.trim()) {
    errors.full_name = "El nombre es obligatorio.";
  }

  if (!form.email.trim()) {
    errors.email = "El email es obligatorio.";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    errors.email = "El email no es válido.";
  }

  if (form.password && form.password.length < 8) {
    errors.password = "La contraseña debe tener al menos 8 caracteres.";
  }

  return errors;
}

export function ResidentFormDialog({
  open,
  onOpenChange,
  resident = null,
  onCreate,
  onUpdate,
}: ResidentFormDialogProps) {
  const isEdit = resident !== null;
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [bedrooms, setBedrooms] = useState<AvailableBedroom[]>([]);
  const [bedroomsLoading, setBedroomsLoading] = useState(false);

  // Sync form and load available bedrooms when the dialog opens
  useEffect(() => {
    if (!open) return;
    setForm(isEdit ? toFormState(resident!) : EMPTY_FORM);
    setErrors({});

    setBedroomsLoading(true);
    // En edición excluimos al propio residente para que su habitación actual aparezca disponible
    listAvailableBedrooms(isEdit ? resident!.id : undefined)
      .then(setBedrooms)
      .catch(() => setBedrooms([]))
      .finally(() => setBedroomsLoading(false));
  }, [open, resident, isEdit]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  async function handleSubmit() {
    const fieldErrors = validate(form, isEdit);
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }

    setSubmitting(true);
    let ok: boolean;

    if (isEdit) {
      const payload: UpdateResidentPayload = {
        full_name: form.full_name.trim(),
        email: form.email.trim().toLowerCase(),
        bedroom_id: form.bedroom_id,
        check_in_date: form.checkin_date || null,
        is_active: form.is_active,
      };
      ok = await onUpdate(resident!.id, payload);
    } else {
      const payload: CreateResidentPayload = {
        full_name: form.full_name.trim(),
        email: form.email.trim().toLowerCase(),
        ...(form.password ? { password: form.password } : {}),
        bedroom_id: form.bedroom_id,
        checkin_date: form.checkin_date || null,
        is_active: form.is_active,
      };
      ok = await onCreate(payload);
    }

    setSubmitting(false);
    if (ok) onOpenChange(false);
  }

  // Etiqueta del dropdown: "101 · Edif. A (Individual — 0/1)"
  function bedroomLabel(b: AvailableBedroom): string {
    const edif = b.edificio ? ` · Edif. ${b.edificio}` : "";
    return `${b.numero}${edif} (${b.tipo} — ${b.ocupantes_actuales}/${b.capacidad_maxima})`;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Editar Residente" : "Nuevo Residente"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Modifica los datos del residente."
              : "Completa los datos del nuevo residente."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          {/* Full name */}
          <div className="space-y-1.5">
            <Label htmlFor="res-fullname">Nombre completo *</Label>
            <Input
              id="res-fullname"
              placeholder="Ej: María González"
              value={form.full_name}
              onChange={(e) => set("full_name", e.target.value)}
              aria-invalid={!!errors.full_name}
            />
            {errors.full_name && (
              <p className="text-xs text-red-600">{errors.full_name}</p>
            )}
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <Label htmlFor="res-email">Email *</Label>
            <Input
              id="res-email"
              type="email"
              placeholder="residente@email.com"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              aria-invalid={!!errors.email}
            />
            {errors.email && (
              <p className="text-xs text-red-600">{errors.email}</p>
            )}
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <Label htmlFor="res-password">
              Contraseña {isEdit ? "(dejar en blanco para no cambiar)" : "(opcional — se enviará email de bienvenida si está vacía)"}
            </Label>
            <Input
              id="res-password"
              type="password"
              placeholder={isEdit ? "Nueva contraseña" : "Contraseña temporal"}
              value={form.password}
              onChange={(e) => set("password", e.target.value)}
              aria-invalid={!!errors.password}
            />
            {errors.password && (
              <p className="text-xs text-red-600">{errors.password}</p>
            )}
          </div>

          {/* Bedroom dropdown */}
          <div className="space-y-1.5">
            <Label htmlFor="res-bedroom">Habitación</Label>
            {bedroomsLoading ? (
              <p className="text-xs text-gray-400 py-2">Cargando habitaciones disponibles…</p>
            ) : (
              <NativeSelect
                id="res-bedroom"
                value={form.bedroom_id ?? ""}
                onChange={(e) =>
                  set("bedroom_id", e.target.value ? Number(e.target.value) : null)
                }
              >
                <option value="">Sin asignar</option>
                {bedrooms.map((b) => (
                  <option key={b.id} value={b.id}>
                    {bedroomLabel(b)}
                  </option>
                ))}
              </NativeSelect>
            )}
            {bedrooms.length === 0 && !bedroomsLoading && (
              <p className="text-xs text-amber-600">No hay habitaciones disponibles con hueco libre.</p>
            )}
          </div>

          {/* Check-in date */}
          <div className="space-y-1.5">
            <Label htmlFor="res-checkin">Fecha de Check-in</Label>
            <Input
              id="res-checkin"
              type="date"
              value={form.checkin_date}
              onChange={(e) => set("checkin_date", e.target.value)}
            />
          </div>

          {/* Status */}
          <div className="space-y-1.5">
            <Label htmlFor="res-status">Estado *</Label>
            <NativeSelect
              id="res-status"
              value={form.is_active ? "active" : "inactive"}
              onChange={(e) => set("is_active", e.target.value === "active")}
            >
              <option value="active">Activo</option>
              <option value="inactive">Inactivo</option>
            </NativeSelect>
          </div>
        </div>

        <DialogFooter className="mt-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className="bg-[#509550] hover:bg-[#3d7a3d] text-white"
          >
            {isEdit ? (
              <>
                <Edit2 className="w-4 h-4" />
                {submitting ? "Guardando…" : "Guardar cambios"}
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                {submitting ? "Creando…" : "Agregar residente"}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface FormState {
  full_name: string;
  email: string;
  password: string;
  room: string;
  building: string;
  checkin_date: string;
  is_active: boolean;
}

type FieldErrors = Partial<Record<keyof FormState, string>>;

interface ResidentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Provide a resident to enter edit mode; omit or pass null for create mode. */
  resident?: Resident | null;
  onCreate: (payload: CreateResidentPayload) => Promise<boolean>;
  onUpdate: (id: number, payload: UpdateResidentPayload) => Promise<boolean>;
}

const EMPTY_FORM: FormState = {
  full_name: "",
  email: "",
  password: "",
  room: "",
  building: "",
  checkin_date: "",
  is_active: true,
};

function toFormState(resident: Resident): FormState {
  return {
    full_name: resident.full_name,
    email: resident.email,
    password: "",
    room: resident.room,
    building: resident.building,
    checkin_date: resident.check_in_date ?? "",
    is_active: resident.is_active,
  };
}

function validate(form: FormState, isEdit: boolean): FieldErrors {
  const errors: FieldErrors = {};

  if (!form.full_name.trim()) {
    errors.full_name = "El nombre es obligatorio.";
  }

  if (!form.email.trim()) {
    errors.email = "El email es obligatorio.";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    errors.email = "El email no es válido.";
  }

  if (!isEdit || form.password) {
    if (!isEdit && !form.password) {
      // password optional on create (backend sends reset email)
    } else if (form.password && form.password.length < 8) {
      errors.password = "La contraseña debe tener al menos 8 caracteres.";
    }
  }

  if (!form.room.trim()) {
    errors.room = "La habitación es obligatoria.";
  }

  if (!form.building.trim()) {
    errors.building = "El edificio es obligatorio.";
  }

  return errors;
}

export function ResidentFormDialog({
  open,
  onOpenChange,
  resident = null,
  onCreate,
  onUpdate,
}: ResidentFormDialogProps) {
  const isEdit = resident !== null;
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);

  // Sync form when the dialog opens or the target resident changes
  useEffect(() => {
    if (open) {
      setForm(isEdit ? toFormState(resident!) : EMPTY_FORM);
      setErrors({});
    }
  }, [open, resident, isEdit]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    // Clear error on change
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  async function handleSubmit() {
    const fieldErrors = validate(form, isEdit);
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }

    setSubmitting(true);
    let ok: boolean;

    if (isEdit) {
      const payload: UpdateResidentPayload = {
        full_name: form.full_name.trim(),
        email: form.email.trim().toLowerCase(),
        room: form.room.trim(),
        building: form.building.trim(),
        check_in_date: form.checkin_date || null,
        is_active: form.is_active,
      };
      ok = await onUpdate(resident!.id, payload);
    } else {
      const payload: CreateResidentPayload = {
        full_name: form.full_name.trim(),
        email: form.email.trim().toLowerCase(),
        ...(form.password ? { password: form.password } : {}),
        room: form.room.trim(),
        building: form.building.trim(),
        checkin_date: form.checkin_date || null,
        is_active: form.is_active,
      };
      ok = await onCreate(payload);
    }

    setSubmitting(false);
    if (ok) onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Editar Residente" : "Nuevo Residente"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Modifica los datos del residente."
              : "Completa los datos del nuevo residente."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          {/* Full name */}
          <div className="space-y-1.5">
            <Label htmlFor="res-fullname">Nombre completo *</Label>
            <Input
              id="res-fullname"
              placeholder="Ej: María González"
              value={form.full_name}
              onChange={(e) => set("full_name", e.target.value)}
              aria-invalid={!!errors.full_name}
            />
            {errors.full_name && (
              <p className="text-xs text-red-600">{errors.full_name}</p>
            )}
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <Label htmlFor="res-email">Email *</Label>
            <Input
              id="res-email"
              type="email"
              placeholder="residente@email.com"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              aria-invalid={!!errors.email}
            />
            {errors.email && (
              <p className="text-xs text-red-600">{errors.email}</p>
            )}
          </div>

          {/* Password — shown for both modes: mandatory on create, optional on edit */}
          <div className="space-y-1.5">
            <Label htmlFor="res-password">
              Contraseña {isEdit ? "(dejar en blanco para no cambiar)" : "(opcional — se enviará email de bienvenida si está vacía)"}
            </Label>
            <Input
              id="res-password"
              type="password"
              placeholder={isEdit ? "Nueva contraseña" : "Contraseña temporal"}
              value={form.password}
              onChange={(e) => set("password", e.target.value)}
              aria-invalid={!!errors.password}
            />
            {errors.password && (
              <p className="text-xs text-red-600">{errors.password}</p>
            )}
          </div>

          {/* Room + Building */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="res-room">Habitación *</Label>
              <Input
                id="res-room"
                placeholder="Ej: 302-B"
                value={form.room}
                onChange={(e) => set("room", e.target.value)}
                aria-invalid={!!errors.room}
              />
              {errors.room && (
                <p className="text-xs text-red-600">{errors.room}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="res-building">Edificio *</Label>
              <Input
                id="res-building"
                placeholder="Ej: A"
                value={form.building}
                onChange={(e) => set("building", e.target.value)}
                aria-invalid={!!errors.building}
              />
              {errors.building && (
                <p className="text-xs text-red-600">{errors.building}</p>
              )}
            </div>
          </div>

          {/* Check-in date */}
          <div className="space-y-1.5">
            <Label htmlFor="res-checkin">Fecha de Check-in</Label>
            <Input
              id="res-checkin"
              type="date"
              value={form.checkin_date}
              onChange={(e) => set("checkin_date", e.target.value)}
            />
          </div>

          {/* Status */}
          <div className="space-y-1.5">
            <Label htmlFor="res-status">Estado *</Label>
            <NativeSelect
              id="res-status"
              value={form.is_active ? "active" : "inactive"}
              onChange={(e) => set("is_active", e.target.value === "active")}
            >
              <option value="active">Activo</option>
              <option value="inactive">Inactivo</option>
            </NativeSelect>
          </div>
        </div>

        <DialogFooter className="mt-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className="bg-[#509550] hover:bg-[#3d7a3d] text-white"
          >
            {isEdit ? (
              <>
                <Edit2 className="w-4 h-4" />
                {submitting ? "Guardando…" : "Guardar cambios"}
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                {submitting ? "Creando…" : "Agregar residente"}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
