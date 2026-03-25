import { Calendar, Clock, MapPin, User } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { UserObjectReservation } from "../../../services/objects.ts";

interface MyReservationsProps {
  reservations: UserObjectReservation[];
  loading: boolean;
  error: string | null;
  cancellingRentalId: number | null;
  onCancel: (objectId: number, rentalId: number) => void;
  onRetry: () => void;
}

function formatDateTime(dateString: string) {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("es-ES", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function canCancelReservation(rental: any): boolean {
  return new Date(rental.end_date) > new Date();
}

export function MyReservations({ reservations, loading, error, cancellingRentalId, onCancel, onRetry }: MyReservationsProps) {
  return (
    <Card className="border-border/80 shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Mis Reservas</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-gray-500">Cargando tus reservas...</p>
        ) : error ? (
          <div className="space-y-3">
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="outline" onClick={onRetry}>
              Reintentar
            </Button>
          </div>
        ) : reservations.length === 0 ? (
          <div className="text-center py-6">
            <Calendar className="w-12 h-12 text-gray-500 mx-auto mb-3" />
            <h3 className="text-sm font-medium text-gray-900 mb-1">No tienes reservas</h3>
            <p className="text-sm text-gray-500">Cuando reserves objetos, aparecerán aquí.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {reservations.map(({ object, rental }) => (
              <ReservationCard
                key={rental.id}
                object={object}
                rental={rental}
                isCancelling={cancellingRentalId === rental.id}
                onCancel={() => onCancel(object.id, rental.id)}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ReservationCard({ 
  object, 
  rental,
  isCancelling,
  onCancel 
}: { 
  object: any; 
  rental: any;
  isCancelling: boolean;
  onCancel: () => void;
}) {
  const isUpcoming = new Date(rental.start_date) > new Date();
  const isActive = new Date(rental.start_date) <= new Date() && new Date(rental.end_date) > new Date();
  const isPast = new Date(rental.end_date) <= new Date();

  const getStatusColor = () => {
    if (isPast) return 'bg-slate-200 text-gray-500';
    if (isActive) return 'bg-primary/10 text-primary';
    return 'bg-blue-100 text-blue-800';
  };

  const getStatusText = () => {
    if (isPast) return 'Finalizada';
    if (isActive) return 'En curso';
    if (isUpcoming) return 'Próxima';
    return 'Reserva';
  };

  return (
    <article className="rounded-lg border border-border/80 bg-background px-4 py-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <p className="text-sm font-semibold text-gray-900">{object.name}</p>
            <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${getStatusColor()}`}>
              {getStatusText()}
            </span>
          </div>
          
          {object.location && (
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
              <MapPin className="h-3.5 w-3.5" />
              <span>{object.location}</span>
            </div>
          )}
          
          <div className="space-y-1 text-sm text-gray-500">
            <div className="flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5" />
              <span>Inicio: {formatDateTime(rental.start_date)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-3.5 w-3.5" />
              <span>Fin: {formatDateTime(rental.end_date)}</span>
            </div>
            <div className="flex items-center gap-2">
              <User className="h-3.5 w-3.5" />
              <span>Reservado por: {rental.user.first_name} {rental.user.last_name}</span>
            </div>
          </div>
        </div>
        
        {canCancelReservation(rental) && (
          <Button
            variant="outline"
            size="sm"
            onClick={onCancel}
            disabled={isCancelling}
          >
            {isCancelling ? "Cancelando..." : "Cancelar"}
          </Button>
        )}
      </div>
    </article>
  );
}