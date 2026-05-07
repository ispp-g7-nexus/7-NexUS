import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import type { SpaceReservation } from "../../../services/reservations";

interface MyReservationsListProps {
  reservations: SpaceReservation[];
  loading: boolean;
  cancellingId: number | null;
  onCancel: (reservationId: number) => void;
}

function formatDateTime(dateTime: string): string {
  const date = new Date(dateTime);
  return new Intl.DateTimeFormat("es-ES", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function canCancelReservation(reservation: SpaceReservation): boolean {
  return reservation.status === "active" && new Date(reservation.end_time) > new Date();
}

export function MyReservationsList({ reservations, loading, cancellingId, onCancel }: MyReservationsListProps) {
  return (
    <Card className="border-border/80 shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Mis reservas</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-gray-500">Cargando tus reservas...</p>
        ) : reservations.length === 0 ? (
          <p className="text-sm text-gray-500">Aún no tienes reservas.</p>
        ) : (
          <div className="space-y-3">
            {reservations.map((reservation) => (
              <article key={reservation.id} className="rounded-lg border border-border/80 bg-background px-4 py-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{reservation.space.name}</p>
                    <p className="mt-1 text-sm text-gray-500">
                      {formatDateTime(reservation.start_time)} - {formatDateTime(reservation.end_time)}
                    </p>
                    {reservation.notes && (
                      <p className="mt-1 max-w-full text-xs text-gray-500 whitespace-pre-wrap break-words [overflow-wrap:anywhere] [word-break:break-word]">
                        Nota: {reservation.notes}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                        reservation.status === "active" ? "bg-primary/10 text-primary" : "bg-slate-200 text-gray-500"
                      }`}
                    >
                      {reservation.status === "active" ? "Activa" : "Cancelada"}
                    </span>
                    {canCancelReservation(reservation) && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onCancel(reservation.id)}
                        disabled={cancellingId === reservation.id}
                      >
                        {cancellingId === reservation.id ? "Cancelando..." : "Cancelar"}
                      </Button>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
