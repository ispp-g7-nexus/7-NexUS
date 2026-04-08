import { useState, useEffect, useMemo } from "react";
import { Search } from "lucide-react";
import { toast } from "sonner";
import { InteractiveDatePicker } from "../../components/ui/InteractiveDatePicker";
import {
  objectsService,
  ObjectItem,
  ObjectAvailability,
  UserObjectReservation,
  UserObjectNotification,
} from "../../services/objects.ts";
import { ObjectsList } from "./components/ObjectsList";
import { ReservationModal } from "./components/ReservationModal";
import { MyReservations } from "./components/MyReservations";

export type { ObjectItem, UserObjectReservation } from "../../services/objects.ts";

interface ObjectsProps {
  onReservationSuccess?: () => void;
}

function getTodayDateString(): string {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().split("T")[0];
}

export function Objects({ onReservationSuccess }: ObjectsProps) {
  const todayDate = useMemo(() => getTodayDateString(), []);

  const [objects, setObjects] = useState<ObjectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(todayDate);
  const [availabilityByObjectId, setAvailabilityByObjectId] = useState<Record<number, ObjectAvailability>>({});
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [selectedObject, setSelectedObject] = useState<ObjectItem | null>(null);
  const [isReservationModalOpen, setIsReservationModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  
  const [reservations, setReservations] = useState<UserObjectReservation[]>([]);
  const [objectNotifications, setObjectNotifications] = useState<UserObjectNotification[]>([]);
  const [reservationsLoading, setReservationsLoading] = useState(true);
  const [reservationsError, setReservationsError] = useState<string | null>(null);
  const [cancellingRentalId, setCancellingRentalId] = useState<number | null>(null);
  const [dismissingRentalId, setDismissingRentalId] = useState<number | null>(null);
  const [markingReturnedRentalId, setMarkingReturnedRentalId] = useState<number | null>(null);

  useEffect(() => {
    void fetchObjects();
    void fetchReservations();
    void fetchObjectNotifications();
  }, []);

  useEffect(() => {
    if (objects.length === 0) {
      setAvailabilityByObjectId({});
      return;
    }
    void fetchAvailability(objects, selectedDate);
  }, [objects, selectedDate]);

  const fetchObjects = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await objectsService.getObjects();
      setObjects(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar objetos");
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailability = async (objectsToLoad: ObjectItem[], date: string) => {
    try {
      setLoadingAvailability(true);
      const entries = await Promise.all(
        objectsToLoad.map(async (object) => {
          const data = await objectsService.getObjectAvailability(object.id, date);
          return [object.id, data] as const;
        }),
      );
      setAvailabilityByObjectId(Object.fromEntries(entries));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error al cargar disponibilidad de objetos";
      toast.error(errorMessage);
    } finally {
      setLoadingAvailability(false);
    }
  };

  const fetchReservations = async () => {
    try {
      setReservationsLoading(true);
      setReservationsError(null);
      const data = await objectsService.getUserObjectReservations();
      setReservations(data);
    } catch (err) {
      setReservationsError(err instanceof Error ? err.message : "Error al cargar reservas");
    } finally {
      setReservationsLoading(false);
    }
  };

  const fetchObjectNotifications = async () => {
    try {
      const data = await objectsService.getUserObjectNotifications();
      setObjectNotifications(data);
    } catch {
      setObjectNotifications([]);
    }
  };



  const handleReserveObject = (object: ObjectItem) => {
    setSelectedObject(object);
    setIsReservationModalOpen(true);
  };

  const handleReservationSuccess = () => {
    setIsReservationModalOpen(false);
    setSelectedObject(null);
    void fetchObjects();
    void fetchReservations();
    void fetchObjectNotifications();
    if (objects.length > 0) {
      void fetchAvailability(objects, selectedDate);
    }
    if (onReservationSuccess) {
      onReservationSuccess();
    }
  };

  const handleCancelReservation = async (objectId: number, rentalId: number) => {
    setCancellingRentalId(rentalId);
    try {
      await objectsService.cancelReservation(objectId, { rental_id: rentalId });
      toast.success("Reserva cancelada correctamente.");
      await fetchReservations();
      await fetchObjectNotifications();
      await fetchObjects();
      await fetchAvailability(objects, selectedDate);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error al cancelar reserva";
      toast.error(errorMessage);
      console.error('Error canceling reservation:', err);
    } finally {
      setCancellingRentalId(null);
    }
  };

  const handleDismissReservation = async (rentalId: number) => {
    setDismissingRentalId(rentalId);
    try {
      await objectsService.dismissUserReservation(rentalId);
      toast.success("Reserva descartada.");
      await fetchReservations();
      await fetchObjectNotifications();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error al descartar reserva";
      toast.error(errorMessage);
    } finally {
      setDismissingRentalId(null);
    }
  };

  const handleMarkObjectReturned = async (objectId: number, rentalId: number) => {
    setMarkingReturnedRentalId(rentalId);
    try {
      await objectsService.completeObjectRental(objectId, rentalId);
      toast.success("Objeto marcado como devuelto.");
      await fetchReservations();
      await fetchObjectNotifications();
      await fetchObjects();
      await fetchAvailability(objects, selectedDate);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error al marcar como devuelto";
      toast.error(errorMessage);
      console.error('Error marking rental as returned:', err);
    } finally {
      setMarkingReturnedRentalId(null);
    }
  };

  const filteredObjects = objects.filter(object =>
    object.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    object.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
    object.tags.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <section className="mx-auto flex w-full max-w-5xl flex-col gap-6 pb-24">
      <header className="rounded-xl border border-border/80 bg-white p-4 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Objetos disponibles</h2>
            <p className="mt-1 text-sm text-gray-500">
              Reserva objetos compartidos de tu residencia como bicicletas, libros y más.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <InteractiveDatePicker
              value={selectedDate}
              onChange={(newDate) => setSelectedDate(newDate)}
              minDate={todayDate}
              className="group relative flex items-center gap-2 border-b-2 border-transparent pb-1 transition-all focus-within:border-green-700 hover:border-green-700/50"
              inputClassName="w-[130px] text-sm font-medium"
            />
            <label htmlFor="objects-search" className="inline-flex items-center gap-2 text-sm font-medium">
              <Search className="h-4 w-4" /> Buscar
            </label>
            <input
              id="objects-search"
              type="text"
              placeholder="Buscar objetos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>
        </div>
      </header>

      {/* Grid Layout: Objects List + My Reservations */}
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-4 min-w-0">
          <h3 className="text-lg font-semibold">Objetos disponibles</h3>
          <ObjectsList
            objects={filteredObjects}
            loading={loading}
            error={error}
            selectedDate={selectedDate}
            loadingAvailability={loadingAvailability}
            availabilityByObjectId={availabilityByObjectId}
            onReserve={handleReserveObject}
            onRetry={fetchObjects}
          />
        </div>

        <div className="min-w-0">
          {objectNotifications.length > 0 && (
            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
              <p className="text-sm font-semibold text-amber-800">Avisos de devolucion</p>
              <ul className="mt-2 space-y-1 text-sm text-amber-900">
                {objectNotifications.map((notification) => (
                  <li key={notification.id} className="rounded bg-white/70 px-2 py-1">
                    <p className="font-medium">{notification.title}</p>
                    <p>{notification.message}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <MyReservations
            reservations={reservations}
            loading={reservationsLoading}
            error={reservationsError}
            cancellingRentalId={cancellingRentalId}
            dismissingRentalId={dismissingRentalId}
            markingReturnedRentalId={markingReturnedRentalId}
            onCancel={handleCancelReservation}
            onDismiss={handleDismissReservation}
            onMarkReturned={handleMarkObjectReturned}
            onRetry={fetchReservations}
          />
        </div>
      </div>

      {/* Reservation Modal */}
      {isReservationModalOpen && selectedObject && (
        <ReservationModal
          object={selectedObject}
          isOpen={isReservationModalOpen}
          onClose={() => {
            setIsReservationModalOpen(false);
            setSelectedObject(null);
          }}
          onSuccess={handleReservationSuccess}
        />
      )}
    </section>
  );
}