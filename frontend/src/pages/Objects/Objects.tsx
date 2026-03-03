import { useState, useEffect } from "react";
import { objectsService, ObjectItem } from "../../services/objects.ts";
import { ObjectsList } from "./components/ObjectsList";
import { ReservationModal } from "./components/ReservationModal";
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

  useEffect(() => {
    fetchObjects();
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



  const handleReserveObject = (object: ObjectItem) => {
    setSelectedObject(object);
    setIsReservationModalOpen(true);
  };

  const handleReservationSuccess = () => {
    setIsReservationModalOpen(false);
    setSelectedObject(null);
    fetchObjects(); // Refresh objects
    if (onReservationSuccess) {
      onReservationSuccess(); // Notify parent to refresh reservations
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

      {/* Objects List */}
      <div className="flex-1">
        <ObjectsList
          objects={filteredObjects}
          loading={loading}
          error={error}
          onReserve={handleReserveObject}
          onRetry={fetchObjects}
        />
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