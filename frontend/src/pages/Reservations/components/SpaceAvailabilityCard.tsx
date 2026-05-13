import { CalendarClock, Clock3, Users } from "lucide-react";

import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import type { CommonSpace, SpaceAvailability } from "../../../services/reservations";

interface SpaceAvailabilityCardProps {
  space: CommonSpace;
  availability?: SpaceAvailability;
  selectedDate: string;
  loading: boolean;
  onReserve: (space: CommonSpace) => void;
}

function formatClock(value: string): string {
  const date = new Date(value);
  return new Intl.DateTimeFormat("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatInterval(startTime: string, endTime: string): string {
  return `${formatClock(startTime)} - ${formatClock(endTime)}`;
}

function trimSeconds(timeValue: string): string {
  return timeValue.slice(0, 5);
}

export function SpaceAvailabilityCard({
  space,
  availability,
  selectedDate,
  loading,
  onReserve,
}: SpaceAvailabilityCardProps) {
  const reservedCount = availability?.reservations.length ?? 0;
  const allSlots = availability?.available_slots || [];
  const availableSlots = allSlots.filter((slot) => slot.status === "available");
  const hasSlots = availableSlots.length > 0;
  const visibleSlots = availableSlots.slice(0, 3);
  const remainingSlots = availableSlots.length - visibleSlots.length;

  return (
    <Card className="border-border/80 shadow-sm">
      <CardHeader className="gap-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="text-lg font-semibold break-words line-clamp-2">
              {space.name}
            </CardTitle>
            <p className="mt-1 text-sm text-gray-500 break-words line-clamp-3">
              {space.description || "Sin descripción disponible."}
            </p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              hasSlots ? "bg-green-700/10 text-green-700" : "bg-slate-200 text-gray-500"
            }`}
          >
            {hasSlots ? "Con disponibilidad" : "Sin huecos"}
          </span>
        </div>

        {space.img && (
          <div className="relative w-full h-40 mt-2 rounded-xl overflow-hidden border border-border/50 bg-muted">
            <img 
              src={space.img} 
              alt={space.name} 
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
        )}
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-2 text-sm text-gray-500 sm:grid-cols-3">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span>Aforo: {space.capacity}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock3 className="h-4 w-4" />
            <span>
              {trimSeconds(space.open_time)} - {trimSeconds(space.close_time)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <CalendarClock className="h-4 w-4" />
            <span>{selectedDate}</span>
          </div>
        </div>
        <div>
          <p className="mb-2 text-sm font-semibold text-gray-900">Reservas activas</p>
          {loading ? (
            <p className="text-sm text-gray-500">Cargando disponibilidad...</p>
          ) : reservedCount === 0 ? (
            <p className="text-sm text-gray-500">No hay reservas para esta fecha.</p>
          ) : (
            <ul className="space-y-2">
              {availability?.reservations.map((reservation) => (
                <li key={reservation.id} className="rounded-md border border-border/70 bg-background px-3 py-2 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="min-w-0 flex-1 font-medium text-gray-900 break-words line-clamp-2">
                      {reservation.user.first_name || reservation.user.last_name
                        ? `${reservation.user.first_name} ${reservation.user.last_name}`.trim()
                        : reservation.user.email}
                    </span>
                    <span className="shrink-0 text-gray-500">{formatInterval(reservation.start_time, reservation.end_time)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-gray-900">Disponibilidad rápida</p>
            <span className="text-xs text-gray-500">Tramos de {space.reservation_interval_minutes} min</span>
          </div>
          
          {loading ? (
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
                  
                  {formatInterval(slot.start_time, slot.end_time)}
                </span>
              ))}
              {remainingSlots > 0 && (
                <span className="text-xs font-medium text-gray-500 ml-1">
                  + {remainingSlots} tramos más
                </span>
              )}
            </div>
          )}
        </div>
        <div className="flex justify-end pt-2">
          <Button 
            className="bg-green-700 hover:bg-green-700/90 text-white" 
            onClick={() => onReserve(space)} 
            disabled={loading || !hasSlots}
          >
            Reservar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
