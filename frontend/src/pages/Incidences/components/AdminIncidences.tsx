import { useEffect, useState } from 'react';
import { Clock, Wrench, ChevronRight, CheckCircle2, MapPin, MessageSquare, Plus } from 'lucide-react';
import { IncidenceService, Incidence, IncidenceStatus } from '../../../services/incidences';
import { Dialog, DialogContent, DialogTitle } from '../../../components/ui/dialog';
import { IncidenceForm } from './IncidenceForm';
import { useStaff } from '../../Staff/hooks/useStaff';

const ManageIncidenceModal = ({
  incidence,
  onClose,
  onRefresh
}: {
  incidence: Incidence,
  onClose: () => void,
  onRefresh: () => void
}) => {
  const { staff, loading: loadingStaff } = useStaff();

  const [status, setStatus] = useState(incidence.status);
  const [staffId, setStaffId] = useState<number | string>(incidence.assigned_staff || '');
  const [externalName, setExternalName] = useState(incidence.assigned_external_name || '');
  const [note, setNote] = useState(incidence.admin_notes || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await IncidenceService.update(incidence.id, {
        status: status as IncidenceStatus,
        assigned_staff: staffId ? Number(staffId) : null,
        assigned_external_name: staffId ? "" : externalName,
        admin_notes: note,
        quick_comment:
          note.trim() && note.trim() !== (incidence.admin_notes || "").trim()
            ? note
            : undefined
      });
      onRefresh();
      onClose();
    } catch (error) {
      console.error("Error al actualizar:", error);
    } finally {
      setSaving(false);
    }
  };

  const locationDisplay = incidence.location_type === 'habitacion'
    ? `Habitación ${incidence.room_number || ''}`
    : (LOCATION_LABELS[incidence.location_type] || incidence.location_type);

  return (
    <div className={UI_CLASSES.modalOverlay}>
      <div className={UI_CLASSES.modalContainer}>
        <button type="button" aria-label="Cerrar modal" onClick={onClose} className={UI_CLASSES.modalCloseBtn}>
        <button type="button" aria-label="Cerrar modal" onClick={onClose} className={UI_CLASSES.modalCloseBtn}>
        </button>

        <div className={UI_CLASSES.modalPadding}>
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-1">
              <div className={UI_CLASSES.modalIndicator}></div>
              <h2 className={UI_CLASSES.modalTitle}>{incidence.title}</h2>
            </div>
            <p className={UI_CLASSES.modalSubtitle}>
              Reportada por <span className="font-semibold text-slate-600">{incidence.student_name || "Usuario"}</span> en <span className="font-semibold text-slate-600">{locationDisplay}</span>
            </p>
          </div>

          <div className="space-y-6">
            <div>
              <label className={UI_CLASSES.label}>Estado Actual</label>
              <select value={status} onChange={(e) => setStatus(e.target.value as IncidenceStatus)} className={UI_CLASSES.select}>
                <option value="pending">Pendiente</option>
                <option value="reviewing">En revisión</option>
                <option value="in_progress">En proceso</option>
                <option value="resolved">Resuelto</option>
              </select>
            </div>
            {/* Asignación de personal */}
            <div>
              <label className={UI_CLASSES.label}>Asignar Personal Responsable</label>
              <select
                value={staffId === "" && externalName !== "" ? "external_placeholder" : staffId}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "external_placeholder") {
                    setStaffId(""); // Limpiamos el staff
                  } else {
                    setStaffId(val);
                    setExternalName(""); // Si elige a alguien real, limpiamos el nombre externo
                  }
                }}
                className={UI_CLASSES.select}
                disabled={loadingStaff}
              >
                <option value="">{loadingStaff ? "Cargando..." : "Sin asignar"}</option>


                {staff.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.full_name} — {member.job_title}
                  </option>
                ))}

                <option value="external_placeholder" className="font-bold text-grey-600">
                  + Asignar Personal Externo / Otro
                </option>
              </select>
            </div>

            {/* CAMPO DE TEXTO PARA EXTERNOS */}
            {(staffId === "" && (externalName !== "" || staffId === "")) && (
              <div className="mt-4 animate-in slide-in-from-top-2 duration-200">
                <label className={UI_CLASSES.label}>Nombre del Técnico o Empresa Externa</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Ej: Cerrajeros urgentes, Paco el electricista..."
                    value={externalName}
                    onChange={(e) => setExternalName(e.target.value)}
                    className={UI_CLASSES.input}
                    autoFocus
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    <Wrench size={16} className="text-slate-300" />
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 mt-2 ml-1 italic">
                  Escribe el nombre de la persona o empresa que realizará el trabajo.
                </p>
              </div>
            )}

            <div>
              <label className={UI_CLASSES.label}>Nueva Nota / Comentario</label>
              <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Escribe una actualización..." className={UI_CLASSES.textarea} />
            </div>
          </div>

          <div className="flex gap-3 mt-8">
            <button onClick={onClose} className={UI_CLASSES.btnSecondary}>Cancelar</button>
            <button onClick={handleSave} disabled={saving} className={UI_CLASSES.btnPrimary}>
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const AdminIncidences = () => {
  const [incidences, setIncidences] = useState<Incidence[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false); 
  const [search, setSearch] = useState('');
  const [filterLocation, setFilterLocation] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [selectedIncidence, setSelectedIncidence] = useState<Incidence | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await IncidenceService.getAll();
      setIncidences(data);
    } catch (error) {
      console.error("Error cargando:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const filteredIncidences = incidences.filter((inc) => {
    const q = search.trim().toLowerCase();
    if (q && !(inc.title?.toLowerCase().includes(q) || (inc.student_name || '').toLowerCase().includes(q))) return false;
    if (filterLocation !== 'all' && inc.location_type !== filterLocation) return false;
    if (filterStatus !== 'all' && inc.status !== filterStatus) return false;
    if (filterPriority !== 'all' && inc.priority !== filterPriority) return false;
    return true;
  });

  return (
    <div className={UI_CLASSES.mainLayout}>
      <main className={UI_CLASSES.mainContent}>

        {/* Filtros */}
        <div className={UI_CLASSES.filterGrid}>
          <div className="relative col-span-1 sm:col-span-2">
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar..." className={UI_CLASSES.filterInput} />
          </div>
          <select value={filterLocation} onChange={(e) => setFilterLocation(e.target.value)} className={UI_CLASSES.filterSelect}>
            <option value="all">Todas las áreas</option>
            {Object.entries(LOCATION_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className={UI_CLASSES.filterSelect}>
            <option value="all">Todos los estados</option>
            {Object.entries(STATUS_STYLES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)} className={UI_CLASSES.filterSelect}>
            <option value="all">Todas las prioridades</option>
            {Object.entries(PRIORITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>

        {loading ? (
          <p className={UI_CLASSES.loadingText}>Cargando...</p>
        ) : (
          filteredIncidences.map((inc) => (
            <div key={inc.id} className={UI_CLASSES.card}>
              <div className="flex justify-between items-start mb-5">
                <div className="flex gap-4">
                  <div className={UI_CLASSES.avatar}>
                    {inc.student_name?.charAt(0) || "U"}
                  </div>
                  <div>
                    <h3 className={UI_CLASSES.cardStudentName}>{inc.student_name}</h3>
                    <div className={UI_CLASSES.cardDate}>
                      <Clock size={12} />
                      <span>{new Date(inc.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
                <span className={`${UI_CLASSES.priorityBadge} ${inc.priority === 'high' ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-500'}`}>
                  {PRIORITY_LABELS[inc.priority]}
                </span>
              </div>

              <h2 className={UI_CLASSES.cardTitle}>{inc.title}</h2>
              <div className={UI_CLASSES.cardLocation}>
                <MapPin size={14} strokeWidth={2} />
                <span className="text-sm font-medium">
                  {LOCATION_LABELS[inc.location_type]} {inc.room_number ? ` ${inc.room_number}` : ''}
                </span>
              </div>

              <div className={UI_CLASSES.descriptionBox}>
                <div className={UI_CLASSES.descriptionText}>
                  <p className="mb-2 italic text-slate-500">"{inc.description}"</p>
                  {inc.admin_notes && (
                    <div className={UI_CLASSES.adminNoteText}>
                      <span className={UI_CLASSES.adminNoteLabel}>
                        <MessageSquare size={10} /> Notas admin:
                      </span>
                      <p className="font-normal">{inc.admin_notes}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-between items-center pt-2">
                <div className="flex flex-wrap gap-2">
                  <span className={`${STATUS_STYLES[inc.status]?.bg} ${STATUS_STYLES[inc.status]?.text} ${UI_CLASSES.statusBadge}`}>
                    {STATUS_STYLES[inc.status]?.icon}
                    {STATUS_STYLES[inc.status]?.label}
                  </span>
                  {(inc.assigned_staff_name || inc.assigned_external_name) && (
                    <div className="flex flex-col">
                      <span className={`${UI_CLASSES.technicianBadge} ${inc.assigned_external_name && !inc.assigned_staff_name ? 'border-grey-100 bg-grey-50/30' : ''}`}>
                        <Wrench size={13} className={inc.assigned_external_name && !inc.assigned_staff_name ? 'text-grey-500' : ''} />

                        {inc.assigned_staff_name ? (
                          // Caso Interno
                          `${inc.assigned_staff_name} - ${inc.assigned_staff_job}`
                        ) : (
                          // Caso Externo
                          <span className="flex items-center gap-1">
                            {inc.assigned_external_name}
                            <span className="text-[9px] bg-red-100 text-red-600 px-1 rounded font-bold uppercase ml-1">Ext</span>
                          </span>
                        )}
                      </span>
                    </div>
                  )}
                </div>
                <button onClick={() => setSelectedIncidence(inc)} className={UI_CLASSES.btnManage}>
                  Gestionar <ChevronRight size={18} />
                </button>
              </div>
            </div>
          ))
        )}

        {selectedIncidence && (
          <ManageIncidenceModal incidence={selectedIncidence} onClose={() => setSelectedIncidence(null)} onRefresh={loadData} />
        )}
      </main>
      {/* Botón flotante para que el Admin también pueda crear */}
      <button
        onClick={() => setIsFormOpen(true)}
        className="fixed bottom-24 right-6 w-14 h-14 bg-[#1B4D1C] hover:bg-[#2d6b30] text-white rounded-full shadow-2xl flex items-center justify-center z-50 transition-transform active:scale-95"
      >
        <Plus size={32} strokeWidth={3} />
      </button>

      {/* El componente del formulario (tienes que importarlo) */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-[90vw] sm:max-w-[425px] rounded-[32px] p-0 border-none overflow-hidden">
          <DialogTitle className="sr-only">Nueva Incidencia</DialogTitle>
          <IncidenceForm
            onSuccess={() => { loadData(); setIsFormOpen(false); }}
            onClose={() => setIsFormOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminIncidences;

const LOCATION_LABELS: Record<string, string> = {
  habitacion: 'Habitación',
  baño: 'Baño Común',
  cocina: 'Cocina',
  comedor: 'Comedor',
  exterior: 'Zonas Exteriores',
  salas_comunes: 'Salas Comunes',
};

const PRIORITY_LABELS: Record<string, string> = {
  low: 'BAJA',
  high: 'URGENTE',
};

const STATUS_STYLES: Record<string, { label: string; bg: string; text: string; icon: any }> = {
  pending: { label: 'Pendiente', bg: 'bg-slate-50', text: 'text-slate-600', icon: <Clock size={14} /> },
  reviewing: { label: 'En revisión', bg: 'bg-orange-50', text: 'text-orange-600', icon: <Clock size={14} /> },
  in_progress: { label: 'En proceso', bg: 'bg-blue-50', text: 'text-blue-600', icon: <Wrench size={14} /> },
  resolved: { label: 'Resuelto', bg: 'bg-green-50', text: 'text-green-600', icon: <CheckCircle2 size={14} /> },
};

const UI_CLASSES = {
  mainLayout: "bg-slate-100 min-h-screen flex flex-col",
  mainContent: "flex-1 overflow-y-auto p-4 space-y-4 pb-32",
  loadingText: "text-center text-gray-400 mt-10 font-medium tracking-widest uppercase",
  modalOverlay: "fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4",
  modalContainer: "bg-white w-full max-w-lg rounded-[32px] overflow-hidden shadow-xl relative animate-in fade-in zoom-in duration-200",
  modalCloseBtn: "absolute right-6 top-6 p-2 hover:bg-gray-100 rounded-full transition-colors",
  modalPadding: "p-8 text-left",
  modalTitle: "text-xl font-bold text-slate-800",
  modalSubtitle: "text-slate-400 text-sm font-normal",
  modalIndicator: "w-2 h-2 rounded-full bg-blue-500",

  // Formularios
  label: "text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block ml-1",
  select: "w-full bg-slate-50 border-none rounded-2xl h-14 px-5 font-medium text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 appearance-none cursor-pointer",
  input: "w-full bg-slate-50 border-none rounded-2xl h-14 px-5 font-medium text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500",
  textarea: "w-full bg-slate-50 border-none rounded-2xl min-h-[100px] p-5 text-sm font-normal outline-none resize-none focus:ring-2 focus:ring-emerald-500",

  // Filtros
  filterGrid: "mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3",
  filterInput: "w-full pl-3 pr-3 py-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500 font-normal",
  filterSelect: "w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white font-normal text-slate-600",

  // Botones
  btnPrimary: "flex-1 h-14 rounded-2xl bg-[#5B7C5C] hover:bg-[#4A664B] text-white font-bold shadow-md disabled:opacity-50 transition-all active:scale-95",
  btnSecondary: "flex-1 h-14 rounded-2xl font-bold text-slate-500 bg-slate-50 hover:bg-slate-100 transition-colors",
  btnManage: "text-[#5B7C5C] font-bold text-sm flex items-center gap-1 hover:gap-2 transition-all",

  // Tarjetas (Card)
  card: "bg-white rounded-[24px] p-6 shadow-sm border border-slate-100 mb-4 text-left",
  cardTitle: "font-bold text-xl text-slate-900 mb-1 leading-tight",
  cardStudentName: "font-bold text-[#1B4D1C] text-base leading-tight uppercase",
  cardDate: "flex items-center gap-1.5 text-slate-400 text-[11px] mt-1 uppercase font-medium tracking-wider",
  cardLocation: "flex items-center gap-1.5 text-orange-500 mb-4",
  avatar: "w-12 h-12 bg-green-50 text-green-700 rounded-full flex items-center justify-center font-bold text-lg border border-slate-100",

  // Descripción y Notas
  descriptionBox: "bg-[#F8FAFB] p-4 rounded-2xl mb-6 border border-slate-50",
  descriptionText: "text-slate-600 text-sm leading-relaxed font-normal",
  adminNoteText: "block pt-2 border-t border-slate-200 mt-2 text-emerald-700",
  adminNoteLabel: "flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest mb-1 text-emerald-600",

  // Badges
  priorityBadge: "text-[10px] font-bold px-3 py-1 rounded-full tracking-wider uppercase",
  statusBadge: "px-4 py-2 rounded-xl text-[11px] font-bold flex items-center gap-2",
  technicianBadge: "bg-slate-50 text-slate-500 px-3 py-2 rounded-xl text-[11px] font-medium flex items-center gap-1.5 border border-slate-100",
};