import { useEffect, useMemo, useState } from "react";
import { InteractiveDatePicker } from "../../components/ui/InteractiveDatePicker";
import { toast } from "sonner";

import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import {
  cancelReservation,
  getSpaceAvailability,
  isApiError,
  listCommonSpaces,
  listMyReservations,
  type CommonSpace,
  type SpaceAvailability,
  type SpaceReservation,
} from "../../services/reservations";
import { MyReservationsList } from "./components/MyReservationsList";
import { ReservationFormSheet } from "./components/ReservationFormSheet";
import { SpaceAvailabilityCard } from "./components/SpaceAvailabilityCard";

function getTodayDateString(): string {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().split("T")[0];
}

function sortReservations(reservations: SpaceReservation[]): SpaceReservation[] {
  return [...reservations].sort((left, right) => new Date(right.start_time).getTime() - new Date(left.start_time).getTime());
}

export function Reservations() {
  const todayDate = useMemo(() => getTodayDateString(), []);

  const [selectedDate, setSelectedDate] = useState(todayDate);
  const [spaces, setSpaces] = useState<CommonSpace[]>([]);
  const [availabilityBySpaceId, setAvailabilityBySpaceId] = useState<Record<number, SpaceAvailability>>({});
  const [myReservations, setMyReservations] = useState<SpaceReservation[]>([]);

  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [loadingMyReservations, setLoadingMyReservations] = useState(false);

  const [unauthorized, setUnauthorized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedSpace, setSelectedSpace] = useState<CommonSpace | null>(null);
  const [cancellingReservationId, setCancellingReservationId] = useState<number | null>(null);

  const loadMyReservations = async () => {
    setLoadingMyReservations(true);
    try {
      const data = await listMyReservations();
      setMyReservations(sortReservations(data));
    } catch (unknownError) {
      if (isApiError(unknownError) && (unknownError.status === 401 || unknownError.status === 403)) {
        setUnauthorized(true);
        return;
      }
      toast.error(isApiError(unknownError) ? unknownError.message : "No se pudieron cargar tus reservas.");
    } finally {
      setLoadingMyReservations(false);
    }
  };

  const loadAvailability = async (spacesToLoad: CommonSpace[], date: string) => {
    if (spacesToLoad.length === 0) {
      setAvailabilityBySpaceId({});
      return;
    }

    setLoadingAvailability(true);
    try {
      const entries = await Promise.all(
        spacesToLoad.map(async (space) => {
          const data = await getSpaceAvailability(space.id, date);
          return [space.id, data] as const;
        }),
      );

      setAvailabilityBySpaceId(Object.fromEntries(entries));
    } catch (unknownError) {
      if (isApiError(unknownError) && (unknownError.status === 401 || unknownError.status === 403)) {
        setUnauthorized(true);
        return;
      }
      const detail = isApiError(unknownError)
        ? unknownError.message
        : "No se pudo cargar la disponibilidad de espacios.";
      setError(detail);
      toast.error(detail);
    } finally {
      setLoadingAvailability(false);
    }
  };

  const loadInitialData = async () => {
    setLoadingInitial(true);
    setError(null);
    setUnauthorized(false);

    try {
      const [spacesData, reservationsData] = await Promise.all([listCommonSpaces(), listMyReservations()]);
      setSpaces(spacesData);
      setMyReservations(sortReservations(reservationsData));
    } catch (unknownError) {
      if (isApiError(unknownError) && (unknownError.status === 401 || unknownError.status === 403)) {
        setUnauthorized(true);
        return;
      }
      const detail = isApiError(unknownError) ? unknownError.message : "No se pudieron cargar los datos de reservas.";
      setError(detail);
    } finally {
      setLoadingInitial(false);
    }
  };

  useEffect(() => {
    void loadInitialData();
  }, []);

  useEffect(() => {
    if (loadingInitial || unauthorized) {
      return;
    }

    void loadAvailability(spaces, selectedDate);
  }, [loadingInitial, selectedDate, spaces, unauthorized]);

  const handleOpenReservationForm = (space: CommonSpace) => {
    setSelectedSpace(space);
    setSheetOpen(true);
  };


  const handleCancelReservation = async (reservationId: number) => {
    setCancellingReservationId(reservationId);
    try {
      await cancelReservation(reservationId);
      toast.success("Reserva cancelada correctamente.");
      await Promise.all([loadMyReservations(), loadAvailability(spaces, selectedDate)]);
    } catch (unknownError) {
      toast.error(isApiError(unknownError) ? unknownError.message : "No se pudo cancelar la reserva.");
    } finally {
      setCancellingReservationId(null);
    }
  };

  if (unauthorized) {
    return (
      <Card className="mx-auto mt-6 w-full max-w-3xl">
        <CardContent className="space-y-4 p-6 text-center">
          <h2 className="text-xl font-semibold">Acceso no autorizado</h2>
          <p className="text-sm text-gray-500">
            Debes iniciar sesión para consultar disponibilidad y gestionar reservas.
          </p>
          <Button onClick={() => (window.location.href = "/")}>Ir al inicio</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <section className="mx-auto flex w-full max-w-5xl flex-col gap-6 pb-24">
      <header className="rounded-xl border border-border/80 bg-white p-4 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Reservas de espacios</h2>
            <p className="mt-1 text-sm text-gray-500">
              Consulta la disponibilidad diaria y reserva espacios comunes de tu residencia.
            </p>
          </div>

          <div className="flex items-center">
            <InteractiveDatePicker
              value={selectedDate}
              onChange={(newDate) => setSelectedDate(newDate)}
              minDate={todayDate}
              className="group relative flex items-center gap-2 border-b-2 border-transparent pb-1 transition-all focus-within:border-green-700 hover:border-green-700/50"
              inputClassName="w-[130px] text-sm font-medium"
            />
          </div>
        </div>
      </header>

      {error && !loadingInitial && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-destructive">{error}</p>
            <Button type="button" variant="outline" onClick={() => void loadInitialData()}>
              Reintentar
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Espacios disponibles</h3>

          {loadingInitial ? (
            <Card>
              <CardContent className="p-4 text-sm text-gray-500">Cargando espacios...</CardContent>
            </Card>
          ) : spaces.length === 0 ? (
            <Card>
              <CardContent className="p-4 text-sm text-gray-500">
                No hay espacios activos en esta residencia por el momento.
              </CardContent>
            </Card>
          ) : (
            spaces.map((space) => (
              <SpaceAvailabilityCard
                key={space.id}
                space={space}
                selectedDate={selectedDate}
                loading={loadingAvailability}
                availability={availabilityBySpaceId[space.id]}
                onReserve={handleOpenReservationForm}
              />
            ))
          )}
        </div>

        <div className="space-y-4">
          <MyReservationsList
            reservations={myReservations}
            loading={loadingMyReservations || loadingInitial}
            cancellingId={cancellingReservationId}
            onCancel={handleCancelReservation}
          />
        </div>
      </div>

      <ReservationFormSheet
        open={sheetOpen}
        initialDate={selectedDate} // Cambiamos selectedDate por initialDate
        space={selectedSpace}
        onOpenChange={setSheetOpen}
        onSuccess={() => {
          // Cuando la reserva se cree con éxito, cerramos el drawer y recargamos
          setSheetOpen(false);
          void loadInitialData();
          void loadAvailability(spaces, selectedDate);
        }}
      />
    </section>
  );
}
