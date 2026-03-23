import { useState, useEffect } from "react";
import { Search } from "lucide-react";
import { toast } from "sonner";
import { objectsService, ObjectItem, UserObjectReservation } from "../../services/objects.ts";
import { ObjectsList } from "./components/ObjectsList";
import { ReservationModal } from "./components/ReservationModal";
import { MyReservations } from "./components/MyReservations";

export type { ObjectItem, UserObjectReservation } from "../../services/objects.ts";

interface ObjectsProps {
  onReservationSuccess?: () => void;
}

export function Objects({ onReservationSuccess }: ObjectsProps) {
  const [objects, setObjects] = useState<ObjectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedObject, setSelectedObject] = useState<ObjectItem | null>(null);
  const [isReservationModalOpen, setIsReservationModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  
  const [reservations, setReservations] = useState<UserObjectReservation[]>([]);
  const [reservationsLoading, setReservationsLoading] = useState(true);
  const [reservationsError, setReservationsError] = useState<string | null>(null);
  const [cancellingRentalId, setCancellingRentalId] = useState<number | null>(null);

  useEffect(() => {
    fetchObjects();
    fetchReservations();
  }, []);

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



  const handleReserveObject = (object: ObjectItem) => {
    setSelectedObject(object);
    setIsReservationModalOpen(true);
  };

  const handleReservationSuccess = () => {
    setIsReservationModalOpen(false);
    setSelectedObject(null);
    fetchObjects();
    fetchReservations();
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
      await fetchObjects();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error al cancelar reserva";
      toast.error(errorMessage);
      console.error('Error canceling reservation:', err);
    } finally {
      setCancellingRentalId(null);
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
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Objetos disponibles</h3>
          <ObjectsList
            objects={filteredObjects}
            loading={loading}
            error={error}
            onReserve={handleReserveObject}
            onRetry={fetchObjects}
          />
        </div>

        <div>
          <MyReservations
            reservations={reservations}
            loading={reservationsLoading}
            error={reservationsError}
            cancellingRentalId={cancellingRentalId}
            onCancel={handleCancelReservation}
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