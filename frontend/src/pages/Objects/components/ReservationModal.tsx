import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { InteractiveDatePicker } from "../../../components/ui/InteractiveDatePicker";
import { Button } from "../../../components/ui/button";
import { useIsMobile } from "../../../components/ui/use-mobile";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "../../../components/ui/sheet";
import {
  objectsService,
  type ObjectAvailability,
  type ObjectAvailabilityReservation,
  type ObjectAvailabilitySlot,
  type ObjectItem,
  type ReservationRequest,
} from "../../../services/objects.ts";
import { authService } from "../../../services/auth";

interface ReservationModalProps {
  object: ObjectItem;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ReservationModal({ object, isOpen, onClose, onSuccess }: ReservationModalProps) {
  const isMobile = useIsMobile();

  const [selectedDate, setSelectedDate] = useState("");
  const [availability, setAvailability] = useState<ObjectAvailability | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<ObjectAvailabilitySlot | null>(null);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const todayDate = useMemo(() => {
    const now = new Date();
    return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().split("T")[0];
  }, []);

  const allSlots = availability?.available_slots ?? [];
  const selectableSlots = allSlots.filter((slot) => slot.status === "available");

  const loadAvailability = async (date: string) => {
    try {
      setLoadingAvailability(true);
      setError(null);
      const data = await objectsService.getObjectAvailability(object.id, date);
      setAvailability(data);
      setSelectedSlot(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al cargar disponibilidad";
      setError(message);
      toast.error(message);
    } finally {
      setLoadingAvailability(false);
    }
  };

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setSelectedDate(todayDate);
    setSelectedSlot(null);
    setAvailability(null);
    setError(null);
  }, [isOpen, todayDate]);

