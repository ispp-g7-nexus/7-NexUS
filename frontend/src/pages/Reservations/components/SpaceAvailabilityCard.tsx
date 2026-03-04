import { CalendarClock, CheckCircle2, Clock3, Users } from "lucide-react";

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
  const hasSlots = (availability?.available_slots.length ?? 0) > 0;

  return (
    <Card className="border-border/80 shadow-sm">
      <CardHeader className="gap-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle className="text-lg font-semibold">{space.name}</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">{space.description || "Sin descripción disponible."}</p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              hasSlots ? "bg-primary/10 text-primary" : "bg-slate-200 text-slate-700"
            }`}
          >
            {hasSlots ? "Con disponibilidad" : "Sin huecos"}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-2 text-sm text-muted-foreground sm:grid-cols-3">
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
          <p className="mb-2 text-sm font-semibold text-foreground">Reservas activas</p>
          {loading ? (
            <p className="text-sm text-muted-foreground">Cargando disponibilidad...</p>
          ) : reservedCount === 0 ? (
            <p className="text-sm text-muted-foreground">No hay reservas para esta fecha.</p>
          ) : (
            <ul className="space-y-2">
              {availability?.reservations.map((reservation) => (
                <li key={reservation.id} className="rounded-md border border-border/70 bg-background px-3 py-2 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-foreground">
                      {reservation.user.first_name || reservation.user.last_name
                        ? `${reservation.user.first_name} ${reservation.user.last_name}`.trim()
                        : reservation.user.email}
                    </span>
                    <span className="text-muted-foreground">{formatInterval(reservation.start_time, reservation.end_time)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <p className="mb-2 text-sm font-semibold text-foreground">Huecos disponibles</p>
          {loading ? (
            <p className="text-sm text-muted-foreground">Calculando huecos...</p>
          ) : !availability || availability.available_slots.length === 0 ? (
            <p className="text-sm text-muted-foreground">No quedan huecos libres para esta fecha.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {availability.available_slots.map((slot) => (
                <span
                  key={`${slot.start_time}-${slot.end_time}`}
                  className="inline-flex items-center gap-1 rounded-md border border-primary/30 bg-primary/5 px-2 py-1 text-xs font-medium text-primary"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {formatInterval(slot.start_time, slot.end_time)}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <Button onClick={() => onReserve(space)} disabled={loading || !hasSlots}>
            Reservar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
