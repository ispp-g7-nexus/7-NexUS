import { type FormEvent, useEffect, useState } from "react";
import { CalendarDays, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";

import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "../../../components/ui/sheet";
import { useIsMobile } from "../../../components/ui/use-mobile";
import {
  createReservation,
  getSpaceAvailability,
  isApiError,
  type CommonSpace,
  type SpaceAvailability,
} from "../../../services/reservations";

interface ReservationFormSheetProps {
  open: boolean;
  initialDate: string;
  space: CommonSpace | null;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

// Interfaz para los slots que nos manda el backend refactorizado
interface TimeSlot {
  start_time: string;
  end_time: string;
  status: "available" | "occupied";
}

function getTodayDateString(): string {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().split("T")[0];
}

// Función auxiliar para formatear "2024-03-18T16:00:00Z" a "16:00"
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

  // Slot seleccionado por el usuario
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  
  // Estado para el acordeón (solo se usa si intervalo < 30 mins)
  const [expandedHour, setExpandedHour] = useState<string | null>(null);

  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !space) return;

    const fetchAvailability = async () => {
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
    };

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
      setError(isApiError(err) ? err.message : "Error al crear la reserva.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Lógica de agrupación si hay muchos tramos (< 30 min)
  const slots = (availability?.available_slots as unknown as TimeSlot[]) || [];
  const needsGrouping = space && space.reservation_interval_minutes < 30;

  // Agrupamos los slots por su hora de inicio (ej: "16:00" agrupa 16:00, 16:10, 16:20)
  const groupedSlots = slots.reduce((acc, slot) => {
    const hourKey = formatTime(slot.start_time).split(":")[0] + ":00";
    if (!acc[hourKey]) acc[hourKey] = [];
    acc[hourKey].push(slot);
    return acc;
  }, {} as Record<string, TimeSlot[]>);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={isMobile ? "bottom" : "right"}
        className={isMobile ? "max-h-[90vh] rounded-t-xl" : "w-full sm:max-w-md flex flex-col"}
      >
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-border">
          <SheetTitle>Nueva reserva</SheetTitle>
          <SheetDescription>{space ? space.name : "Selecciona un espacio"}</SheetDescription>
        </SheetHeader>

        {space && (
          <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-6 p-6 overflow-y-auto">
            
            {/* 1. Selector de fecha */}
            <div className="space-y-2">
              <label htmlFor="drawer-date" className="flex items-center gap-2 text-sm font-medium text-foreground">
                <CalendarDays className="h-4 w-4" /> Fecha de la reserva
              </label>
              <Input
                id="drawer-date"
                type="date"
                min={getTodayDateString()}
                value={localDate}
                onChange={(e) => setLocalDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-3">
              <label className="text-sm font-medium text-foreground flex items-center justify-between">
                <span>Horas disponibles</span>
                <span className="text-xs text-muted-foreground font-normal">
                  Tramos de {space.reservation_interval_minutes} min
                </span>
              </label>

              {loadingAvailability ? (
                <div className="rounded-lg border border-border bg-muted/30 p-8 text-center">
                  <p className="text-sm text-muted-foreground animate-pulse">Cargando disponibilidad...</p>
                </div>
              ) : slots.length === 0 ? (
                <div className="rounded-lg border border-border bg-muted/30 p-8 text-center">
                  <p className="text-sm text-muted-foreground">No hay huecos generados para este espacio hoy.</p>
                </div>
              ) : needsGrouping ? (
                // RENDERIZADO TIPO B: Acordeón para intervalos < 30 min
                <div className="space-y-2">
                  {Object.entries(groupedSlots).map(([hourLabel, hourSlots]) => {
                    const isExpanded = expandedHour === hourLabel;
                    // Comprobamos si hay al menos un hueco libre en esta hora para pintar la cabecera gris si está todo lleno
                    const isHourFullyOccupied = hourSlots.every(s => s.status === "occupied");

                    return (
                      <div key={hourLabel} className="rounded-md border border-border overflow-hidden">
                        <button
                          type="button"
                          onClick={() => setExpandedHour(isExpanded ? null : hourLabel)}
                          className={`flex w-full items-center justify-between px-4 py-3 text-sm font-medium transition-colors hover:bg-muted/50 ${isHourFullyOccupied ? "bg-muted/30 text-muted-foreground" : "bg-card text-foreground"}`}
                        >
                          <span>{hourLabel}</span>
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </button>
                        
                        {isExpanded && (
                          <div className="grid grid-cols-2 gap-2 p-3 bg-muted/10 border-t border-border sm:grid-cols-3">
                            {hourSlots.map((slot, idx) => {
                              const isSelected = selectedSlot?.start_time === slot.start_time;
                              const isOccupied = slot.status === "occupied";
                              return (
                                <SlotButton
                                  key={idx}
                                  slot={slot}
                                  isSelected={isSelected}
                                  isOccupied={isOccupied}
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
                // RENDERIZADO TIPO A: Cuadrícula plana para intervalos >= 30 min
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {slots.map((slot, index) => {
                    const isSelected = selectedSlot?.start_time === slot.start_time;
                    const isOccupied = slot.status === "occupied";
                    return (
                      <SlotButton
                        key={index}
                        slot={slot}
                        isSelected={isSelected}
                        isOccupied={isOccupied}
                        onClick={() => setSelectedSlot(slot)}
                      />
                    );
                  })}
                </div>
              )}
            </div>

            {/* 3. Notas */}
            <div className="space-y-2">
              <label htmlFor="reservation-notes" className="block text-sm font-medium text-foreground">
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

            <SheetFooter className="mt-auto pt-4 border-t border-border">
              <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting || !selectedSlot} className="bg-[#4A7C59] hover:bg-[#4A7C59]/90 text-white">
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

// Componente auxiliar para el botón del tramo horario para no repetir código
function SlotButton({ 
  slot, 
  isSelected, 
  isOccupied, 
  onClick 
}: { 
  slot: TimeSlot; 
  isSelected: boolean; 
  isOccupied: boolean; 
  onClick: () => void; 
}) {
  return (
    <button
      type="button"
      disabled={isOccupied}
      onClick={onClick}
      className={`
        relative flex items-center justify-center rounded-md px-3 py-2 text-sm font-medium transition-all duration-200
        ${
          isOccupied
            ? "bg-muted/50 text-muted-foreground/50 line-through cursor-not-allowed border border-transparent"
            : isSelected
            ? "bg-[#4A7C59] text-white shadow-md border border-[#4A7C59] scale-[1.02]"
            : "bg-background text-foreground border border-border hover:border-[#4A7C59] hover:text-[#4A7C59] hover:bg-[#4A7C59]/5"
        }
      `}
    >
      {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
    </button>
  );
}