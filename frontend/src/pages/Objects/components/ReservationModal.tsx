import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { Button } from "../../../components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../../../components/ui/dialog";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { objectsService, ObjectItem, ReservationRequest } from "../../../services/objects.ts";

interface ReservationModalProps {
  object: ObjectItem;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ReservationModal({ object, isOpen, onClose, onSuccess }: ReservationModalProps) {
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Set default values to now (local) and +1 hour using Date arithmetic
      const start = new Date();
      const end = new Date(start);
      end.setHours(start.getHours() + 1);
      const pad = (n: number) => String(n).padStart(2, "0");
      const startDate = start.toISOString().split("T")[0];
      const endDate = end.toISOString().split("T")[0];

      setStartDate(startDate);
      setStartTime(`${pad(start.getHours())}:00`);
      setEndDate(endDate);
      setEndTime(`${pad(end.getHours())}:00`);
      setError(null);
    }
  }, [isOpen]);

  // Calcular tiempo mínimo de fin cuando las fechas son iguales
  const minEndTime = useMemo(() => {
    if (startDate && endDate && startDate === endDate && startTime) {
      const [hours, minutes] = startTime.split(':').map(Number);
      const totalMinutes = hours * 60 + minutes + 1; // Al menos 1 minuto después
      const minHours = Math.floor(totalMinutes / 60) % 24;
      const minMinutes = totalMinutes % 60;
      return `${minHours.toString().padStart(2, '0')}:${minMinutes.toString().padStart(2, '0')}`;
    }
    return undefined;
  }, [startDate, endDate, startTime]);

  const handleReservation = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError(null);

      if (!startDate || !startTime || !endDate || !endTime) {
        throw new Error("Por favor completa todos los campos");
      }

      const startDateTime = new Date(`${startDate}T${startTime}:00`);
      const endDateTime = new Date(`${endDate}T${endTime}:00`);

      // Validar que las fechas sean válidas
      if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
        throw new Error("Formato de fecha u hora inválido");
      }

      // Validar que la fecha/hora de fin sea posterior a la de inicio
      if (endDateTime <= startDateTime) {
        throw new Error("La fecha y hora de fin deben ser posteriores a las de inicio");
      }

      // Validar que no se reserve en el pasado
      const now = new Date();
      if (startDateTime < now) {
        throw new Error("No puedes reservar en el pasado");
      }

      const reservationData: ReservationRequest = {
        start_date: startDateTime.toISOString(),
        end_date: endDateTime.toISOString()
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
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reservar "{object.name}"</DialogTitle>
          <DialogDescription>
            Completa los datos para reservar este objeto.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleReservation} className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="start-date">Fecha de inicio</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                required
              />
            </div>

            <div>
              <Label htmlFor="start-time">Hora de inicio</Label>
              <Input
                id="start-time"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="end-date">Fecha de fin</Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate || new Date().toISOString().split('T')[0]}
                required
              />
            </div>

            <div>
              <Label htmlFor="end-time">Hora de fin</Label>
              <Input
                id="end-time"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                min={minEndTime}
                required
              />
            </div>
          </div>

          {error && (
            <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
            >
              {loading ? "Reservando..." : "Confirmar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}