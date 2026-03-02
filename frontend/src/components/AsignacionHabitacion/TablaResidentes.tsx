// Tabla para mostrar todos los residentes con su asignación de habitación
import React, { useState, useEffect } from 'react';
import { Users, Home, LogOut, AlertCircle, CheckCircle } from 'lucide-react';
import { Residente } from '../../types/residencias';
import { residentesService } from '../../services/residencias';
import { ModalAsignacion } from './ModalAsignacion';

export const TablaResidentes: React.FC = () => {
  const [residentes, setResidentes] = useState<Residente[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedResidente, setSelectedResidente] = useState<Residente | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [processingId, setProcessingId] = useState<number | null>(null);

  useEffect(() => {
    loadResidentes();
  }, []);

  const loadResidentes = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await residentesService.list();
      setResidentes(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar residentes');
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = (residente: Residente) => {
    setSelectedResidente(residente);
    setShowAssignModal(true);
  };

  const handleRelease = async (residenteId: number) => {
    if (
      !confirm('¿Está seguro de dar de baja a este residente? Se liberará su habitación actual.')
    ) {
      return;
    }

    setProcessingId(residenteId);
    try {
      await residentesService.release({ residente_id: residenteId });
      await loadResidentes();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al dar de baja');
    } finally {
      setProcessingId(null);
    }
  };

  const handleAssignSuccess = () => {
    loadResidentes();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="ml-3 text-gray-600">Cargando residentes...</p>
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
            onClick={loadResidentes}
            className="mt-2 text-sm text-red-700 underline hover:text-red-800"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (residentes.length === 0) {
    return (
      <div className="text-center py-12">
        <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No hay residentes</h3>
        <p className="text-gray-600 mb-4">Los residentes se crearán automáticamente cuando los usuarios se registren</p>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Residente
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Género
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Habitación Actual
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {residentes.map((residente) => (
                <tr key={residente.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-10 w-10 flex-shrink-0 rounded-full bg-blue-100 flex items-center justify-center">
                        <Users className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {residente.user.full_name || residente.user.username}
                        </div>
                        <div className="text-sm text-gray-500">ID: {residente.id}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                      {residente.genero_display}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{residente.user.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {residente.asignacion_actual ? (
                      <div className="flex items-center">
                        <Home className="h-4 w-4 text-blue-600 mr-2" />
                        <span className="text-sm font-medium text-gray-900">
                          Hab. {residente.asignacion_actual.habitacion_numero}
                        </span>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">Sin asignar</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {residente.is_active ? (
                      <span className="px-2 py-1 inline-flex items-center gap-1 text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                        <CheckCircle className="h-3 w-3" />
                        Activo
                      </span>
                    ) : (
                      <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                        De Baja
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex items-center gap-2">
                      {residente.asignacion_actual ? (
                        <button
                          onClick={() => handleRelease(residente.id)}
                          disabled={processingId === residente.id}
                          className="px-3 py-1.5 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
                        >
                          {processingId === residente.id ? (
                            <>
                              <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                              Procesando...
                            </>
                          ) : (
                            <>
                              <LogOut className="h-4 w-4" />
                              Dar de Baja
                            </>
                          )}
                        </button>
                      ) : (
                        <button
                          onClick={() => handleAssign(residente)}
                          className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1"
                        >
                          <Home className="h-4 w-4" />
                          Asignar Habitación
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Summary Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>Total de residentes: {residentes.length}</span>
            <div className="flex items-center gap-4">
              <span>
                Con habitación: {residentes.filter((r) => r.asignacion_actual).length}
              </span>
              <span>
                Sin asignar: {residentes.filter((r) => !r.asignacion_actual).length}
              </span>
              <span>
                Activos: {residentes.filter((r) => r.is_active).length}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Asignación */}
      {selectedResidente && (
        <ModalAsignacion
          residente={selectedResidente}
          isOpen={showAssignModal}
          onClose={() => {
            setShowAssignModal(false);
            setSelectedResidente(null);
          }}
          onSuccess={handleAssignSuccess}
        />
      )}
    </>
  );
};
