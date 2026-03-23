import { useEffect, useState } from "react";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import type { AdminSpace, CreateSpacePayload } from "../../../services/adminSpaces";

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
};

export function SpaceFormSheet({
  open,
  space,
  isSubmitting,
  onOpenChange,
  onSubmit,
}: SpaceFormSheetProps) {
  const [form, setForm] = useState<CreateSpacePayload>(EMPTY_FORM);

  useEffect(() => {
    if (open) {
      setForm(
        space
          ? {
              name: space.name,
              description: space.description,
              capacity: space.capacity,
              open_time: space.open_time.slice(0, 5),
              close_time: space.close_time.slice(0, 5),
              reservation_interval_minutes: space.reservation_interval_minutes,
              is_active: space.is_active,
            }
          : EMPTY_FORM,
      );
    }
  }, [open, space]);

  if (!open) return null;

  const set = <K extends keyof CreateSpacePayload>(key: K, value: CreateSpacePayload[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(form);
  };

  const isEditing = space !== null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <Card className="w-full max-w-lg shadow-xl">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle className="text-lg font-semibold">
            {isEditing ? "Editar espacio" : "Nuevo espacio"}
          </CardTitle>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            aria-label="Cerrar"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Nombre *</label>
              <input
                required
                type="text"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                className="border-input bg-background focus-visible:ring-ring/50 w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-[3px]"
                placeholder="Salón de usos múltiples"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Descripción</label>
              <textarea
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                rows={3}
                className="border-input bg-background focus-visible:ring-ring/50 w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-[3px] resize-none"
                placeholder="Describe el espacio..."
              />
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
              <label htmlFor="reservation-interval-minutes" className="text-sm font-medium">Intervalo de reserva(minutos) *</label>
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

            <div className="flex justify-end gap-3 pt-2">
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
