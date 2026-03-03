import React, { useEffect, useState } from 'react';
import { Search, Filter, MapPin, Clock, Wrench, ChevronRight } from 'lucide-react';
import { fetchWithAuth } from '../../../utils/api';
export const AdminIncidences = () => {
  const [incidences, setIncidences] = useState([]);

  const loadData = async () => {
    try {
      const response = await fetchWithAuth('/api/incidences/');
      const data = await response.json();
      setIncidences(data);
    } catch (error) {
      console.error("Error cargando incidencias:", error);
    }
  };


  const locationLabels: Record<string, string> = {
    habitacion: 'Habitación',
    baño: 'Baño Común',
    cocina: 'Cocina',
    zonas_comunes: 'Zonas Comunes',
  };

  const statusLabels: Record<string, string> = {
    pending: 'Pendiente',
    reviewing: 'En revisión',
    in_progress: 'En proceso',
    resolved: 'Resuelto',
  };

  const priorityLabels: Record<string, string> = {
    low: 'BAJA',
    medium: 'MEDIA',
    high: 'ALTA',
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="bg-slate-50 min-h-screen p-4 pb-20">
      {/* Header */}
      <header className="flex justify-between items-center mb-6 px-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Incidencias</h1>
          <p className="text-slate-500 text-sm">Panel de Administración</p>
        </div>
        <div className="flex gap-4">
          <div className="relative">
            <span className="absolute -top-1 -right-1 bg-red-500 w-2 h-2 rounded-full border-2 border-white"></span>
            <button className="text-slate-400">🔔</button>
          </div>
          <button className="text-slate-400">☰</button>
        </div>
      </header>

      {/* Inputs (UI de tu compañera) */}
      <div className="space-y-3 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-3 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Buscar por título, persona o lugar..." 
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <button className="w-full flex justify-between items-center bg-white px-4 py-3 rounded-xl border border-slate-200 shadow-sm text-slate-600">
          <div className="flex items-center gap-2">
            <Filter size={18} />
            <span>Todos los estados</span>
          </div>
          <ChevronRight size={18} className="rotate-90" />
        </button>
      </div>

      {/* Listado de Tarjetas */}
      <div className="space-y-4">
        {incidences.map((inc: any) => (
          <div key={inc.id} className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
            {/* Top: Avatar y Prioridad */}
            <div className="flex justify-between items-start mb-4">
              <div className="flex gap-3">
                <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center font-bold text-lg border border-emerald-100">
                  {inc.student_name?.charAt(0) || "U"}
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base">{inc.student_name}</h3>
                  <div className="flex items-center gap-1 text-slate-400 text-xs mt-0.5">
                    <Clock size={12} />
                    <span>{new Date(inc.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg tracking-wider ${
                inc.priority === 'high' ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-500'
              }`}>
                {priorityLabels[inc.priority] || priorityLabels['low']}
              </span>
            </div>

            {/* Content */}
            <h2 className="text-lg font-extrabold text-slate-900 mb-2">{inc.title}</h2>
            <div className="flex items-center gap-1 text-orange-500 mb-3">
              <MapPin size={14} />
              <span className="text-xs font-semibold">
                {locationLabels[inc.location_type] || inc.location_type}{' '}
                {inc.location_type === 'habitacion' && inc.room_number ? inc.room_number : ''}
              </span>
            </div>
            
            <div className="bg-slate-50 p-3 rounded-2xl mb-4">
              <p className="text-slate-500 text-sm leading-relaxed italic">
                {inc.description}
              </p>
            </div>

            {/* Bottom: Estado y Gestión */}
            <div className="flex justify-between items-center">
              <div className="flex gap-2">
                <span className="bg-blue-50 text-blue-600 px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 border border-blue-100">
                  <Clock size={14} />
                  {statusLabels[inc.status] || inc.status}
                </span>
                {inc.technician && (
                  <span className="bg-slate-100 text-slate-600 px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5">
                    <Wrench size={14} />
                    {inc.technician}
                  </span>
                )}
              </div>
              <button className="text-emerald-600 font-bold text-sm flex items-center gap-1">
                Gestionar <ChevronRight size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};