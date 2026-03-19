import { type FormEvent, useEffect, useState, useRef } from "react";
import { CalendarDays, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";

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

interface TimeSlot {
  start_time: string;
  end_time: string;
  status: "available" | "occupied";
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
  const [inputDate, setInputDate] = useState(initialDate);
  const dateInputRef = useRef<HTMLInputElement>(null);
  const interactionType = useRef<'keyboard' | 'picker'>('keyboard');

  const [availability, setAvailability] = useState<SpaceAvailability | null>(null);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
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
      setInputDate(initialDate);
      setNotes("");
      setError(null);
      setSelectedSlot(null);
    }
  }, [open, initialDate]);
  const handleDateCommit = (directDate?: string) => {
    const valueToEvaluate = typeof directDate === "string" ? directDate : inputDate;

    if (!valueToEvaluate) {
      setInputDate(getTodayDateString());
      setLocalDate(getTodayDateString());
      return;
    }

    const year = parseInt(valueToEvaluate.split('-')[0], 10);
    const currentYear = new Date().getFullYear();

    if (year >= currentYear && year <= 2030) {
      setLocalDate(valueToEvaluate);
      setInputDate(valueToEvaluate);
    } else {
      setInputDate(getTodayDateString());
      setLocalDate(getTodayDateString());
    }
  };

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

  const slots = (availability?.available_slots as unknown as TimeSlot[]) || [];
  const needsGrouping = space && space.reservation_interval_minutes < 30;

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
            
            {/* 1. Selector de fecha (Refactorizado con la misma lógica UX) */}
            <div className="space-y-2">
              <label htmlFor="drawer-date" className="block text-sm font-medium text-foreground">
                Fecha de la reserva
              </label>
              <div 
                className="flex h-10 w-full items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2"
              >
                <CalendarDays 
                  className="h-4 w-4 cursor-pointer text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => {
                    interactionType.current = 'picker';
                    dateInputRef.current?.showPicker();
                  }}
                />
                <input
                  ref={dateInputRef}
                  id="drawer-date"
                  type="date"
                  min={getTodayDateString()}
                  value={inputDate}
                  required
                  onClick={() => {
                    interactionType.current = 'keyboard';
                  }}
                  onKeyDown={(e) => {
                    interactionType.current = 'keyboard';
                    if (e.key === "Enter") {
                      e.preventDefault(); // Evita que se envíe el formulario por error al pulsar Enter
                      handleDateCommit();
                    }
                  }}
                  onChange={(event) => {
                    const newValue = event.target.value;
                    setInputDate(newValue);
                    
                    if (interactionType.current === 'picker' && newValue) {
                      handleDateCommit(newValue);
                      interactionType.current = 'keyboard';
                    }
                  }}
                  onBlur={() => handleDateCommit()}
                  className="flex-1 bg-transparent outline-none border-none p-0 focus:ring-0 [&::-webkit-calendar-picker-indicator]:hidden cursor-text"
                />
              </div>
            </div>

            {/* 2. Cuadrícula de Horas Dinámica */}
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
                <div className="space-y-2">
                  {Object.entries(groupedSlots).map(([hourLabel, hourSlots]) => {
                    const isExpanded = expandedHour === hourLabel;
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

// Componente auxiliar
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