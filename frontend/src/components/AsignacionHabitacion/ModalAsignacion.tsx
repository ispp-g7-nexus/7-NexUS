// Modal para asignar residentes a habitaciones
import React, { useState, useEffect } from 'react';
import { X, Users, Home, AlertCircle } from 'lucide-react';
import {
  Residente,
  Habitacion,
  GeneroDisplay,
  TipoHabitacion,
  TipoHabitacionDisplay,
} from '../../types/residencias';
import { habitacionesService, asignacionesService } from '../../services/residencias';

interface ModalAsignacionProps {
  residente: Residente;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ModalAsignacion: React.FC<ModalAsignacionProps> = ({
  residente,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [habitaciones, setHabitaciones] = useState<Habitacion[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedHabitacion, setSelectedHabitacion] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadHabitaciones();
    }
  }, [isOpen, residente.id]);

  const loadHabitaciones = async () => {
    setLoading(true);
    setError(null);
    try {
      // Cargar habitaciones disponibles para este residente específico
      const data = await habitacionesService.availableForResident(residente.id);
      setHabitaciones(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar habitaciones');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedHabitacion) {
      setError('Debe seleccionar una habitación');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await asignacionesService.create({
        residente_id: residente.id,
        habitacion_id: selectedHabitacion,
      });
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al asignar habitación');
    } finally {
      setSubmitting(false);
    }
  };

  const isHabitacionCompatible = (habitacion: Habitacion): boolean => {
    // Las habitaciones individuales siempre son compatibles si tienen espacio
    if (habitacion.tipo === TipoHabitacion.INDIVIDUAL) {
      return !habitacion.esta_llena;
    }

    // Para compartidas, verificar género
    if (habitacion.tipo === TipoHabitacion.COMPARTIDA) {
      // Si está vacía, es compatible
      if (habitacion.esta_vacia) {
        return true;
      }

      // Si tiene género asignado, debe coincidir
      if (habitacion.genero_asignado) {
        return habitacion.genero_asignado === residente.genero;
      }
    }

    return !habitacion.esta_llena;
  };

  const getIncompatibilityReason = (habitacion: Habitacion): string | null => {
    if (habitacion.esta_llena) {
      return 'Habitación llena';
    }

    if (
      habitacion.tipo === TipoHabitacion.COMPARTIDA &&
      habitacion.genero_asignado &&
      habitacion.genero_asignado !== residente.genero
    ) {
      return `Solo ${GeneroDisplay[habitacion.genero_asignado]}`;
    }

    return null;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-semibold text-gray-900">Asignar Habitación</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Residente Info */}
        <div className="p-6 bg-blue-50 border-b">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">
                {residente.user.full_name || residente.user.username}
              </h3>
              <p className="text-sm text-gray-600">
                Género: <span className="font-medium">{residente.genero_display}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-280px)]">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-gray-600">Cargando habitaciones...</p>
            </div>
          ) : habitaciones.length === 0 ? (
            <div className="text-center py-8">
              <Home className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">No hay habitaciones disponibles</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {habitaciones.map((habitacion) => {
                const compatible = isHabitacionCompatible(habitacion);
                const reason = getIncompatibilityReason(habitacion);

                return (
                  <button
                    key={habitacion.id}
                    onClick={() => compatible && setSelectedHabitacion(habitacion.id)}
                    disabled={!compatible}
                    className={`
                      relative p-4 rounded-lg border-2 text-left transition-all
                      ${
                        compatible
                          ? selectedHabitacion === habitacion.id
                            ? 'border-blue-600 bg-blue-50'
                            : 'border-gray-200 hover:border-blue-300 bg-white'
                          : 'border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed'
                      }
                    `}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-semibold text-lg text-gray-900">
                          Hab. {habitacion.numero}
                        </h4>
                        <p className="text-sm text-gray-600">Piso {habitacion.piso}</p>
                      </div>
                      {!compatible && reason && (
                        <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-700 rounded">
                          {reason}
                        </span>
                      )}
                    </div>

                    <div className="space-y-1 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-600">Tipo:</span>
                        <span className="font-medium">
                          {TipoHabitacionDisplay[habitacion.tipo]}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-gray-600">Ocupación:</span>
                        <span className="font-medium">
                          {habitacion.asignaciones_activas_count}/{habitacion.capacidad_maxima}
                        </span>
                      </div>

                      {habitacion.genero_asignado && (
                        <div className="flex items-center gap-2">
                          <span className="text-gray-600">Género asignado:</span>
                          <span className="font-medium">
                            {habitacion.genero_asignado_display}
                          </span>
                        </div>
                      )}
                    </div>

                    {selectedHabitacion === habitacion.id && (
                      <div className="absolute top-2 right-2">
                        <div className="h-5 w-5 bg-blue-600 rounded-full flex items-center justify-center">
                          <svg
                            className="h-3 w-3 text-white"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        </div>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={!selectedHabitacion || submitting}
            className={`
              px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors
              ${
                !selectedHabitacion || submitting
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              }
            `}
          >
            {submitting ? 'Asignando...' : 'Asignar Habitación'}
          </button>
        </div>
      </div>
    </div>
  );
};
