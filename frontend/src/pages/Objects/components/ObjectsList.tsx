import { Calendar, Clock, MapPin, Package, Tag } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Card, CardContent } from "../../../components/ui/card";
import { ObjectAvailability, ObjectItem } from "../../../services/objects.ts";

interface ObjectsListProps {
  objects: ObjectItem[];
  loading: boolean;
  error: string | null;
  selectedDate: string;
  loadingAvailability: boolean;
  availabilityByObjectId: Record<number, ObjectAvailability>;
  onReserve: (object: ObjectItem) => void;
  onRetry: () => void;
}

export function ObjectsList({
  objects,
  loading,
  error,
  selectedDate,
  loadingAvailability,
  availabilityByObjectId,
  onReserve,
  onRetry,
}: ObjectsListProps) {
  if (loading) {
    return (
      <Card className="border-border/80 shadow-sm">
        <CardContent className="p-6">
          <p className="text-sm text-gray-500">Cargando objetos...</p>
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
          <Package className="w-12 h-12 text-gray-500 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No hay objetos disponibles</h3>
          <p className="text-sm text-gray-500">No hay objetos registrados en este momento.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {objects.map((object) => (
        <ObjectCard
          key={object.id}
          object={object}
          selectedDate={selectedDate}
          loadingAvailability={loadingAvailability}
          availability={availabilityByObjectId[object.id]}
          onReserve={() => onReserve(object)}
        />
      ))}
    </div>
  );
}

function formatClock(value: string): string {
  return new Intl.DateTimeFormat("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatInterval(startTime: string, endTime: string): string {
  return `${formatClock(startTime)} - ${formatClock(endTime)}`;
}

function formatSlotAvailability(slot: { start_time: string; end_time: string; available_stock: number; status: string }): string {
  if (slot.status === "past") {
    return formatInterval(slot.start_time, slot.end_time);
  }

  if (slot.status === "occupied") {
    return `${formatInterval(slot.start_time, slot.end_time)} · Completo`;
  }

  return `${formatInterval(slot.start_time, slot.end_time)} · ${slot.available_stock} disponibles`;
}

function formatDateLabel(dateValue: string): string {
  const [year, month, day] = dateValue.split("-");
  if (!year || !month || !day) {
    return dateValue;
  }
  return `${day}/${month}/${year}`;
}

function getReservationUserDisplayName(user: {
  first_name: string;
  last_name: string;
  email: string;
}): string {
  const fullName = `${user.first_name} ${user.last_name}`.trim();
  return fullName || user.email;
}

function ObjectCard({
  object,
  selectedDate,
  loadingAvailability,
  availability,
  onReserve,
}: {
  object: ObjectItem;
  selectedDate: string;
  loadingAvailability: boolean;
  availability?: ObjectAvailability;
  onReserve: () => void;
}) {
  const reservations = [...(availability?.reservations ?? [])].sort(
    (left, right) => new Date(left.start_date).getTime() - new Date(right.start_date).getTime(),
  );
  const slots = availability?.available_slots ?? [];
  const availableSlots = slots.filter((slot) => slot.status === "available");
  const visibleSlots = availableSlots.slice(0, 3);
  const remainingSlots = availableSlots.length - visibleSlots.length;
  const hasSlots = availableSlots.length > 0;
  const isOutOfStock = !object.can_rent && object.current_available_stock === 0;

  return (
    <Card className="border-border/80 shadow-sm overflow-hidden">
      <CardContent className="p-4 space-y-4 min-w-0">
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
        
        <div className="flex flex-wrap items-start justify-between gap-2 min-w-0">
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-semibold break-words line-clamp-2">{object.name}</h3>
            {object.description && (
              <p className="mt-1 text-sm text-gray-500 break-words line-clamp-3">{object.description}</p>
            )}
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              object.can_rent ? "bg-primary/10 text-primary" : "bg-slate-200 text-gray-500"
            }`}
          >
            {object.can_rent ? 'Disponible' : 'No disponible'}
          </span>
        </div>

        {isOutOfStock && (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Todo el stock está en uso para esta fecha, pero puedes reservarlo para más adelante.
          </p>
        )}

        <div className="grid grid-cols-1 gap-2 text-sm text-gray-500 sm:grid-cols-2">
          {object.location && (
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              <span className="break-words">{object.location}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            <span>Stock total: {object.stock_total}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span>{object.rentals_count} reserva(s)</span>
          </div>
          {object.tags && (
            <div className="flex items-center gap-2 sm:col-span-2">
              <Tag className="h-4 w-4" />
              <span className="break-words">{object.tags}</span>
            </div>
          )}
        </div>

        <div>
          <p className="mb-2 text-sm font-semibold text-gray-900">Reservas para {formatDateLabel(selectedDate)}</p>
          {loadingAvailability ? (
            <p className="text-sm text-gray-500">Cargando disponibilidad...</p>
          ) : reservations.length === 0 ? (
            <p className="text-sm text-gray-500">No hay reservas activas para esta fecha.</p>
          ) : (
            <ul className="space-y-2">
              {reservations.map((reservation) => (
                <li key={reservation.id} className="rounded-md border border-border/70 bg-background px-3 py-2 text-sm min-w-0 overflow-hidden">
                  <div className="flex items-center justify-between gap-2 min-w-0">
                    <span className="font-medium text-gray-900 min-w-0 flex-1 break-words line-clamp-2">
                      {getReservationUserDisplayName(reservation.user)}
                    </span>
                    <span className="text-gray-500 shrink-0 text-right">
                      {formatInterval(reservation.start_date, reservation.end_date)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-900">Disponibilidad rápida</p>
            <span className="text-xs text-gray-500">Tramos de 60 min</span>
          </div>
          {loadingAvailability ? (
            <p className="text-sm text-gray-500">Calculando huecos...</p>
          ) : !hasSlots ? (
            <p className="text-sm text-gray-500">No quedan huecos libres para esta fecha.</p>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              {visibleSlots.map((slot) => (
                <span
                  key={`${slot.start_time}-${slot.end_time}`}
                  className="inline-flex items-center gap-1.5 rounded-md border border-green-700/30 bg-green-700/5 px-2.5 py-1 text-xs font-medium text-green-700"
                >
                  {formatSlotAvailability(slot)}
                </span>
              ))}
              {remainingSlots > 0 && <span className="ml-1 text-xs font-medium text-gray-500">+ {remainingSlots} tramos más</span>}
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <Button onClick={onReserve} disabled={loadingAvailability || !hasSlots}>
            <Calendar className="mr-2 h-4 w-4" />
            Reservar
          </Button>
        </div>
        <p className="text-right text-xs text-gray-500">Fecha seleccionada: {formatDateLabel(selectedDate)}</p>
      </CardContent>
    </Card>
  );
}
