import { useState, useEffect } from "react";
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
      // Set default values to today and next hour
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      const currentHour = now.getHours();
      const nextHour = currentHour + 1;
      
      setStartDate(today);
      setStartTime(`${currentHour.toString().padStart(2, '0')}:00`);
      setEndDate(today);
      setEndTime(`${nextHour.toString().padStart(2, '0')}:00`);
    }
  }, [isOpen]);

  const handleReservation = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError(null);

      if (!startDate || !startTime || !endDate || !endTime) {
        throw new Error("Por favor completa todos los campos");
      }

      const startDateTime = `${startDate}T${startTime}:00`;
      const endDateTime = `${endDate}T${endTime}:00`;

      const reservationData: ReservationRequest = {
        start_date: startDateTime,
        end_date: endDateTime
      };

      await objectsService.reserveObject(object.id, reservationData);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al realizar la reserva");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-xl p-6 max-w-sm w-full border border-border shadow-lg">
        <h3 className="text-lg font-semibold mb-4 text-foreground">Reservar "{object.name}"</h3>
        
        <form onSubmit={handleReservation} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Fecha de inicio
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Hora de inicio
            </label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Fecha de fin
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              min={startDate || new Date().toISOString().split('T')[0]}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Hora de fin
            </label>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
              required
            />
          </div>

          {error && (
            <div className="text-destructive text-sm bg-destructive/10 p-3 rounded-lg border border-destructive/20">
              {error}
            </div>
          )}

          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-border text-foreground rounded-lg hover:bg-muted transition-colors"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 reserve-button"
              disabled={loading}
            >
              {loading ? "Reservando..." : "Confirmar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}