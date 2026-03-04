import React, { useState } from "react";
import { fetchWithAuth, API_URL_INCIDENCES } from "../../utils/api";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Select} from "../../components/ui/select";
import { X } from "lucide-react";

interface IncidenceFormProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function IncidenceForm({ onClose, onSuccess }: IncidenceFormProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    location_type: ""
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetchWithAuth(API_URL_INCIDENCES, {
        method: "POST",
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          location_type: formData.location_type,
        }),
      });

      if (response.ok) {
        alert("Incidencia reportada con éxito");
        onSuccess(); 
      } else {
        const errorData = await response.json();
        alert(`Error: ${JSON.stringify(errorData)}`);
      }
    } catch (error) {
      console.error("Error al enviar incidencia:", error);
      alert("Error de conexión con el servidor");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded-[32px]">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-[#1B4D1C]">Nueva Incidencia</h2>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <X className="w-6 h-6" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-sm font-medium text-gray-700">¿Qué ocurre?</label>
          <Input 
            placeholder="Ej: Gotera en el techo" 
            required
            className="rounded-xl border-gray-200"
            value={formData.title}
            onChange={(e) => setFormData({...formData, title: e.target.value})}
          />
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700">Ubicación</label>
          <Select 
            required
            value={formData.location_type}
            onChange={(e) => setFormData({...formData, location_type: e.target.value})}
          >
            <option value="" disabled>Selecciona lugar</option>
            <option value="habitacion">Mi Habitación</option>
            <option value="baño">Baños Comunes</option>
            <option value="cocina">Cocina</option>
            <option value="zonas_comunes">Zonas Comunes</option>
          </Select>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700">Descripción detallada</label>
          <textarea 
            id="description" 
            name="description" 
            className="flex min-h-[100px] w-full rounded-2xl border-none bg-gray-50 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#82D14C] disabled:cursor-not-allowed disabled:opacity-50"
            placeholder="Cuéntanos más detalles..."
          />
        </div>

        <Button 
          type="submit" 
          disabled={loading}
          className="w-full bg-[#82D14C] hover:bg-[#74bc44] text-white rounded-2xl h-12 font-bold shadow-lg"
        >
          {loading ? "Enviando..." : "Enviar Reporte"}
        </Button>
      </form>
    </div>
  );
}