import { useState, useEffect } from "react";
import { MapPin } from "lucide-react";
import { Objects } from "../pages/Objects/Objects";
import { MyReservations } from "../pages/Objects/components/MyReservations";
import { objectsService, UserObjectReservation } from "../services/objects";

export function StudentReservations() {
  const [activeTab, setActiveTab] = useState("objetos");
  const [reservations, setReservations] = useState<UserObjectReservation[]>([]);
  const [reservationsLoading, setReservationsLoading] = useState(false);
  const [reservationsError, setReservationsError] = useState<string | null>(null);
  
  const tabs = [
    { id: "espacios", label: "Espacios" },
    { id: "objetos", label: "Objetos" },
    { id: "reservas", label: "Mis Reservas" }
  ];

  useEffect(() => {
    if (activeTab === "reservas") {
      fetchReservations();
    }
  }, [activeTab]);

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

  const handleCancelReservation = async (objectId: number, rentalId: number) => {
    try {
      await objectsService.cancelReservation(objectId, { rental_id: rentalId });
      await fetchReservations(); // Refresh reservations after cancellation
    } catch (err) {
      console.error('Error canceling reservation:', err);
      setReservationsError(err instanceof Error ? err.message : "Error al cancelar reserva");
    }
  };
  
  return (
    <div className="w-full bg-background">
      <div className="bg-card rounded-xl shadow-sm border border-border">
        <div className="p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">Reservas</h2>
        </div>
        
        {/* Tabs */}
        <div className="flex border-b border-border">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id 
                  ? "text-[#4A7C59] border-[#4A7C59]" 
                  : "text-muted-foreground border-transparent hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        
        {/* Tab Content */}
        <div className="min-h-[500px]">
          {activeTab === "espacios" && (
            <div className="flex items-center justify-center h-64 px-4">
              <div className="text-center">
                <MapPin className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">Reserva de espacios próximamente</p>
              </div>
            </div>
          )}
          
          {activeTab === "objetos" && (
            <div className="h-full">
              <Objects onReservationSuccess={() => fetchReservations()} />
            </div>
          )}
          
          {activeTab === "reservas" && (
            <div className="h-full p-4">
              <MyReservations
                reservations={reservations}
                loading={reservationsLoading}
                error={reservationsError}
                onCancel={handleCancelReservation}
                onRetry={fetchReservations}
              />
            </div>
          )}
          

        </div>
      </div>
    </div>
  );
}