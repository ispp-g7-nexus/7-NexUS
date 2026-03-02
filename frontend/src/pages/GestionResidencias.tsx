// Página principal de Gestión de Habitaciones y Residentes
import React, { useState } from 'react';
import { Home, Users, RefreshCw } from 'lucide-react';
import { TablaHabitaciones, TablaResidentes } from '../components/AsignacionHabitacion';

interface GestionResidenciasProps {
  embedded?: boolean;
}

export const GestionResidencias: React.FC<GestionResidenciasProps> = ({ embedded = false }) => {
  const [activeTab, setActiveTab] = useState<'habitaciones' | 'residentes'>('habitaciones');
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1);
  };

  const wrapperClassName = embedded ? 'max-w-7xl mx-auto' : 'min-h-screen bg-gray-50';
  const contentClassName = embedded ? 'px-0 py-0' : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8';

  return (
    <div className={wrapperClassName}>
      <div className={contentClassName}>
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Gestión de Residencias
          </h1>
          <p className="text-gray-600">
            Administra las habitaciones y asignaciones de residentes
          </p>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('habitaciones')}
                className={`
                  flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors
                  ${
                    activeTab === 'habitaciones'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                <Home className="h-5 w-5" />
                Habitaciones
              </button>
              <button
                onClick={() => setActiveTab('residentes')}
                className={`
                  flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors
                  ${
                    activeTab === 'residentes'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                <Users className="h-5 w-5" />
                Residentes
              </button>
            </nav>
          </div>
        </div>

        {/* Action Bar */}
        <div className="flex items-center justify-end mb-6">
          <button
            onClick={handleRefresh}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Actualizar
          </button>
        </div>

        {/* Content */}
        <div key={refreshKey}>
          {activeTab === 'habitaciones' && <TablaHabitaciones />}
          {activeTab === 'residentes' && <TablaResidentes />}
        </div>
      </div>
    </div>
  );
};
