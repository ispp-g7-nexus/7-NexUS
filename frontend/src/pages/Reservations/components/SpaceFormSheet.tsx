import { useEffect, useState } from "react";
import { Camera, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import type { AdminSpace, CreateSpacePayload } from "../../../services/adminSpaces";
import {
  COMMON_SPACE_DESCRIPTION_MAX_LENGTH,
  COMMON_SPACE_NAME_MAX_LENGTH,
} from "../constants";

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const IMAGE_MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

interface SpaceFormSheetProps {
  open: boolean;
  space: AdminSpace | null;
  isSubmitting: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: CreateSpacePayload) => Promise<void>;
}

const EMPTY_FORM: CreateSpacePayload = {
  name: "",
  description: "",
  capacity: 1,
  open_time: "08:00",
  close_time: "22:00",
  reservation_interval_minutes: 60,
  is_active: true,
  img: ""
};

export function SpaceFormSheet({
  open,
  space,
  isSubmitting,
  onOpenChange,
  onSubmit,
}: SpaceFormSheetProps) {
  const [form, setForm] = useState<CreateSpacePayload>(EMPTY_FORM);
  const [base64Image, setBase64Image] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ name?: string; description?: string }>({});

  useEffect(() => {
    if (open) {
      if (space) {
        setForm({
          name: space.name,
          description: space.description,
          capacity: space.capacity,
          open_time: space.open_time.slice(0, 5),
          close_time: space.close_time.slice(0, 5),
          reservation_interval_minutes: space.reservation_interval_minutes,
          is_active: space.is_active,
        });
        setBase64Image(space.img || null); 
      } else {
        setForm(EMPTY_FORM);
        setBase64Image(null);
      }
      setErrors({});
    }
  }, [open, space]);

  if (!open) return null;

  const set = <K extends keyof CreateSpacePayload>(key: K, value: CreateSpacePayload[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  function validateForm(payload: CreateSpacePayload): { name?: string; description?: string } {
    const nextErrors: { name?: string; description?: string } = {};

    if (!payload.name.trim()) {
      nextErrors.name = "El nombre es obligatorio.";
    } else if (payload.name.trim().length > COMMON_SPACE_NAME_MAX_LENGTH) {
      nextErrors.name = `El nombre no puede superar los ${COMMON_SPACE_NAME_MAX_LENGTH} caracteres.`;
    }

    if ((payload.description ?? "").trim().length > COMMON_SPACE_DESCRIPTION_MAX_LENGTH) {
      nextErrors.description = `La descripción no puede superar los ${COMMON_SPACE_DESCRIPTION_MAX_LENGTH} caracteres.`;
    }

    return nextErrors;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedPayload: CreateSpacePayload = {
      ...form,
      name: form.name.trim(),
      description: (form.description ?? "").trim(),
      img: base64Image,
    };
    const nextErrors = validateForm(normalizedPayload);
    if (nextErrors.name || nextErrors.description) {
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    await onSubmit(normalizedPayload);
  };

  const isEditing = space !== null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <Card className="w-full max-w-lg shadow-xl max-h-[95vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between pb-4 sticky top-0 bg-white z-10 border-b">
          <CardTitle className="text-lg font-semibold">
            {isEditing ? "Editar espacio" : "Nuevo espacio"}
          </CardTitle>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-md p-1 text-gray-500 hover:bg-gray-50 hover:text-gray-900 transition-colors"
            aria-label="Cerrar"
          >
            <X size={20} strokeWidth={2.5} />
          </button>
        </CardHeader>

        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <label className="text-sm font-medium">Nombre *</label>
                <span className="text-xs text-gray-500">
                  {form.name.length}/{COMMON_SPACE_NAME_MAX_LENGTH}
                </span>
              </div>
              <input
                required
                type="text"
                value={form.name}
                maxLength={COMMON_SPACE_NAME_MAX_LENGTH}
                onChange={(e) => {
                  set("name", e.target.value);
                  if (errors.name) {
                    setErrors((prev) => ({ ...prev, name: undefined }));
                  }
                }}
                className="border-input bg-background focus-visible:ring-ring/50 w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-[3px]"
                placeholder="Salón de usos múltiples"
              />
              {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <label className="text-sm font-medium">Descripción</label>
                <span className="text-xs text-gray-500">
                  {form.description?.length ?? 0}/{COMMON_SPACE_DESCRIPTION_MAX_LENGTH}
                </span>
              </div>
              <textarea
                value={form.description}
                maxLength={COMMON_SPACE_DESCRIPTION_MAX_LENGTH}
                onChange={(e) => {
                  set("description", e.target.value);
                  if (errors.description) {
                    setErrors((prev) => ({ ...prev, description: undefined }));
                  }
                }}
                rows={3}
                className="border-input bg-background focus-visible:ring-ring/50 w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-[3px] resize-none break-words"
                placeholder="Describe el espacio..."
              />
              {errors.description && <p className="text-xs text-destructive">{errors.description}</p>}
            </div>

            <div className="space-y-2 text-left">
              <label className="text-sm font-medium">Imagen del espacio (Opcional)</label>
              {base64Image ? (
                <div className="relative w-full h-40 rounded-lg overflow-hidden border border-gray-200">
                  <img src={base64Image} alt="Preview" className="w-full h-full object-cover" />
                  <button 
                    type="button" 
                    onClick={() => setBase64Image(null)} 
                    className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600 transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-200 rounded-lg bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors">
                  <Camera className="w-8 h-8 mb-2 text-gray-400" />
                  <span className="text-xs font-medium text-gray-500">Subir foto del espacio</span>
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      e.target.value = "";
                      if (!file) return;
                      if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
                        toast.error("Solo se permiten imágenes (JPEG, PNG, WebP o GIF).");
                        return;
                      }
                      if (file.size > IMAGE_MAX_SIZE_BYTES) {
                        toast.error("La imagen no puede superar los 5 MB.");
                        return;
                      }
                      const r = new FileReader();
                      r.onloadend = () => setBase64Image(r.result as string);
                      r.readAsDataURL(file);
                    }}
                    className="hidden" 
                  />
                </label>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Aforo máximo *</label>
              <input
                required
                type="number"
                min={1}
                value={form.capacity}
                onChange={(e) => set("capacity", parseInt(e.target.value) || 1)}
                className="border-input bg-background focus-visible:ring-ring/50 w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-[3px]"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Hora apertura *</label>
                <input
                  required
                  type="time"
                  value={form.open_time}
                  onChange={(e) => set("open_time", e.target.value)}
                  className="border-input bg-background focus-visible:ring-ring/50 w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-[3px]"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Hora cierre *</label>
                <input
                  required
                  type="time"
                  value={form.close_time}
                  onChange={(e) => set("close_time", e.target.value)}
                  className="border-input bg-background focus-visible:ring-ring/50 w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-[3px]"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="reservation-interval-minutes" className="text-sm font-medium">Intervalo de reserva (minutos) *</label>
              <input
                id="reservation-interval-minutes"
                required
                type="number"
                min={1}
                value={form.reservation_interval_minutes}
                onChange={(e) => set("reservation_interval_minutes", Number.parseInt(e.target.value) || 1)}
                className="border-input bg-background focus-visible:ring-ring/50 w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-[3px]"
              />
            </div>

            <div className="flex items-center gap-3">
              <input
                id="is_active"
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => set("is_active", e.target.checked)}
                className="h-4 w-4 rounded border-input accent-primary"
              />
              <label htmlFor="is_active" className="text-sm font-medium select-none cursor-pointer">
                Espacio activo (visible para residentes)
              </label>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Guardando..." : isEditing ? "Guardar cambios" : "Crear espacio"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
