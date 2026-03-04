import { Calendar, Clock, MapPin, Trash2, User } from "lucide-react";
import { UserObjectReservation } from "../../../services/objects.ts";

interface MyReservationsProps {
  reservations: UserObjectReservation[];
  loading: boolean;
  error: string | null;
  onCancel: (objectId: number, rentalId: number) => void;
  onRetry: () => void;
}

export function MyReservations({ reservations, loading, error, onCancel, onRetry }: MyReservationsProps) {
  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p className="text-muted-foreground">Cargando reservas...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="empty-state">
        <Calendar className="w-16 h-16 text-muted-foreground mb-4" />
        <p className="text-destructive mb-4">{error}</p>
        <button onClick={onRetry} className="reserve-button" style={{ width: 'auto' }}>
          Reintentar
        </button>
      </div>
    );
  }

  if (reservations.length === 0) {
    return (
      <div className="empty-state">
        <Calendar className="w-16 h-16 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium text-foreground mb-2">No tienes reservas</h3>
        <p className="text-muted-foreground">Cuando reserves objetos, aparecerán aquí.</p>
      </div>
    );
  }

  return (
    <div className="objects-grid">
      {reservations.map(({ object, rental }) => (
        <ReservationCard
          key={rental.id}
          object={object}
          rental={rental}
          onCancel={() => onCancel(object.id, rental.id)}
        />
      ))}
    </div>
  );
}

function ReservationCard({ 
  object, 
  rental, 
  onCancel 
}: { 
  object: any; 
  rental: any; 
  onCancel: () => void;
}) {
  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('es-ES'),
      time: date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
    };
  };

  const startDateTime = formatDateTime(rental.start_date);
  const endDateTime = formatDateTime(rental.end_date);

  const isUpcoming = new Date(rental.start_date) > new Date();
  const isActive = new Date(rental.start_date) <= new Date() && new Date(rental.end_date) > new Date();
  const isPast = new Date(rental.end_date) <= new Date();

  const getStatusColor = () => {
    if (isPast) return 'bg-muted text-muted-foreground';
    if (isActive) return 'status-available';
    return 'bg-blue-100 text-blue-800';
  };

  const getStatusText = () => {
    if (isPast) return 'Finalizada';
    if (isActive) return 'En curso';
    if (isUpcoming) return 'Próxima';
    return 'Reserva';
  };

  return (
    <div className="object-card">
      <div className="flex items-start justify-between mb-2">
        <h3 className="object-title">{object.name}</h3>
        <div className={`object-status ${getStatusColor()}`}>
          {getStatusText()}
        </div>
      </div>

      {object.location && (
        <div className="object-meta">
          <MapPin className="w-3 h-3" />
          <span>{object.location}</span>
        </div>
      )}

      <div className="space-y-3 mb-4">
        <div className="flex items-center gap-2 text-sm">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <span className="text-muted-foreground">Inicio:</span>
          <span className="font-medium">{startDateTime.date} a las {startDateTime.time}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Clock className="w-4 h-4 text-muted-foreground" />
          <span className="text-muted-foreground">Fin:</span>
          <span className="font-medium">{endDateTime.date} a las {endDateTime.time}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <User className="w-4 h-4 text-muted-foreground" />
          <span className="text-muted-foreground">Reservado por:</span>
          <span className="font-medium">{rental.user.first_name} {rental.user.last_name}</span>
        </div>
      </div>

      {!isPast && (
        <button
          onClick={onCancel}
          className="w-full px-4 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors flex items-center justify-center gap-2"
        >
          <Trash2 className="w-4 h-4" />
          Cancelar Reserva
        </button>
      )}
    </div>
  );
}