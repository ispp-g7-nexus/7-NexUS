// src/pages/Staff/components/StaffFormDialog.tsx
import { useEffect, useState } from "react";
import { Edit, UserPlus } from "lucide-react";
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
import type { StaffMember, StaffPayload, StaffStatus } from "../../../services/staff";
import { roleService, type Role } from "../../../services/roles";

type FormState = Omit<StaffPayload, 'password'> & { password: string; role_id: number | null };
type FieldErrors = Partial<Record<keyof FormState, string>>;

const EMPTY_FORM: FormState = {
  full_name: "",
  job_title: "",
  department: "",
  email: "",
  password: "",
  location: "",
  schedule: "",
  status: "active",
  role_id: null,
};

function toFormState(m: StaffMember): FormState {
  return {
    full_name: m.full_name,
    job_title: m.job_title,
    department: m.department,
    email: m.email,
    password: "",
    location: m.location,
    schedule: m.schedule,
    status: m.status,
    role_id: m.role_id ?? null,
  };
}

function validate(form: FormState, isEdit: boolean): FieldErrors {
  const errors: FieldErrors = {};
  if (!form.full_name.trim()) errors.full_name = "El nombre es obligatorio.";
  if (!form.job_title.trim()) errors.job_title = "El cargo es obligatorio.";
  if (!form.department.trim()) errors.department = "El departamento es obligatorio.";
  if (!form.email.trim()) {
    errors.email = "El email es obligatorio.";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    errors.email = "El email no es válido.";
  }
  if (!isEdit && !form.password.trim()) {
    errors.password = "La contraseña es obligatoria al crear un trabajador.";
  } else if (form.password.trim() && form.password.trim().length < 8) {
    errors.password = "La contraseña debe tener al menos 8 caracteres.";
  }
  if (!form.location.trim()) errors.location = "La ubicación es obligatoria.";
  if (!form.schedule.trim()) errors.schedule = "El horario es obligatorio.";
  return errors;
}

const DEPARTMENTS = [
  "Administración",
  "Mantenimiento",
  "Cocina",
  "Recepción",
  "Limpieza",
  "Seguridad",
];

interface StaffFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member?: StaffMember | null;
  onCreate: (payload: StaffPayload) => Promise<boolean>;
  onUpdate: (id: number, payload: Partial<StaffPayload>) => Promise<boolean>;
}

export function StaffFormDialog({
  open,
  onOpenChange,
  member = null,
  onCreate,
  onUpdate,
}: StaffFormDialogProps) {
  const isEdit = member !== null;
  const [availableRoles, setAvailableRoles] = useState<Role[]>([]);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(isEdit ? toFormState(member!) : EMPTY_FORM);
      setErrors({});
      roleService.getRoles()
        .then((roles) => setAvailableRoles(roles.filter((r) => r.name.toLowerCase() !== "student")))
        .catch(() => setAvailableRoles([]));
    }
  }, [open, member, isEdit]);

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
    const payload: StaffPayload = {
      ...form,
      email: form.email.trim().toLowerCase(),
      password: form.password.trim() || undefined,
    };
    const ok = isEdit
      ? await onUpdate(member!.id, payload)
      : await onCreate(payload);
    setSubmitting(false);
    if (ok) onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Editar miembro del personal" : "Añadir nuevo personal"}
          </DialogTitle>
          <DialogDescription>
            {isEdit ? "Modifica los datos del trabajador." : "Introduce los datos del nuevo trabajador."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="sf-name">Nombre completo *</Label>
            <Input
              id="sf-name"
              placeholder="Juan Pérez"
              value={form.full_name}
              onChange={(e) => set("full_name", e.target.value)}
              aria-invalid={!!errors.full_name}
            />
            {errors.full_name && <p className="text-xs text-red-600">{errors.full_name}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sf-title">Cargo *</Label>
            <Input
              id="sf-title"
              placeholder="Responsable de…"
              value={form.job_title}
              onChange={(e) => set("job_title", e.target.value)}
              aria-invalid={!!errors.job_title}
            />
            {errors.job_title && <p className="text-xs text-red-600">{errors.job_title}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sf-dept">Departamento *</Label>
            <NativeSelect
              id="sf-dept"
              value={form.department}
              onChange={(e) => set("department", e.target.value)}
              aria-invalid={!!errors.department}
            >
              <option value="">Selecciona un departamento</option>
              {DEPARTMENTS.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </NativeSelect>
            {errors.department && <p className="text-xs text-red-600">{errors.department}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sf-email">Email *</Label>
            <Input
              id="sf-email"
              type="email"
              placeholder="contacto@residencia.com"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              aria-invalid={!!errors.email}
            />
            {errors.email && <p className="text-xs text-red-600">{errors.email}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sf-password">
              Contraseña {isEdit ? <span className="text-gray-400 font-normal">(dejar vacío para no cambiar)</span> : "*"}
            </Label>
            <Input
              id="sf-password"
              type="password"
              placeholder={isEdit ? "Nueva contraseña (opcional)" : "Mínimo 8 caracteres"}
              value={form.password}
              onChange={(e) => set("password", e.target.value)}
              aria-invalid={!!errors.password}
              autoComplete="new-password"
            />
            {errors.password && <p className="text-xs text-red-600">{errors.password}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sf-location">Ubicación *</Label>
            <Input
              id="sf-location"
              placeholder="Oficina Principal – Planta 1"
              value={form.location}
              onChange={(e) => set("location", e.target.value)}
              aria-invalid={!!errors.location}
            />
            {errors.location && <p className="text-xs text-red-600">{errors.location}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sf-schedule">Horario *</Label>
            <Input
              id="sf-schedule"
              placeholder="Lunes a Viernes 9:00–18:00"
              value={form.schedule}
              onChange={(e) => set("schedule", e.target.value)}
              aria-invalid={!!errors.schedule}
            />
            {errors.schedule && <p className="text-xs text-red-600">{errors.schedule}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sf-status">Estado *</Label>
            <NativeSelect
              id="sf-status"
              value={form.status}
              onChange={(e) => set("status", e.target.value as StaffStatus)}
            >
              <option value="active">Activo</option>
              <option value="holidays">De Vacaciones</option>
              <option value="inactive">Inactivo</option>
            </NativeSelect>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sf-role">Rol</Label>
            <NativeSelect
              id="sf-role"
              value={form.role_id ?? ""}
              onChange={(e) => set("role_id", e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">Sin rol asignado</option>
              {availableRoles.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </NativeSelect>
          </div>
        </div>

        <DialogFooter className="mt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className="bg-[#509550] hover:bg-[#509550]/90 text-white"
          >
            {isEdit ? (
              <><Edit className="w-4 h-4" />{submitting ? "Guardando…" : "Guardar cambios"}</>
            ) : (
              <><UserPlus className="w-4 h-4" />{submitting ? "Añadiendo…" : "Añadir personal"}</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
