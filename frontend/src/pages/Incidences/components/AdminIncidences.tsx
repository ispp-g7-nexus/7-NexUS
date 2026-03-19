import { useEffect, useState } from 'react';
import { Clock, Wrench, ChevronRight, MapPin, Plus, Send, X } from 'lucide-react';
import { IncidenceService, IncidenceStatus } from '../../../services/incidences';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '../../../components/ui/dialog';
import { IncidenceForm } from './IncidenceForm';
import { Popover, PopoverTrigger, PopoverContent } from '../../../components/ui/popover';
import { useStaff } from '../../Staff/hooks/useStaff';
import { Label } from "../../../components/ui/label";

interface AdminIncidence {
  id: number;
  title: string;
  description?: string;
  img?: string;
  student_name?: string;
  room_number?: string;
  location_type: string;
  status: IncidenceStatus;
  priority: 'low' | 'high';
  created_at: string;
  assigned_staff?: number;
  assigned_staff_name?: string;
  assigned_staff_job?: string;
  assigned_external_name?: string;
  updates?: { id: number; author_name?: string; created_at: string; text: string }[];
}

const IncidenceSelect = ({
  value,
  onChange,
  options,
  placeholder,
  className = ""
}: {
  value: string,
  onChange: (val: string) => void,
  options: Record<string, any>,
  placeholder: string,
  className?: string
}) => {
  const [open, setOpen] = useState(false);

  const getSelectedLabel = () => {
    if (!value || value === 'all' || !options[value]) return placeholder;
    const option = options[value];
    return typeof option === 'object' ? option.label : option;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={`flex items-center justify-between w-full px-4 h-[50px] bg-white border border-slate-200 rounded-2xl text-sm font-medium transition-all outline-none focus:ring-2 focus:ring-[#82D14C]/10 hover:border-[#82D14C] ${className}`}>
          <span className={!value || value === 'all' ? 'text-slate-400' : 'text-slate-700'}>
            {getSelectedLabel()}
          </span>
          <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${open ? 'rotate-90' : 'rotate-0'}`} />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[--radix-popover-trigger-width] p-1 bg-white border-none rounded-2xl shadow-xl z-[100]">
        <div className="max-h-60 overflow-y-auto">
          <button
            type="button"
            onClick={() => { onChange('all'); setOpen(false); }}
            className="w-full text-left px-3 py-2 text-sm rounded-xl hover:bg-[#EEF8E7] hover:text-[#1B4D1C] transition-colors font-bold text-slate-400 border-b border-slate-50 mb-1"
          >
            Limpiar selección
          </button>
          {Object.entries(options).map(([key, val]) => (
            <button
              key={key}
              type="button"
              onClick={() => { onChange(key); setOpen(false); }}
              className={`w-full text-left px-3 py-2 text-sm rounded-xl transition-colors font-medium mb-0.5 last:mb-0 ${value === key ? 'bg-[#82D14C] text-white' : 'hover:bg-[#EEF8E7] text-slate-700 hover:text-[#1B4D1C]'}`}
            >
              {typeof val === 'object' ? val.label : val}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};

const ManageIncidenceModal = ({
  incidence,
  onClose,
  onRefresh
}: {
  incidence: AdminIncidence,
  onClose: () => void,
  onRefresh: () => void
}) => {
  const { staff, loading: loadingStaff } = useStaff();
  const [status, setStatus] = useState(incidence.status);
  const [staffId, setStaffId] = useState<number | string>(incidence.assigned_staff || '');
  const [externalName, setExternalName] = useState(incidence.assigned_external_name || '');
  const [newComment, setNewComment] = useState('');
  const [saving, setSaving] = useState(false);

  // Transformamos el staff en el formato Record<string, string> que pide el select
  const staffOptions: Record<string, string> = staff.reduce((acc, member) => ({
    ...acc,
    [String(member.id)]: member.full_name
  }), {});
  
  // Añadimos la opción de personal externo
  staffOptions["external_placeholder"] = "+ Personal Externo";

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await IncidenceService.update(incidence.id, {
        status: status as IncidenceStatus,
        assigned_staff: staffId && staffId !== "external_placeholder" && staffId !== "all" ? Number(staffId) : null,
        assigned_external_name: staffId === "external_placeholder" ? externalName : "",
        quick_comment: newComment.trim() || undefined
      });
      onRefresh();
      onClose();
    } catch (error) {
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const locationDisplay = incidence.location_type === 'habitacion'
    ? `Habitación ${incidence.room_number || ''}`
    : (LOCATION_LABELS[incidence.location_type] || incidence.location_type);

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className={UI_CLASSES.dialogNotes}>
        <DialogTitle className={UI_CLASSES.notesTitle}>Gestionar Incidencia</DialogTitle>
        <DialogDescription className="sr-only">Panel de gestión de incidencia</DialogDescription>

        <div className="p-6 bg-white overflow-y-auto max-h-[80vh] space-y-6 pb-12">
          <div className="mb-2">
            <p className="text-slate-500 text-sm font-medium">{incidence.title} • {locationDisplay}</p>
          </div>

          <div className="space-y-5">
            {incidence.img && (
              <section className="flex justify-center mb-2">
                <div
                  className="rounded-[24px] overflow-hidden border border-slate-100 shadow-sm max-w-[200px] bg-slate-50 cursor-zoom-in"
                  onClick={() => window.open(incidence.img, '_blank')}
                  onKeyDown={(e) => e.key === 'Enter' && window.open(incidence.img, '_blank')}
                  role="button"
                  tabIndex={0}
                  aria-label="Ver evidencia ampliada"
                >
                  <img src={incidence.img} alt="Evidencia" className="w-full h-auto object-contain max-h-[160px]" />
                </div>
              </section>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="admin-status-select" className={UI_CLASSES.label}>Estado</Label>
                <div id="admin-status-select">
                  <IncidenceSelect value={status} onChange={(val) => setStatus(val as IncidenceStatus)} options={STATUS_STYLES} placeholder="Seleccionar estado" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin-staff-select" className={UI_CLASSES.label}>Asignar Personal</Label>
                <div id="admin-staff-select">
                  <IncidenceSelect 
                    value={staffId === "" && externalName !== "" ? "external_placeholder" : String(staffId)} 
                    onChange={(val) => {
                      setStaffId(val === "all" ? "" : val);
                      if (val !== "external_placeholder") setExternalName("");
                    }} 
                    options={staffOptions} 
                    placeholder={loadingStaff ? "Cargando..." : "Sin asignar"} 
                  />
                </div>
              </div>
            </div>

            {staffId === "external_placeholder" && (
              <div className="animate-in fade-in slide-in-from-top-1 space-y-2">
                <Label htmlFor="admin-external-name" className={UI_CLASSES.label}>Nombre Técnico/Empresa Externa</Label>
                <input
                  id="admin-external-name"
                  type="text"
                  value={externalName}
                  onChange={(e) => setExternalName(e.target.value)}
                  placeholder="Ej: Cerrajero..."
                  className={UI_CLASSES.input}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label className={UI_CLASSES.label}>Historial</Label>
              <div className={UI_CLASSES.historyScrollArea}>
                {incidence.updates && incidence.updates.length > 0 ? (
                  incidence.updates.map((u) => (
                    <div key={u.id} className={UI_CLASSES.historyBubble}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[9px] font-black text-emerald-700 uppercase bg-emerald-50 px-1.5 py-0.5 rounded">{u.author_name || 'Admin'}</span>
                        <span className="text-[9px] text-slate-400 font-bold">{new Date(u.created_at).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <p className="text-xs text-slate-600 leading-snug">{u.text}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-center py-4 text-xs text-slate-400 italic">Sin mensajes previos.</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="admin-comment" className={UI_CLASSES.label}>Mensaje para el residente</Label>
              <div className="relative">
                <textarea
                  id="admin-comment"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Escribe aquí..."
                  className={UI_CLASSES.textarea}
                />
                <div className="absolute right-3 bottom-3 text-slate-300 pointer-events-none"><Send size={16} /></div>
              </div>
            </div>
          </div>

          <div className="flex gap-3 mt-8 pt-4 border-t border-slate-50">
            <button type="button" onClick={onClose} className={UI_CLASSES.btnSecondary}>Cancelar</button>
            <button type="button" onClick={handleSave} disabled={saving} className={UI_CLASSES.btnPrimary}>{saving ? 'Guardando...' : 'Actualizar'}</button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export const AdminIncidences = () => {
  const [incidences, setIncidences] = useState<AdminIncidence[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [filterLocation, setFilterLocation] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [selectedIncidence, setSelectedIncidence] = useState<AdminIncidence | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await IncidenceService.getAll();
      setIncidences(data as AdminIncidence[]);
    } catch (error) {
      console.error(error);
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
        <div className="w-full space-y-6">
          <div className={UI_CLASSES.filterGrid}>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar incidencia..." className={UI_CLASSES.filterInput} />
            <IncidenceSelect value={filterLocation} onChange={setFilterLocation} options={LOCATION_LABELS} placeholder="Todas las áreas" />
            <IncidenceSelect value={filterStatus} onChange={setFilterStatus} options={STATUS_STYLES} placeholder="Todos los estados" />
            <IncidenceSelect value={filterPriority} onChange={setFilterPriority} options={PRIORITY_LABELS} placeholder="Prioridad" />
          </div>

          {loading ? <p className={UI_CLASSES.loadingText}>Cargando panel...</p> : (
            <div className={UI_CLASSES.incidencesGrid}>
              {filteredIncidences.map((inc) => (
                <div key={inc.id} className={UI_CLASSES.card}>
                  <div className="flex justify-between items-start pb-4 mb-4 border-b border-slate-100">
                    <div className="flex gap-3 text-left">
                      <div className={UI_CLASSES.avatar}>{inc.student_name?.charAt(0)}</div>
                      <div>
                        <h3 className={UI_CLASSES.cardStudentName}>{inc.student_name}</h3>
                        <div className={UI_CLASSES.cardDate}><Clock size={12} /> {new Date(inc.created_at).toLocaleDateString()}</div>
                      </div>
                    </div>
                    <span className={`${UI_CLASSES.priorityBadge} ${inc.priority === 'high' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                      {PRIORITY_LABELS[inc.priority]}
                    </span>
                  </div>

                  <div className="flex-1 flex flex-col text-left">
                    <h2 className={UI_CLASSES.cardTitle}>{inc.title}</h2>
                    <div className={UI_CLASSES.cardLocation}><MapPin size={14} /> {LOCATION_LABELS[inc.location_type]} {inc.room_number || ''}</div>
                    <div className={UI_CLASSES.descriptionBox}><p className="italic text-slate-500 line-clamp-2">"{inc.description}"</p></div>

                    <div className="flex flex-wrap gap-2 mt-4">
                      <span className={`${STATUS_STYLES[inc.status]?.bg} ${STATUS_STYLES[inc.status]?.text} ${UI_CLASSES.statusBadge}`}>
                        {STATUS_STYLES[inc.status]?.label}
                      </span>
                      {(inc.assigned_staff_name || inc.assigned_external_name) && (
                        <span className={UI_CLASSES.technicianBadge}>
                          <Wrench size={13} />
                          {inc.assigned_staff_name || `${inc.assigned_external_name} (Ext)`}
                        </span>
                      )}
                    </div>

                    <div className="flex justify-end mt-auto pt-4 border-t border-slate-50">
                      <button type="button" onClick={() => setSelectedIncidence(inc)} className={UI_CLASSES.btnManage}>
                        Gestionar <ChevronRight size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        {selectedIncidence && <ManageIncidenceModal incidence={selectedIncidence} onClose={() => setSelectedIncidence(null)} onRefresh={loadData} />}
      </main>
      <button type="button" onClick={() => setIsFormOpen(true)} className={UI_CLASSES.btnFloating}><Plus size={32} /></button>
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-[90vw] sm:max-w-[425px] rounded-[32px] p-0 border-none overflow-hidden">
          <DialogTitle className="sr-only">Nueva Incidencia</DialogTitle>
          <IncidenceForm isAdmin onSuccess={() => { loadData(); setIsFormOpen(false); }} onClose={() => setIsFormOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminIncidences;

const LOCATION_LABELS: Record<string, string> = { habitacion: 'Habitación', baño: 'Baño Común', cocina: 'Cocina', comedor: 'Comedor', exterior: 'Zonas Exteriores', salas_comunes: 'Salas Comunes' };
const PRIORITY_LABELS: Record<string, string> = { low: 'Baja', high: 'Urgente' };
const STATUS_STYLES: Record<string, any> = {
  pending: { label: 'Pendiente', bg: 'bg-slate-100', text: 'text-slate-600' },
  reviewing: { label: 'En revisión', bg: 'bg-orange-100', text: 'text-orange-600' },
  in_progress: { label: 'En proceso', bg: 'bg-blue-100', text: 'text-blue-600' },
  resolved: { label: 'Resuelto', bg: 'bg-green-100', text: 'text-green-600' },
};

const UI_CLASSES = {
  mainLayout: "bg-slate-50 min-h-screen flex flex-col",
  mainContent: "flex-1 overflow-y-auto p-4 md:p-10 pb-32 w-full",
  incidencesGrid: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 w-full",
  filterGrid: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8",
  filterInput: "w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-[#1B4D1C]/20 bg-white text-sm font-medium",
  card: "bg-white rounded-[32px] p-6 shadow-sm border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 h-full flex flex-col justify-between",
  cardTitle: "font-bold text-lg text-slate-900 mb-1 truncate",
  cardStudentName: "font-bold text-slate-800 text-sm uppercase tracking-tight",
  cardDate: "flex items-center gap-1 text-slate-400 text-[10px] font-bold uppercase",
  cardLocation: "flex items-center gap-1.5 text-orange-600 text-xs font-bold mb-4",
  avatar: "w-10 h-10 bg-slate-100 text-slate-600 rounded-full flex items-center justify-center font-bold",
  priorityBadge: "text-[10px] font-bold px-3 py-1 rounded-full tracking-wider uppercase",

  dialogNotes: "max-w-[95vw] sm:max-w-[550px] rounded-[30px] p-0 border-none overflow-hidden shadow-2xl",
  notesTitle: "p-5 bg-white border-b border-slate-50 font-black text-[#1B4D1C] uppercase tracking-widest text-[11px] text-center",

  label: "text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1",
  input: "w-full bg-slate-50 border border-slate-100 rounded-2xl h-[50px] px-4 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 text-sm",
  textarea: "w-full bg-slate-50 border border-slate-100 rounded-2xl min-h-[100px] p-4 text-sm font-medium outline-none resize-none focus:ring-2 focus:ring-emerald-500 text-slate-700",
  btnPrimary: "flex-1 h-12 rounded-2xl bg-[#1B4D1C] text-white font-black uppercase tracking-widest text-xs shadow-lg hover:bg-[#2a632c] transition-all",
  btnSecondary: "flex-1 h-12 rounded-2xl font-black uppercase tracking-widest text-xs text-slate-400 bg-slate-50 hover:bg-slate-100 transition-all",

  descriptionBox: "bg-slate-50/50 p-4 rounded-2xl text-sm leading-relaxed",
  statusBadge: "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider",
  technicianBadge: "px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-[10px] font-bold flex items-center gap-1.5",
  btnManage: "text-[#1B4D1C] font-black text-xs flex items-center gap-1 hover:gap-2 transition-all uppercase tracking-widest",
  btnFloating: "fixed bottom-24 right-8 w-16 h-16 bg-[#1B4D1C] text-white rounded-full shadow-2xl flex items-center justify-center z-50 transition-transform active:scale-90",
  loadingText: "text-center text-slate-400 mt-20 font-bold uppercase tracking-widest",
  historyScrollArea: "bg-slate-50 border border-slate-100 rounded-2xl p-3 max-h-40 overflow-y-auto space-y-2 mb-2",
  historyBubble: "bg-white p-3 rounded-xl border border-slate-90 shadow-sm"
};