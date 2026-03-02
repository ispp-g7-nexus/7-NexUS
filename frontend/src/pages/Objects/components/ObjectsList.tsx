import { Calendar, Clock, MapPin, Package, Tag, User } from "lucide-react";
import { ObjectItem } from "../../../services/objects.ts";

interface ObjectsListProps {
  objects: ObjectItem[];
  loading: boolean;
  error: string | null;
  onReserve: (object: ObjectItem) => void;
  onRetry: () => void;
}

export function ObjectsList({ objects, loading, error, onReserve, onRetry }: ObjectsListProps) {
  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p className="text-muted-foreground">Cargando objetos...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="empty-state">
        <Package className="w-16 h-16 text-muted-foreground mb-4" />
        <p className="text-destructive mb-4">{error}</p>
        <button onClick={onRetry} className="reserve-button" style={{ width: 'auto' }}>
          Reintentar
        </button>
      </div>
    );
  }

  if (objects.length === 0) {
    return (
      <div className="empty-state">
        <Package className="w-16 h-16 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium text-foreground mb-2">No hay objetos disponibles</h3>
        <p className="text-muted-foreground">No hay objetos registrados en este momento.</p>
      </div>
    );
  }

  return (
    <div className="objects-grid">
      {objects.map((object) => (
        <ObjectCard key={object.id} object={object} onReserve={() => onReserve(object)} />
      ))}
    </div>
  );
}

function ObjectCard({ object, onReserve }: { object: ObjectItem; onReserve: () => void }) {
  return (
    <div className="object-card">
      {object.image_url && (
        <img
          src={object.image_url}
          alt={object.name}
          className="object-image"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      )}
      
      <div className="flex items-start justify-between mb-2">
        <h3 className="object-title">{object.name}</h3>
        <div className={`object-status ${object.can_rent ? 'status-available' : 'status-unavailable'}`}>
          {object.can_rent ? 'Disponible' : 'No disponible'}
        </div>
      </div>

      {object.location && (
        <div className="object-meta">
          <MapPin className="w-3 h-3" />
          <span>{object.location}</span>
        </div>
      )}

      {object.description && (
        <p className="object-description">{object.description}</p>
      )}

      {object.tags && (
        <div className="object-meta">
          <Tag className="w-3 h-3" />
          <span>{object.tags}</span>
        </div>
      )}

      <div className="flex items-center justify-between text-xs text-muted-foreground mb-4">
        <div className="flex items-center gap-1">
          <User className="w-3 h-3" />
          <span>{object.rentals_count} reserva(s)</span>
        </div>
        <div className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          <span>{object.availability ? 'Activo' : 'Inactivo'}</span>
        </div>
      </div>

      <button
        onClick={onReserve}
        disabled={!object.can_rent}
        className="reserve-button"
      >
        <Calendar className="w-4 h-4" />
        {object.can_rent ? 'Reservar' : 'No disponible'}
      </button>
    </div>
  );
}