  useEffect(() => {
    if (!isOpen || !selectedDate) {
      return;
    }

    void loadAvailability(selectedDate);
  }, [isOpen, selectedDate]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const loadCurrentUser = async () => {
      try {
        const session = await authService.me();
        const rawId = session.user?.id;
        const parsedId = Number(rawId);
        setCurrentUserId(Number.isFinite(parsedId) ? parsedId : null);
      } catch {
        setCurrentUserId(null);
      }
    };

    void loadCurrentUser();
  }, [isOpen]);

  function formatTime(isoValue: string): string {
    return new Intl.DateTimeFormat("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(isoValue));
  }

  function formatInterval(start: string, end: string): string {
    return `${formatTime(start)} - ${formatTime(end)}`;
  }

  function reservationUserDisplay(reservation: ObjectAvailabilityReservation): string {
    const fullName = `${reservation.user.first_name} ${reservation.user.last_name}`.trim();
    return fullName || reservation.user.email;
  }

  function formatSlotLabel(slot: ObjectAvailabilitySlot): string {
    const interval = formatInterval(slot.start_time, slot.end_time);
    if (slot.status === "occupied") {
      return `${interval} · Completo`;
    }

    return interval;
  }

  const selectedSlotAvailabilityText = selectedSlot
    ? `${selectedSlot.available_stock} disponibles`
    : "Selecciona una hora";

  const handleReservation = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError(null);

      if (!selectedSlot) {
        throw new Error("Selecciona un tramo horario disponible");
      }

      const reservationData: ReservationRequest = {
        start_date: selectedSlot.start_time,
        end_date: selectedSlot.end_time,
      };

      await objectsService.reserveObject(object.id, reservationData);
      toast.success("Reserva creada correctamente.");
      onSuccess();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error al realizar la reserva";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side={isMobile ? "bottom" : "right"}
        className={isMobile ? "max-h-[90vh] rounded-t-xl" : "w-full sm:max-w-md flex flex-col"}
      >
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-gray-200">
          <SheetTitle>Nueva reserva</SheetTitle>
          <SheetDescription>{object.name}</SheetDescription>
        </SheetHeader>

        <form onSubmit={handleReservation} className="flex flex-1 flex-col gap-6 overflow-y-auto p-6">
          <div className="space-y-2">
            <label htmlFor="reservation-date" className="block text-sm font-medium text-gray-900">
              Fecha de la reserva
            </label>
            <InteractiveDatePicker
              id="reservation-date"
              value={selectedDate}
              onChange={(newDate) => setSelectedDate(newDate)}
              minDate={todayDate}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-900">Reservas activas</p>
              <span className="text-xs text-gray-500">Tramos de 60 min</span>
            </div>
            {loadingAvailability ? (
              <p className="text-sm text-gray-500">Cargando reservas...</p>
            ) : (availability?.reservations.length ?? 0) === 0 ? (
              <p className="text-sm text-gray-500">No hay reservas para este objeto en la fecha elegida.</p>
            ) : (
              <ul className="max-h-28 space-y-2 overflow-y-auto rounded-md border border-border/70 bg-muted/20 p-2">
                {availability?.reservations.map((reservation) => (
                  <li key={reservation.id} className="flex items-center justify-between gap-2 rounded-md bg-background px-2 py-1.5 text-xs">
                    <span className="font-medium text-gray-900">{reservationUserDisplay(reservation)}</span>
                    <span className="text-gray-500">
                      {formatInterval(reservation.start_date, reservation.end_date)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-900">Horas disponibles</label>
            {loadingAvailability ? (
              <p className="text-sm text-gray-500">Calculando huecos...</p>
            ) : (allSlots.length ?? 0) === 0 ? (
              <p className="text-sm text-gray-500">No hay tramos disponibles para esta fecha.</p>
            ) : (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {allSlots.map((slot) => {
                  const isSelected = selectedSlot?.start_time === slot.start_time;
                  const isPast = slot.status === "past";
                  const alreadyReservedByMe =
                    currentUserId !== null &&
                    (availability?.reservations.some(
                      (reservation) =>
                        reservation.user.id === currentUserId &&
                        reservation.start_date === slot.start_time &&
                        reservation.end_date === slot.end_time,
                    ) ?? false);
                  const isFull = slot.status === "occupied";
                  const isDisabled = isPast || alreadyReservedByMe || isFull;
                  const isPastLike = isPast || alreadyReservedByMe;

                  return (
                    <button
                      type="button"
                      key={`${slot.start_time}-${slot.end_time}`}
                      disabled={isDisabled}
                      onClick={() => setSelectedSlot(slot)}
                      className={`relative flex items-center justify-center rounded-md px-3 py-2 text-sm font-medium transition-all duration-200 ${
                        isPastLike
                          ? "cursor-not-allowed border border-transparent bg-muted/20 text-muted-foreground/40"
                          : isFull
                          ? "cursor-not-allowed border border-transparent bg-muted/60 text-muted-foreground/60"
                          : isSelected
                          ? "scale-[1.02] border border-green-700 bg-green-700 text-white shadow-md"
                          : "border border-gray-200 bg-background text-gray-900 hover:border-green-700 hover:bg-green-700/5 hover:text-green-700"
                      }`}
                    >
                      {formatSlotLabel(slot)}
                    </button>
                  );
                })}
              </div>
            )}
            {!loadingAvailability && selectableSlots.length === 0 && (
              <p className="text-xs text-gray-500">No quedan tramos libres en esta fecha.</p>
            )}
          </div>

          {error && (
            <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}

          <SheetFooter className="mt-auto pt-4 border-t border-gray-200">
            <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-xs text-gray-500 sm:order-1">
                Disponibles para la hora elegida: {selectedSlotAvailabilityText}
              </div>
              <div className="flex w-full flex-col-reverse gap-2 sm:order-2 sm:w-auto sm:flex-row sm:justify-end">
                <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
                  Cancelar
                </Button>
              <Button type="submit" disabled={loading || !selectedSlot || loadingAvailability} className="bg-green-700 hover:bg-green-700/90 text-white">
                {loading ? "Reservando..." : "Confirmar reserva"}
              </Button>
              </div>
            </div>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}