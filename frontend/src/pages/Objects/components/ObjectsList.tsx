import { Calendar, Clock, MapPin, Package, Tag } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Card, CardContent } from "../../../components/ui/card";
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
      <Card className="border-border/80 shadow-sm">
        <CardContent className="p-6">
          <p className="text-sm text-muted-foreground">Cargando objetos...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive/40 bg-destructive/5">
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-destructive">{error}</p>
          <Button variant="outline" onClick={onRetry}>
            Reintentar
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (objects.length === 0) {
    return (
      <Card className="border-border/80 shadow-sm">
        <CardContent className="p-6 text-center">
          <Package className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <h3 className="text-lg font-medium text-foreground mb-2">No hay objetos disponibles</h3>
          <p className="text-sm text-muted-foreground">No hay objetos registrados en este momento.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {objects.map((object) => (
        <ObjectCard key={object.id} object={object} onReserve={() => onReserve(object)} />
      ))}
    </div>
  );
}

function ObjectCard({ object, onReserve }: { object: ObjectItem; onReserve: () => void }) {
  return (
    <Card className="border-border/80 shadow-sm">
      <CardContent className="p-4 space-y-4">
        {object.image_url && (
          <img
            src={object.image_url}
            alt={object.name}
            className="w-full h-32 object-cover rounded-lg"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        )}
        
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h3 className="text-lg font-semibold">{object.name}</h3>
            {object.description && (
              <p className="mt-1 text-sm text-muted-foreground">{object.description}</p>
            )}
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              object.can_rent ? "bg-primary/10 text-primary" : "bg-slate-200 text-slate-700"
            }`}
          >
            {object.can_rent ? 'Disponible' : 'No disponible'}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-2 text-sm text-muted-foreground sm:grid-cols-2">
          {object.location && (
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              <span>{object.location}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span>{object.rentals_count} reserva(s)</span>
          </div>
          {object.tags && (
            <div className="flex items-center gap-2 sm:col-span-2">
              <Tag className="h-4 w-4" />
              <span>{object.tags}</span>
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <Button onClick={onReserve} disabled={!object.can_rent}>
            <Calendar className="mr-2 h-4 w-4" />
            Reservar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}