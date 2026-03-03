import { useState, useEffect } from "react";
import { objectsService, ObjectItem, UserObjectReservation } from "../../services/objects.ts";
import { ObjectsList } from "./components/ObjectsList";
import { ReservationModal } from "./components/ReservationModal";
import { MyReservations } from "./components/MyReservations";
import "./Objects.css";

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
    try {
      await objectsService.cancelReservation(objectId, { rental_id: rentalId });
      await fetchReservations();
      await fetchObjects();
    } catch (err) {
      console.error('Error canceling reservation:', err);
      setReservationsError(err instanceof Error ? err.message : "Error al cancelar reserva");
    }
  };

  const filteredObjects = objects.filter(object =>
    object.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    object.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
    object.tags.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="objects-container">
      {/* Header with search */}
      <div className="objects-header">
        <input
          type="text"
          placeholder="Buscar objetos..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="objects-search"
        />
      </div>

      {/* Grid Layout: Objects List + My Reservations */}
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="flex-1">
          <ObjectsList
            objects={filteredObjects}
            loading={loading}
            error={error}
            onReserve={handleReserveObject}
            onRetry={fetchObjects}
          />
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold px-4">Mis Reservas</h3>
          <MyReservations
            reservations={reservations}
            loading={reservationsLoading}
            error={reservationsError}
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
    </div>
  );
}