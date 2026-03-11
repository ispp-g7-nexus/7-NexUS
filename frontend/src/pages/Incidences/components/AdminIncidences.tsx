import { useEffect, useState } from 'react';
import { Clock, Wrench, ChevronRight, CheckCircle2, X, MapPin, MessageSquare } from 'lucide-react';
import { fetchWithAuth } from '../../../utils/api';

const ManageIncidenceModal = ({
  incidence,
  onClose,
  onRefresh
}: {
  incidence: any,
  onClose: () => void,
  onRefresh: () => void
}) => {
  const [status, setStatus] = useState(incidence.status);
  const [technician, setTechnician] = useState(incidence.assigned_technician || '');
  const [note, setNote] = useState(incidence.admin_notes || '');
  const [saving, setSaving] = useState(false);

  const locationLabels: Record<string, string> = {
    habitacion: 'Habitación',
    baño: 'Baño Común',
    cocina: 'Cocina',
    zonas_comunes: 'Zonas Comunes',
  };

  const reporterName = incidence.student_name || "Usuario Desconocido";

  const locationDisplay = incidence.location_type === 'habitacion'
    ? `Habitación ${incidence.room_number || ''}`
    : (locationLabels[incidence.location_type] || incidence.location_type);

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetchWithAuth(`/api/incidences/${incidence.id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: status,
          assigned_technician: technician,
          admin_notes: note,
          quick_comment: note
        }),
      });

      if (response.ok) {
        onRefresh();
        onClose();
      }
    } catch (error) {
      console.error("Error al actualizar:", error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-lg rounded-[32px] overflow-hidden shadow-2xl relative animate-in fade-in zoom-in duration-200">

        <button onClick={onClose} className="absolute right-6 top-6 p-2 hover:bg-gray-100 rounded-full transition-colors">
          <X size={20} className="text-gray-400" />
        </button>

        <div className="p-8">
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]"></div>
              <h2 className="text-xl font-extrabold text-slate-800">{incidence.title}</h2>
            </div>
            <p className="text-slate-400 text-sm">
              Reportada por <span className="font-bold text-slate-600">{reporterName}</span> en <span className="font-bold text-slate-600">{locationDisplay}</span>
            </p>
          </div>

          <div className="space-y-6">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Estado Actual</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full bg-slate-50 border-none rounded-2xl h-14 px-5 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 appearance-none cursor-pointer"
              >
                <option value="pending">Pendiente</option>
                <option value="reviewing">En revisión</option>
                <option value="in_progress">En proceso</option>
                <option value="resolved">Resuelto</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Asignar Técnico</label>
              <input
                type="text"
                value={technician}
                onChange={(e) => setTechnician(e.target.value)}
                placeholder="Nombre del técnico..."
                className="w-full bg-slate-50 border-none rounded-2xl h-14 px-5 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Nueva Nota / Comentario</label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Escribe una actualización..."
                className="w-full bg-slate-50 border-none rounded-2xl min-h-[100px] p-5 text-sm outline-none resize-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="flex gap-3 mt-8">
            <button onClick={onClose} className="flex-1 h-14 rounded-2xl font-bold text-slate-500 bg-slate-50 hover:bg-slate-100 transition-colors">Cancelar</button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 h-14 rounded-2xl bg-[#5B7C5C] hover:bg-[#4A664B] text-white font-bold shadow-lg disabled:opacity-50 transition-all active:scale-95"
            >
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- VISTA PRINCIPAL ---
export const AdminIncidences = () => {
  const [incidences, setIncidences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterLocation, setFilterLocation] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [selectedIncidence, setSelectedIncidence] = useState<any>(null);

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
    high: 'URGENTE',
  };

  const statusStyles: Record<string, { label: string; bg: string; text: string; border: string; icon: any }> = {
    pending: { label: 'Pendiente', bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-100', icon: <Clock size={14} /> },
    reviewing: { label: 'En revisión', bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-100', icon: <Clock size={14} /> },
    in_progress: { label: 'En proceso', bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-100', icon: <Wrench size={14} /> },
    resolved: { label: 'Resuelto', bg: 'bg-green-50', text: 'text-green-600', border: 'border-green-100', icon: <CheckCircle2 size={14} /> },
  };

  useEffect(() => { loadData(); }, []);

  return (
    <div className="bg-slate-100 min-h-screen flex flex-col">
      <main className="flex-1 overflow-y-auto p-4 space-y-4 pb-32">
        {/* Filtros */}
        <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative col-span-1 sm:col-span-2">
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar..." className="w-full pl-3 pr-3 py-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
          <select value={filterLocation} onChange={(e) => setFilterLocation(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white">
            <option value="all">Todas las áreas</option>
            {Object.entries(locationLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white">
            <option value="all">Todos los estados</option>
            {Object.entries(statusStyles).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white">
            <option value="all">Todas las prioridades</option>
            {Object.entries(priorityLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>

        {loading ? (
          <p className="text-center text-gray-400 mt-10 font-bold tracking-widest uppercase">Cargando...</p>
        ) : (
          incidences
            .filter((inc: any) => {
              const q = search.trim().toLowerCase();
              if (q && !(inc.title?.toLowerCase().includes(q) || inc.student_name?.toLowerCase().includes(q))) return false;
              if (filterLocation !== 'all' && inc.location_type !== filterLocation) return false;
              if (filterStatus !== 'all' && inc.status !== filterStatus) return false;
              if (filterPriority !== 'all' && inc.priority !== filterPriority) return false;
              return true;
            })
            .map((inc: any) => (
              <div key={inc.id} className="bg-white rounded-[24px] p-6 shadow-sm border border-slate-100 mb-4 transition-all hover:shadow-md relative overflow-hidden">

                <div className="flex justify-between items-start mb-5">
                  <div className="flex gap-4">
                    <div className="w-12 h-12 bg-green-50 text-green-700 rounded-full flex items-center justify-center font-bold text-lg border border-slate-100">
                      {inc.student_name?.charAt(0) || "U"}
                    </div>
                    <div>
                      <h3 className="font-extrabold text-[#1B4D1C] text-base leading-tight">
                        {inc.student_name}
                      </h3>
                      <div className="flex items-center gap-1.5 text-slate-400 text-[11px] mt-1 uppercase font-semibold tracking-wider">
                        <Clock size={12} />
                        <span>{new Date(inc.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  <span className={`text-[10px] font-black px-3 py-1 rounded-full tracking-wider uppercase ${inc.priority === 'high' ? 'bg-red-50 text-red-500' :
                      inc.priority === 'medium' ? 'bg-orange-50 text-orange-500' :
                        'bg-blue-50 text-blue-500'
                    }`}>
                    {priorityLabels[inc.priority]}
                  </span>
                </div>

                <h2 className="font-extrabold text-xl text-slate-900 mb-1 leading-tight">{inc.title}</h2>
                <div className="flex items-center gap-1.5 text-orange-500 mb-4">
                  <MapPin size={14} strokeWidth={2.5} />
                  <span className="text-sm font-semibold">
                    {locationLabels[inc.location_type]}
                    {inc.room_number ? ` ${inc.room_number}` : ''}
                  </span>
                </div>

                <div className="bg-[#F8FAFB] p-4 rounded-2xl mb-6 border border-slate-50">
                  <p className="text-slate-600 text-sm leading-relaxed">
                    <span className="block mb-2 italic">"{inc.description}"</span>

                    {inc.admin_notes && (
                      <span className="block pt-2 border-t border-slate-200 mt-2 text-emerald-700 font-medium">
                        <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest mb-1 text-emerald-600">
                          <MessageSquare size={10} /> Notas admin:
                        </span>
                        {inc.admin_notes}
                      </span>
                    )}
                  </p>
                </div>

                <div className="flex justify-between items-center pt-2">
                  <div className="flex gap-2">
                    <span className={`${statusStyles[inc.status]?.bg} ${statusStyles[inc.status]?.text} px-4 py-2 rounded-xl text-[11px] font-black border border-transparent flex items-center gap-2 shadow-sm`}>
                      {statusStyles[inc.status]?.icon}
                      {statusStyles[inc.status]?.label}
                    </span>

                    {inc.assigned_technician && (
                      <span className="bg-slate-50 text-slate-500 px-3 py-2 rounded-xl text-[11px] font-bold flex items-center gap-1.5 border border-slate-100">
                        <Wrench size={13} />
                        {inc.assigned_technician}
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => setSelectedIncidence(inc)}
                    className="text-[#5B7C5C] font-black text-sm flex items-center gap-1 hover:gap-2 transition-all"
                  >
                    Gestionar <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            ))
        )}

        {selectedIncidence && (
          <ManageIncidenceModal
            incidence={selectedIncidence}
            onClose={() => setSelectedIncidence(null)}
            onRefresh={loadData}
          />
        )}
      </main>
    </div>
  );
};