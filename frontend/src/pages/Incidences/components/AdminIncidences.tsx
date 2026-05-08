import { useEffect, useState } from 'react';
import { Clock, ChevronRight, MapPin, Plus, Send, Wrench, Pencil, Trash2 } from 'lucide-react';
import { IncidenceService, IncidenceStatus } from '../../../services/incidences';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '../../../components/ui/dialog';
import { IncidenceForm } from './IncidenceForm';
import { useStaff } from '../../Staff/hooks/useStaff';
import { Label } from "../../../components/ui/label";
import { Button } from '../../../components/ui/button';

import {
  LOCATION_LABELS, IncidenceSelect, PRIORITY_LABELS, STATUS_CONFIG,
  applyIncidenceFilters, COMMON_UI_CLASSES, BaseIncidence
} from './IncidenceShared';

interface ManageModalProps {
  incidence: BaseIncidence;
  onClose: () => void;
  onRefresh: () => void;
}

const ManageIncidenceModal = ({ incidence, onClose, onRefresh }: ManageModalProps) => {
  const { staff, loading: loadingStaff } = useStaff();
  const [status, setStatus] = useState(incidence.status);

  const [staffId, setStaffId] = useState<number | string>(() => {
    if (incidence.assigned_staff) return String(incidence.assigned_staff);
    if (incidence.assigned_external_name) return "external_placeholder";
    return 'none';
  });

  const [externalName, setExternalName] = useState(incidence.assigned_external_name || '');
  const [newComment, setNewComment] = useState('');
  const [saving, setSaving] = useState(false);

  const staffOptions = staff.reduce((acc, m) => ({
    ...acc, [String(m.id)]: m.full_name
  }), {
    "none": "Sin asignar",
    "external_placeholder": "+ Personal Externo"
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      await IncidenceService.update(incidence.id, {
        status: status as IncidenceStatus,
        assigned_staff: (staffId === "external_placeholder" || staffId === "none") ? null : Number(staffId),
        assigned_external_name: staffId === "external_placeholder" ? externalName : "",
        quick_comment: newComment.trim() || undefined
      });
      onRefresh();
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const locationDisplay = incidence.location_type === 'habitacion'
    ? `Habitación ${incidence.room_number_detail?.numero} Planta ${incidence.room_number_detail?.planta} Edificio ${incidence.room_number_detail?.edificio || ''}`
    : (LOCATION_LABELS[incidence.location_type] || incidence.location_type);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className={UI_CLASSES.dialogNotes}>
        <DialogTitle className={UI_CLASSES.notesTitle}>Gestionar Incidencia</DialogTitle>
        <DialogDescription className="sr-only">Actualizar estado o asignar personal</DialogDescription>
        <div className="p-6 bg-white overflow-y-auto max-h-[85vh] space-y-6 pb-12 text-left">
          <p className="text-slate-500 text-sm font-medium">{incidence.title} • {locationDisplay}</p>

          <div className="space-y-5">
            {incidence.img && (
              <section className="flex justify-center mb-2">
                <button
                  type="button"
                  className="rounded-[24px] overflow-hidden border max-w-[200px] bg-slate-50 cursor-zoom-in"
                  onClick={() => window.open(incidence.img, '_blank')}
                  aria-label="Ver evidencia"
                >
                  <img src={incidence.img} alt="Evidencia" className="w-full h-auto object-contain max-h-[160px]" />
                </button>
              </section>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className={UI_CLASSES.label}>Estado Actual</Label>
                <IncidenceSelect value={status} onChange={(v: any) => setStatus(v)} options={STATUS_CONFIG} placeholder="Estado" />
              </div>
              <div className="space-y-2">
                <Label className={UI_CLASSES.label}>Asignar Responsable</Label>
                <IncidenceSelect
                  value={String(staffId)}
                  onChange={(v: any) => { setStaffId(v); if (v !== "external_placeholder") setExternalName(""); }}
                  options={staffOptions}
                  placeholder={loadingStaff ? "Cargando..." : "Seleccionar"}
                />
              </div>
            </div>

            {staffId === "external_placeholder" && (
              <div className="animate-in fade-in slide-in-from-top-1 space-y-2">
                <Label className={UI_CLASSES.label}>Nombre Técnico/Empresa Externa</Label>
                <input value={externalName} onChange={(e) => setExternalName(e.target.value)} placeholder="Ej: Cerrajero..." className={UI_CLASSES.input} />
              </div>
            )}
            <div className="space-y-2 text-left">
              <Label className={UI_CLASSES.label}>Descripción del problema</Label>
              <div className="relative">
                <textarea value={incidence.description} readOnly className={UI_CLASSES.historyScrollArea} />
              </div>
            </div>
            <div className="space-y-2 text-left">
              <Label className={UI_CLASSES.label}>Historial de actualizaciones</Label>
              <div className={UI_CLASSES.historyScrollArea}>
                {incidence.updates && incidence.updates.length > 0 ? (
                  incidence.updates.map((u) => (
                    <div key={u.id} className={UI_CLASSES.historyBubble}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[9px] font-black text-primary uppercase bg-primary/10 px-1.5 py-0.5 rounded">{u.author_name || 'Admin'}</span>
                        <span className="text-[9px] text-slate-400 font-bold">{new Date(u.created_at).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <p className="text-xs text-slate-600 leading-snug">{u.text}</p>
                    </div>
                  ))
                ) : <p className="text-center py-4 text-xs text-slate-400 italic">Sin mensajes previos.</p>}
              </div>
            </div>

            <div className="space-y-2 text-left">
              <Label className={UI_CLASSES.label}>Mensaje para el residente</Label>
              <div className="relative">
                <textarea value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Escribe aquí..." className={UI_CLASSES.textarea} maxLength={255}/>
                <Send size={16} className="absolute right-3 bottom-3 text-slate-300 pointer-events-none" />
              </div>
            </div>
          </div>
          <div className="flex gap-3 mt-4 pt-4 border-t">
            <button type="button" onClick={onClose} className={UI_CLASSES.btnSecondary}>Cancelar</button>
            <button type="button" onClick={handleSave} disabled={saving} className={UI_CLASSES.btnPrimary}>{saving ? 'Guardando...' : 'Actualizar'}</button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export const AdminIncidences = () => {
  const [incidences, setIncidences] = useState<BaseIncidence[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [filterLocation, setFilterLocation] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [selectedIncidence, setSelectedIncidence] = useState<BaseIncidence | null>(null);

  const [incidenceToDelete, setIncidenceToDelete] = useState<BaseIncidence | null>(null);
  const [incidenceToEdit, setIncidenceToEdit] = useState<BaseIncidence | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const d = await IncidenceService.getAll();
      setIncidences(d as BaseIncidence[]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleDelete = async () => {
    if (!incidenceToDelete) return;
    try {
      await IncidenceService.delete(incidenceToDelete.id);
      loadData();
      setIncidenceToDelete(null);
    } catch (e) {
      alert("Error al borrar la incidencia");
    }
  };

  const filtered = incidences.filter((inc) => applyIncidenceFilters(inc, { search, location: filterLocation, status: filterStatus, priority: filterPriority }));

  return (
    <div className={UI_CLASSES.mainLayout}>
      <main className={UI_CLASSES.mainContent}>
        <div className="mb-6 text-left">
          <h2 className="text-2xl font-bold text-gray-900">Incidencias</h2>
          <p className="text-sm text-gray-500 mt-1">Gestión administrativa del centro</p>
        </div>

        <div className="w-full space-y-6">
          <div className={UI_CLASSES.filterGrid}>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar incidencia..." className={UI_CLASSES.filterInput} />
            <IncidenceSelect value={filterLocation} onChange={setFilterLocation} options={LOCATION_LABELS} placeholder="Áreas" />
            <IncidenceSelect value={filterStatus} onChange={setFilterStatus} options={STATUS_CONFIG} placeholder="Estados" />
            <IncidenceSelect value={filterPriority} onChange={setFilterPriority} options={PRIORITY_LABELS} placeholder="Prioridad" />
          </div>

          {loading ? <p className={UI_CLASSES.loadingText}>Cargando panel administrativo...</p> : (
            <div className={UI_CLASSES.incidencesGrid}>
              {filtered.map((inc) => {
                const cfg = STATUS_CONFIG[inc.status] || STATUS_CONFIG.pending;
                return (
                  <div key={inc.id} className={UI_CLASSES.card}>
                    <div className="flex justify-between border-b pb-4 mb-4">
                      <div className="flex gap-3 text-left">
                        <div className={UI_CLASSES.avatar}>{inc.student_name?.charAt(0)}</div>
                        <div>
                          <h3 className={UI_CLASSES.cardStudentName}>{inc.student_name}</h3>
                          <div className={UI_CLASSES.cardDate}><Clock size={12} /> {new Date(inc.created_at).toLocaleDateString()}</div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <div className="flex gap-1">
                          {inc.is_mine && (!inc.updates || inc.updates.length === 0) && !inc.assigned_staff && !(inc.assigned_external_name && inc.assigned_external_name.trim()) && (
                            <>
                              <button
                                onClick={() => setIncidenceToEdit(inc)}
                                className={UI_CLASSES.actionBtnSmall}
                                title="Editar contenido"
                              >
                                <Pencil size={12} className="text-blue-500" />
                              </button>
                              <button
                                onClick={() => setIncidenceToDelete(inc)}
                                className={UI_CLASSES.actionBtnSmall}
                                title="Eliminar reporte"
                              >
                                <Trash2 size={12} className="text-red-500" />
                              </button>
                            </>
                          )}
                        </div>
                        <span className={`${UI_CLASSES.priorityBadge} ${inc.priority === 'high' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                          {PRIORITY_LABELS[inc.priority]}
                        </span>
                      </div>
                    </div>

                    <div className="text-left flex-1 flex flex-col justify-between">
                      <div>
                        <h2 className={UI_CLASSES.cardTitle}>{inc.title}</h2>
                        <div className={UI_CLASSES.cardLocation}><MapPin size={14} /> {LOCATION_LABELS[inc.location_type]}
                        </div>
                        <div className="flex flex-wrap gap-2 mt-4">
                          <span className={`${cfg.admin.bg} ${cfg.admin.text} ${UI_CLASSES.statusBadge}`}>{cfg.label}</span>
                          {(inc.assigned_staff_name || inc.assigned_external_name) && (
                            <span className={UI_CLASSES.technicianBadge}>
                              <Wrench size={13} /> {inc.assigned_staff_name || `${inc.assigned_external_name} (Ext)`}
                            </span>
                          )}
                        </div>
                      </div>
                      <button onClick={() => setSelectedIncidence(inc)} className={UI_CLASSES.btnManage + " mt-6 self-end"}>
                        Gestionar <ChevronRight size={18} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* MODAL ELIMINAR CONFIRMACIÓN */}
        <Dialog open={!!incidenceToDelete} onOpenChange={() => setIncidenceToDelete(null)}>
          <DialogContent className="max-w-[400px] rounded-3xl p-6">
            <DialogTitle className="text-center font-bold">¿Eliminar incidencia?</DialogTitle>
            <DialogDescription className="text-center text-gray-500 mt-2">
              Esta acción no se puede deshacer. Vas a borrar el reporte: <strong>{incidenceToDelete?.title}</strong>.
            </DialogDescription>
            <div className="flex gap-3 mt-6">
              <Button variant="outline" onClick={() => setIncidenceToDelete(null)} className="flex-1 rounded-xl h-12 font-bold">Cancelar</Button>
              <Button variant="destructive" onClick={handleDelete} className="flex-1 rounded-xl h-12 font-bold">Eliminar</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* MODAL EDITAR  */}
        <Dialog open={!!incidenceToEdit} onOpenChange={() => setIncidenceToEdit(null)}>
          <DialogContent className="max-w-[425px] rounded-[32px] p-0 border-none overflow-hidden">
            <DialogTitle className="sr-only">Editar incidencia</DialogTitle>
            <IncidenceForm
              isAdmin
              initialData={incidenceToEdit}
              onSuccess={() => { loadData(); setIncidenceToEdit(null); }}
              onClose={() => setIncidenceToEdit(null)}
            />
          </DialogContent>
        </Dialog>

        {/* MODAL GESTIONAR */}
        {selectedIncidence && (
          <ManageIncidenceModal
            incidence={selectedIncidence}
            onClose={() => setSelectedIncidence(null)}
            onRefresh={loadData}
          />
        )}
      </main>

      <button onClick={() => setIsFormOpen(true)} className={UI_CLASSES.btnFloating} aria-label="Nueva incidencia">
        <Plus size={32} />
      </button>

      <Dialog open={isFormOpen} onOpenChange={(o) => setIsFormOpen(o)}>
        <DialogContent className="max-w-[425px] rounded-[32px] p-0 border-none overflow-hidden">
          <DialogTitle className="sr-only">Nueva incidencia</DialogTitle>
          <IncidenceForm
            isAdmin
            onSuccess={() => { loadData(); setIsFormOpen(false); }}
            onClose={() => setIsFormOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminIncidences;

const UI_CLASSES = {
  ...COMMON_UI_CLASSES,
  mainLayout: "bg-background min-h-screen flex flex-col",
  mainContent: "flex-1 overflow-y-auto p-4 md:p-10 pb-32",
  incidencesGrid: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-stretch",
  filterGrid: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8",
  card: "bg-white rounded-[32px] p-6 shadow-sm border border-slate-100 hover:shadow-xl transition-all h-full flex flex-col justify-between",
  cardTitle: "font-bold text-lg text-slate-900 truncate",
  cardStudentName: "font-bold text-slate-800 text-sm uppercase tracking-tight",
  cardDate: "flex items-center gap-1 text-slate-400 text-[10px] font-bold uppercase",
  cardLocation: "flex items-center gap-1.5 text-orange-600 text-xs font-bold mb-4",
  avatar: "w-10 h-10 bg-slate-100 text-slate-600 rounded-full flex items-center justify-center font-bold",
  priorityBadge: "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider h-fit inline-flex items-center",
  label: "text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block",
  input: "w-full bg-slate-50 border border-slate-100 rounded-2xl h-[50px] px-4 font-bold text-slate-700 outline-none text-sm mt-2 focus:ring-2 focus:ring-primary",
  textarea: "w-full bg-slate-50 border border-slate-100 rounded-2xl min-h-[100px] p-4 text-sm font-medium outline-none resize-none focus:ring-2 focus:ring-primary",
  btnPrimary: "flex-1 h-12 rounded-2xl bg-primary text-primary-foreground font-black uppercase tracking-widest text-xs shadow-lg hover:bg-primary/90 transition-all",
  btnSecondary: "flex-1 h-12 rounded-2xl font-black uppercase text-xs text-slate-400 bg-slate-50 hover:bg-slate-100 transition-all",
  statusBadge: "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm",
  technicianBadge: "px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-[10px] font-bold flex items-center gap-1.5",
  btnManage: "text-primary font-black text-xs flex items-center gap-1 uppercase tracking-widest hover:gap-2 transition-all",
  btnFloating: "fixed bottom-24 right-8 w-16 h-16 bg-primary text-primary-foreground rounded-full shadow-2xl flex items-center justify-center z-50 transition-transform active:scale-90",
  historyScrollArea: "bg-slate-50 border border-slate-100 rounded-2xl p-3 max-h-40 overflow-y-auto space-y-2 mb-2",
  historyBubble: "bg-white p-3 rounded-xl border border-slate-90 shadow-sm",
  actionBtnSmall: "p-1.5 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors border border-slate-100"
};