import { useEffect, useState } from 'react';
import { MapPin, Clock, Wrench, ChevronRight, CheckCircle2 } from 'lucide-react';
import { fetchWithAuth } from '../../../utils/api';

export const AdminIncidences = () => {
  const [incidences, setIncidences] = useState([]);
  const [loading, setLoading] = useState(true); 
  const [search, setSearch] = useState('');
  const [filterLocation, setFilterLocation] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');

  const loadData = async () => {
    try {
      setLoading(true);
      const response = await fetchWithAuth('/api/incidences/');
      if (response.ok) {
        const data = await response.json();
        setIncidences(data);
      }
    } catch (error) {
      console.error("Error cargando incidencias:", error);
    } finally {
      setLoading(false);
    }
  };

  const locationLabels: Record<string, string> = {
    habitacion: 'Habitación',
    baño: 'Baño Común',
    cocina: 'Cocina',
    zonas_comunes: 'Zonas Comunes',
  };

  const priorityLabels: Record<string, string> = {
    low: 'BAJA',
    medium: 'MEDIA',
    high: 'ALTA',
  };

  const statusStyles: Record<string, { label: string; bg: string; text: string; border: string; icon: any }> = {
    pending: {
      label: 'Pendiente',
      bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-100',
      icon: <Clock size={14} />
    },
    reviewing: {
      label: 'En revisión',
      bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-100',
      icon: <Clock size={14} />
    },
    in_progress: {
      label: 'En proceso',
      bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-100',
      icon: <Wrench size={14} />
    },
    resolved: {
      label: 'Resuelto',
      bg: 'bg-green-50', text: 'text-green-600', border: 'border-green-100',
      icon: <CheckCircle2 size={14} />
    },
  };

  useEffect(() => {
    loadData();
  }, []);


  return (
    <div className="bg-slate-100 min-h-screen flex flex-col">

      <main className="flex-1 overflow-y-auto p-4 space-y-4 pb-32">
        
        <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative col-span-1 sm:col-span-2">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por título, estudiante o lugar..."
              className="w-full pl-3 pr-3 py-2.5 rounded-xl border border-slate-200 shadow-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
            />
          </div>
          <div>
            <select 
              value={filterLocation} 
              onChange={(e) => setFilterLocation(e.target.value)} 
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white shadow-sm outline-none"
            >
              <option value="all">Todas las áreas</option>
              <option value="habitacion">Habitación</option>
              <option value="baño">Baño Común</option>
              <option value="cocina">Cocina</option>
              <option value="zonas_comunes">Zonas Comunes</option>
            </select>
          </div>
          <div>
            <select 
              value={filterStatus} 
              onChange={(e) => setFilterStatus(e.target.value)} 
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white shadow-sm outline-none"
            >
              <option value="all">Todos los estados</option>
              <option value="pending">Pendiente</option>
              <option value="reviewing">En revisión</option>
              <option value="in_progress">En proceso</option>
              <option value="resolved">Resuelto</option>
            </select>
          </div>
          <div className="sm:col-span-1">
            <select 
              value={filterPriority} 
              onChange={(e) => setFilterPriority(e.target.value)} 
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white shadow-sm outline-none"
            >
              <option value="all">Todas las prioridades</option>
              <option value="low">BAJA</option>
              <option value="medium">MEDIA</option>
              <option value="high">ALTA</option>
            </select>
          </div>
        </div>

        {loading ? (
          <p className="text-center text-gray-400 mt-10 text-sm">Cargando incidencias...</p>
        ) : (
          incidences
            .filter((inc: any) => {
              const q = search.trim().toLowerCase();
              if (q) {
                const inTitle = inc.title?.toLowerCase().includes(q);
                const inStudent = inc.student_name?.toLowerCase().includes(q);
                const inRoom = inc.room_number?.toLowerCase().includes(q);
                if (!inTitle && !inStudent && !inRoom) return false;
              }
              if (filterLocation !== 'all' && inc.location_type !== filterLocation) return false;
              if (filterStatus !== 'all' && inc.status !== filterStatus) return false;
              if (filterPriority !== 'all' && inc.priority !== filterPriority) return false;
              
              return true;
            })
            .map((inc: any) => (
              <div key={inc.id} className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 transition-all hover:shadow-md">

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
                    inc.priority === 'high' ? 'bg-red-50 text-red-500' : 
                    inc.priority === 'medium' ? 'bg-orange-50 text-orange-500' : 
                    'bg-blue-50 text-blue-500'
                  }`}>
                    {priorityLabels[inc.priority] || inc.priority}
                  </span>
                </div>

                <h2 className="font-bold text-lg text-[#1A1C1E] text-slate-900 mb-2">{inc.title}</h2>
                <div className="flex items-center gap-1 text-orange-500 mb-3">
                  <MapPin size={14} />
                  <span className="text-xs font-semibold">
                    {locationLabels[inc.location_type] || inc.location_type}{' '}
                    {inc.location_type === 'habitacion' && inc.room_number ? `- Hab. ${inc.room_number}` : ''}
                  </span>
                </div>
                
                <div className="bg-slate-50 p-3 rounded-2xl mb-4">
                  <p className="text-slate-500 text-sm leading-relaxed italic line-clamp-2">
                    {inc.description}
                  </p>
                </div>

            {/* Bottom: Estado y Gestión */}
            <div className="flex justify-between items-center">
              <div className="flex gap-2">
                <span className={`
                    ${statusStyles[inc.status]?.bg || statusStyles.pending.bg} 
                    ${statusStyles[inc.status]?.text || statusStyles.pending.text} 
                    ${statusStyles[inc.status]?.border || statusStyles.pending.border} 
                    px-4 py-2 rounded-full text-xs font-black flex items-center gap-2 border shadow-sm
                `}>
                  {statusStyles[inc.status]?.icon || statusStyles.pending.icon}

                  {(statusStyles[inc.status]?.label || 'Pendiente')}
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
        )))}
      </main>
    </div>
  );
};
   