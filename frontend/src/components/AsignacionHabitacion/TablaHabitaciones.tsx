// Tabla para mostrar todas las habitaciones con su estado de ocupación
import React, { useState, useEffect } from 'react';
import { Home, Users, AlertCircle } from 'lucide-react';
import {
  Habitacion,
  TipoHabitacionDisplay,
} from '../../types/residencias';
import { habitacionesService } from '../../services/residencias';

export const TablaHabitaciones: React.FC = () => {
  const [habitaciones, setHabitaciones] = useState<Habitacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadHabitaciones();
  }, []);

  const loadHabitaciones = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await habitacionesService.list();
      setHabitaciones(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar habitaciones');
    } finally {
      setLoading(false);
    }
  };

  const getOccupancyColor = (habitacion: Habitacion) => {
    if (habitacion.esta_vacia) return 'text-green-600 bg-green-50';
    if (habitacion.esta_llena) return 'text-red-600 bg-red-50';
    return 'text-yellow-600 bg-yellow-50';
  };

  const getOccupancyStatus = (habitacion: Habitacion) => {
    if (habitacion.esta_vacia) return 'Vacía';
    if (habitacion.esta_llena) return 'Llena';
    return 'Parcial';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="ml-3 text-gray-600">Cargando habitaciones...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm text-red-800">{error}</p>
          <button
            onClick={loadHabitaciones}
            className="mt-2 text-sm text-red-700 underline hover:text-red-800"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (habitaciones.length === 0) {
    return (
      <div className="text-center py-12">
        <Home className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No hay habitaciones</h3>
        <p className="text-gray-600 mb-4">Comienza agregando tu primera habitación</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Número
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Piso
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tipo
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Capacidad
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Ocupación
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Estado
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Género Asignado
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {habitaciones.map((habitacion) => (
              <tr key={habitacion.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="h-10 w-10 flex-shrink-0 rounded-lg bg-blue-100 flex items-center justify-center">
                      <Home className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">
                        {habitacion.numero}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{habitacion.piso}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-purple-100 text-purple-800">
                    {TipoHabitacionDisplay[habitacion.tipo]}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <Users className="h-4 w-4 text-gray-400 mr-2" />
                    <span className="text-sm text-gray-900">
                      {habitacion.capacidad_maxima}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="relative w-16 h-2 bg-gray-200 rounded-full overflow-hidden mr-2">
                      <div
                        className={`absolute top-0 left-0 h-full ${
                          habitacion.esta_llena
                            ? 'bg-red-500'
                            : habitacion.esta_vacia
                            ? 'bg-green-500'
                            : 'bg-yellow-500'
                        }`}
                        style={{
                          width: `${
                            (habitacion.asignaciones_activas_count /
                              habitacion.capacidad_maxima) *
                            100
                          }%`,
                        }}
                      ></div>
                    </div>
                    <span className="text-sm text-gray-900">
                      {habitacion.asignaciones_activas_count}/{habitacion.capacidad_maxima}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getOccupancyColor(
                      habitacion
                    )}`}
                  >
                    {getOccupancyStatus(habitacion)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {habitacion.genero_asignado ? (
                    <span className="text-sm text-gray-900">
                      {habitacion.genero_asignado_display}
                    </span>
                  ) : (
                    <span className="text-sm text-gray-400">-</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary Footer */}
      <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>Total de habitaciones: {habitaciones.length}</span>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <span className="h-3 w-3 rounded-full bg-green-500"></span>
              Vacías: {habitaciones.filter((h) => h.esta_vacia).length}
            </span>
            <span className="flex items-center gap-1">
              <span className="h-3 w-3 rounded-full bg-yellow-500"></span>
              Parciales: {habitaciones.filter((h) => !h.esta_vacia && !h.esta_llena).length}
            </span>
            <span className="flex items-center gap-1">
              <span className="h-3 w-3 rounded-full bg-red-500"></span>
              Llenas: {habitaciones.filter((h) => h.esta_llena).length}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
