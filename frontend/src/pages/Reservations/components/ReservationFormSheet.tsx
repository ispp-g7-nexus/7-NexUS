import { type FormEvent, useEffect, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { InteractiveDatePicker } from "../../../components/ui/InteractiveDatePicker";
import { Button } from "../../../components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "../../../components/ui/sheet";
import { useIsMobile } from "../../../components/ui/use-mobile";
import { createReservation,
  getSpaceAvailability,
  isApiError} from "../../../services/reservations";
import type {CommonSpace,
  SpaceAvailability,
  AvailableSlot,
} from "../../../services/reservations";

interface ReservationFormSheetProps {
  open: boolean;
  initialDate: string;
  space: CommonSpace | null;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface TimeSlot {
  start_time: string;
  end_time: string;
  status: "available" | "occupied"|"past";
}


function getTodayDateString(): string {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().split("T")[0];
}

function formatTime(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function ReservationFormSheet({
  open,
  initialDate,
  space,
  onOpenChange,
  onSuccess,
}: ReservationFormSheetProps) {
  const isMobile = useIsMobile();

  const [localDate, setLocalDate] = useState(initialDate); 
  const [availability, setAvailability] = useState<SpaceAvailability | null>(null);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [expandedHour, setExpandedHour] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchAvailability() {
    if (!space) return;
    setLoadingAvailability(true);
    setError(null);
    setSelectedSlot(null);
    setExpandedHour(null);
    try {
      const data = await getSpaceAvailability(space.id, localDate);
      setAvailability(data);
    } catch (err) {
      setError("No se pudo cargar la disponibilidad para esta fecha.");
    } finally {
      setLoadingAvailability(false);
    }
  }

  useEffect(() => {
    if (!open || !space) return;
    void fetchAvailability();
  }, [open, space, localDate]);

  useEffect(() => {
    if (open) {
      setLocalDate(initialDate);
      setNotes("");
      setError(null);
      setSelectedSlot(null);
    }
  }, [open, initialDate]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!space || !selectedSlot) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await createReservation(space.id, {
        start_time: selectedSlot.start_time,
        end_time: selectedSlot.end_time,
        notes: notes.trim(),
      });
      toast.success("Reserva confirmada con éxito.");
      onSuccess();
    } catch (err) {
      if (isApiError(err)) {
        const apiErr = err;
        if (apiErr.status === 400) {
          const backendMsg = apiErr.message && String(apiErr.message).trim();
          const userMessage = backendMsg || "Esa franja ya no está disponible. Se ha actualizado la disponibilidad.";
          setError(userMessage);
          toast.error(userMessage);
          void fetchAvailability();
          setSelectedSlot(null);
        } else if (apiErr.status >= 500) {
          const userMessage = "Error del servidor. Inténtalo de nuevo más tarde.";
          setError(userMessage);
          toast.error(userMessage);
        } else if (apiErr.status === 401 || apiErr.status === 403) {
          const userMessage = apiErr.message || "No tienes permisos para realizar esta acción.";
          setError(userMessage);
          toast.error(userMessage);
        } else {
          const userMessage = apiErr.message || "Error al crear la reserva.";
          setError(userMessage);
          toast.error(userMessage);
        }
      } else {
        const userMessage = (err instanceof Error && err.message && err.message.includes("Failed to fetch"))
          ? "Error de conexión. Revisa tu red e inténtalo de nuevo." 
          : "Error al crear la reserva.";
        setError(userMessage);
        toast.error(userMessage);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const slots: AvailableSlot[] = availability?.available_slots || [];
  const needsGrouping = space && space.reservation_interval_minutes < 30;

  const groupedSlots = slots.reduce((acc, slot) => {
    const hourKey = formatTime(slot.start_time).split(":")[0] + ":00";
    if (!acc[hourKey]) acc[hourKey] = [];
    acc[hourKey].push(slot);
    return acc;
  }, {} as Record<string, AvailableSlot[]>);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={isMobile ? "bottom" : "right"}
        className={isMobile ? "max-h-[90vh] rounded-t-xl" : "w-full sm:max-w-md flex flex-col"}
      >
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-gray-200">
          <SheetTitle>Nueva reserva</SheetTitle>
          <SheetDescription>{space ? space.name : "Selecciona un espacio"}</SheetDescription>
        </SheetHeader>

        {space && (
          <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-6 p-6 overflow-y-auto">
            <div className="space-y-2">
              <label htmlFor="reservation-date" className="block text-sm font-medium text-gray-900">
                Fecha de la reserva
              </label>
              <InteractiveDatePicker
                id="reservation-date"
                value={localDate}
                onChange={(newDate) => setLocalDate(newDate)}
                minDate={getTodayDateString()}
              />
            </div>
            <div className="space-y-3">
              <label className="text-sm font-medium text-gray-900 flex items-center justify-between">
                <span>Horas disponibles</span>
                <span className="text-xs text-gray-500 font-normal">
                  Tramos de {space.reservation_interval_minutes} min
                </span>
              </label>

              {loadingAvailability ? (
                <div className="rounded-lg border border-gray-200 bg-muted/30 p-8 text-center">
                  <p className="text-sm text-gray-500 animate-pulse">Cargando disponibilidad...</p>
                </div>
              ) : slots.length === 0 ? (
                <div className="rounded-lg border border-gray-200 bg-muted/30 p-8 text-center">
                  <p className="text-sm text-gray-500">No hay huecos generados para este espacio hoy.</p>
                </div>
              ) : needsGrouping ? (
                <div className="space-y-2">
                  {Object.entries(groupedSlots).map(([hourLabel, hourSlots]) => {
                    const typedHourSlots = hourSlots as AvailableSlot[];
                    const isExpanded = expandedHour === hourLabel;
                    const isHourFullyOccupied = typedHourSlots.every(s => s.status === "occupied");

                    return (
                      <div key={hourLabel} className="rounded-md border border-gray-200 overflow-hidden">
                        <button
                          type="button"
                          onClick={() => setExpandedHour(isExpanded ? null : hourLabel)}
                          className={`flex w-full items-center justify-between px-4 py-3 text-sm font-medium transition-colors hover:bg-muted/50 ${isHourFullyOccupied ? "bg-muted/30 text-gray-500" : "bg-white text-gray-900"}`}
                        >
                          <span>{hourLabel}</span>
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </button>
                        
                        {isExpanded && (
                          <div className="grid grid-cols-2 gap-2 p-3 bg-muted/10 border-t border-gray-200 sm:grid-cols-3">
                            {typedHourSlots.map((slot, idx) => {

                              const isSelected = selectedSlot?.start_time === slot.start_time;
                              return (
                                <SlotButton
                                  key={idx}
                                  slot={slot}
                                  isSelected={isSelected}
                                  onClick={() => setSelectedSlot(slot)}
                                />
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {slots.map((slot, index) => {
                    const isSelected = selectedSlot?.start_time === slot.start_time;
                    return (
                      <SlotButton
                        key={index}
                        slot={slot}
                        isSelected={isSelected}
                        onClick={() => setSelectedSlot(slot)}
                      />
                    );
                  })}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <label htmlFor="reservation-notes" className="block text-sm font-medium text-gray-900">
                Notas (opcional)
              </label>
              <textarea
                id="reservation-notes"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={3}
                maxLength={500}
                className="border-input bg-background focus-visible:ring-ring/50 w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-[3px] resize-none"
                placeholder="Ejemplo: reunión del grupo de proyecto"
              />
            </div>

            {error && (
              <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}

            <SheetFooter className="mt-auto pt-4 border-t border-gray-200">
              <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting || !selectedSlot || loadingAvailability} className="bg-green-700 hover:bg-green-700/90 text-white">
                  {isSubmitting ? "Confirmando..." : "Confirmar reserva"}
                </Button>
              </div>
            </SheetFooter>

          </form>
        )}
      </SheetContent>
    </Sheet>
  );
}
function SlotButton({ 
  slot, 
  isSelected, 
  onClick 
}: { 
  slot: TimeSlot; 
  isSelected: boolean; 
  onClick: () => void; 
}) {
  const isOccupied = slot.status === "occupied";
  const isPast = slot.status === "past";
  return (
    <button
      type="button"
      disabled={isOccupied || isPast}
      onClick={onClick}
      className={`
        relative flex items-center justify-center rounded-md px-3 py-2 text-sm font-medium transition-all duration-200
        ${
          isPast
            ? "bg-muted/20 text-muted-foreground/40 cursor-not-allowed border border-transparent" 
            : isOccupied
            ? "bg-muted/60 text-muted-foreground/60 line-through cursor-not-allowed border border-transparent" 
            : isSelected
            ? "bg-green-700 text-white shadow-md border border-green-700 scale-[1.02]" 
            : "bg-background text-gray-900 border border-gray-200 hover:border-green-700 hover:text-green-700 hover:bg-green-700/5"
        }
      `}
    >
      {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
    </button>
  );
}