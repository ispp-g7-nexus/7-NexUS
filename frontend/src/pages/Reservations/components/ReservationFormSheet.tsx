import { type FormEvent, useEffect, useMemo, useState } from "react";

import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "../../../components/ui/sheet";
import { useIsMobile } from "../../../components/ui/use-mobile";
import type { CommonSpace, CreateReservationPayload } from "../../../services/reservations";

interface ReservationFormSheetProps {
  open: boolean;
  selectedDate: string;
  space: CommonSpace | null;
  isSubmitting: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: CreateReservationPayload) => Promise<void>;
}

function normalizeTime(timeWithSeconds: string): string {
  return timeWithSeconds.slice(0, 5);
}

function toTimeValue(timeValue: string): number {
  const [hours, minutes] = timeValue.split(":").map(Number);
  return hours * 60 + minutes;
}

function buildDateFromLocal(date: string, localTime: string): Date {
  return new Date(`${date}T${localTime}:00`);
}

function getTodayDateString(): string {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().split("T")[0];
}

export function ReservationFormSheet({
  open,
  selectedDate,
  space,
  isSubmitting,
  onOpenChange,
  onSubmit,
}: ReservationFormSheetProps) {
  const isMobile = useIsMobile();
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    setStartTime("");
    setEndTime("");
    setNotes("");
    setError(null);
  }, [open, space, selectedDate]);

  const minTime = useMemo(() => {
    if (!space) {
      return undefined;
    }

    const openTime = normalizeTime(space.open_time);
    if (selectedDate !== getTodayDateString()) {
      return openTime;
    }

    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const openMinutes = toTimeValue(openTime);
    const effective = Math.max(nowMinutes, openMinutes);

    const effectiveHours = String(Math.floor(effective / 60)).padStart(2, "0");
    const effectiveMinutes = String(effective % 60).padStart(2, "0");
    return `${effectiveHours}:${effectiveMinutes}`;
  }, [selectedDate, space]);

  const closeTime = space ? normalizeTime(space.close_time) : undefined;

  const validate = (): string | null => {
    if (!space) {
      return "Selecciona un espacio antes de reservar.";
    }

    if (!startTime || !endTime) {
      return "Debes indicar hora de inicio y fin.";
    }

    const startDate = buildDateFromLocal(selectedDate, startTime);
    const endDate = buildDateFromLocal(selectedDate, endTime);

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      return "Formato de hora inválido.";
    }

    if (startDate >= endDate) {
      return "La hora de fin debe ser posterior a la de inicio.";
    }

    if (startDate < new Date()) {
      return "No puedes reservar en el pasado.";
    }

    const startMinutes = toTimeValue(startTime);
    const endMinutes = toTimeValue(endTime);
    const openMinutes = toTimeValue(normalizeTime(space.open_time));
    const closeMinutes = toTimeValue(normalizeTime(space.close_time));

    if (startMinutes < openMinutes || endMinutes > closeMinutes) {
      return `Este espacio solo se puede reservar entre ${normalizeTime(space.open_time)} y ${normalizeTime(space.close_time)}.`;
    }

    return null;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);

    const payload: CreateReservationPayload = {
      start_time: buildDateFromLocal(selectedDate, startTime).toISOString(),
      end_time: buildDateFromLocal(selectedDate, endTime).toISOString(),
      notes: notes.trim(),
    };

    await onSubmit(payload);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={isMobile ? "bottom" : "right"}
        className={isMobile ? "max-h-[90vh] rounded-t-xl" : "w-full sm:max-w-md"}
      >
        <SheetHeader className="px-6 pt-6">
          <SheetTitle>Nueva reserva</SheetTitle>
          <SheetDescription>
            {space ? `${space.name} · ${selectedDate}` : "Selecciona un espacio para continuar."}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="flex h-full flex-col gap-4 px-6 pb-6">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="reservation-start" className="mb-1 block text-sm font-medium text-foreground">
                Hora de inicio
              </label>
              <Input
                id="reservation-start"
                type="time"
                value={startTime}
                min={minTime}
                max={closeTime}
                onChange={(event) => setStartTime(event.target.value)}
                required
              />
            </div>
            <div>
              <label htmlFor="reservation-end" className="mb-1 block text-sm font-medium text-foreground">
                Hora de fin
              </label>
              <Input
                id="reservation-end"
                type="time"
                value={endTime}
                min={minTime}
                max={closeTime}
                onChange={(event) => setEndTime(event.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="reservation-notes" className="mb-1 block text-sm font-medium text-foreground">
              Notas (opcional)
            </label>
            <textarea
              id="reservation-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={4}
              maxLength={500}
              className="border-input bg-input-background focus-visible:ring-ring/50 w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-[3px]"
              placeholder="Ejemplo: reunión del grupo de proyecto"
            />
          </div>

          {error && (
            <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}

          <SheetFooter className="mt-auto px-0 pb-0">
            <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                Cerrar
              </Button>
              <Button type="submit" disabled={!space || isSubmitting}>
                {isSubmitting ? "Reservando..." : "Confirmar reserva"}
              </Button>
            </div>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
