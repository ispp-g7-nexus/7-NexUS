import { useState, useEffect, useCallback } from "react";
import { Plus, Bell, MapPin, User, Wrench, MessageSquare, Loader2, Clock, Pencil, Trash2, LogOut } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Card, CardContent } from "../../../components/ui/card";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "../../../components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "../../../components/ui/popover";
import { fetchWithAuth, API_URL_INCIDENCES } from "../../../utils/api";
import { IncidenceForm } from "./IncidenceForm";
import { IncidenceService } from "../../../services/incidences";

import {
  IncidenceSelect, LOCATION_LABELS, PRIORITY_LABELS, STATUS_CONFIG,
  formatUpdateText, applyIncidenceFilters, formatNotificationTime,
  getLastReadNotificationsAt, saveLastReadNotificationsAt,
  COMMON_UI_CLASSES, BaseIncidence
} from "./IncidenceShared";
import "../Incidences.css";

interface StudentIncidencesProps {
  onGoToProfile?: () => void;
  onLogout?: () => void;
}

export default function StudentIncidences({ onGoToProfile, onLogout }: StudentIncidencesProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [incidences, setIncidences] = useState<BaseIncidence[]>([]);
  const [selectedDetails, setSelectedDetails] = useState<BaseIncidence | null>(null);
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [loading, setLoading] = useState(true);

  const [incidenceToDelete, setIncidenceToDelete] = useState<BaseIncidence | null>(null);
  const [incidenceToEdit, setIncidenceToEdit] = useState<BaseIncidence | null>(null);

  const [search, setSearch] = useState('');
  const [filterLocation, setFilterLocation] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [showOnlyMine, setShowOnlyMine] = useState(false);

  const loadNotifications = useCallback(async (markAsRead = false, silent = false) => {
    try {
      if (!silent) setNotificationsLoading(true);
      const res = await fetchWithAuth(`${API_URL_INCIDENCES}notifications/`);
      if (!res.ok) return;
      const data = await res.json();
      const all = Array.isArray(data.results) ? data.results : [];
      const lastReadAt = getLastReadNotificationsAt();

      if (markAsRead && all.length > 0) {
        saveLastReadNotificationsAt(all[0].created_at);
        setUnreadNotifications(0);
      } else {
        const count = all.filter((n: any) => Date.parse(n.created_at) > lastReadAt).length;
        setUnreadNotifications(count);
      }
      setNotifications(all);
    } catch (e) { console.error(e); } finally { if (!silent) setNotificationsLoading(false); }
  }, []);

  const loadIncidences = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetchWithAuth(API_URL_INCIDENCES);
      if (res.ok) setIncidences(await res.json());
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    loadIncidences(); loadNotifications();
    const interval = setInterval(() => loadNotifications(false, true), 15000);
    return () => clearInterval(interval);
  }, [loadIncidences, loadNotifications]);

  const handleDelete = async () => {
    if (!incidenceToDelete) return;
    try {
      await IncidenceService.delete(incidenceToDelete.id);
      loadIncidences();
      setIncidenceToDelete(null);
    } catch (e) { alert("No se pudo eliminar la incidencia"); }
  };

  const filteredIncidences = incidences.filter((inc) => {
    if (inc.location_type === 'habitacion' && (inc as any).is_mine === false) {
      return false;
    }
    if (showOnlyMine && (inc as any).is_mine === false) return false;
    return applyIncidenceFilters(inc, { search, location: filterLocation, status: filterStatus, priority: filterPriority });
  });

  return (
    <div className={UI_CLASSES.mainLayout}>
      <header className={UI_CLASSES.header}>
        <h1 className={UI_CLASSES.headerTitle}>Incidencias</h1>
        <div className="flex items-center gap-2">
          <Popover open={isNotificationsOpen} onOpenChange={(open) => { setIsNotificationsOpen(open); if (open) loadNotifications(true); }}>
            <PopoverTrigger asChild>
              <Button type="button" size="icon" variant="ghost" className={UI_CLASSES.topIconButton} aria-label="Notificaciones">
                <Bell className="w-5 h-5" />
                {unreadNotifications > 0 && <span className={UI_CLASSES.bellBadge}>{unreadNotifications}</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 p-0 rounded-[28px] overflow-hidden border-none shadow-2xl">
              <div className="bg-white p-4 border-b flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-[#0.2em] text-[#1B4D1C]">Notificaciones</p>
                {notificationsLoading && <Loader2 className="w-3 h-3 animate-spin text-[#82D14C]" />}
              </div>
              <div className="max-h-80 overflow-y-auto p-2 bg-white">
                {notifications.length > 0 ? notifications.map((n) => (
                  <div key={n.id} className="p-3 mb-1 rounded-2xl bg-slate-50 border border-slate-100">
                    <div className="flex justify-between items-start mb-1 text-left">
                      <p className="text-xs font-bold text-slate-800">{n.title}</p>
                      <span className="text-[9px] text-slate-400">{formatNotificationTime(n.created_at)}</span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1 text-left">{n.message}</p>
                  </div>
                )) : <p className="text-center py-6 text-xs text-slate-400">Sin notificaciones</p>}
              </div>
            </PopoverContent>
          </Popover>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className={UI_CLASSES.topIconButton}
            aria-label="Ir al perfil"
            onClick={() => onGoToProfile?.()}
          >
            <User className="w-5 h-5" />
          </Button>
          {onLogout ? (
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className={UI_CLASSES.topIconButton}
              aria-label="Cerrar sesión"
              onClick={onLogout}
            >
              <LogOut className="w-5 h-5" />
            </Button>
          ) : null}
        </div>
      </header>

      <main className={UI_CLASSES.mainContent}>
        <div className="w-full space-y-6">
          <div className={UI_CLASSES.filterGrid}>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar..." className={UI_CLASSES.filterInput} />
            <IncidenceSelect value={filterLocation} onChange={setFilterLocation} options={LOCATION_LABELS} placeholder="Áreas" />
            <IncidenceSelect value={filterStatus} onChange={setFilterStatus} options={STATUS_CONFIG} placeholder="Estados" />
            <IncidenceSelect value={filterPriority} onChange={setFilterPriority} options={PRIORITY_LABELS} placeholder="Prioridad" />
          </div>

          <div className={UI_CLASSES.btnMineWrapper}>
            <button onClick={() => setShowOnlyMine(!showOnlyMine)} className={`${UI_CLASSES.btnMineBase} ${showOnlyMine ? UI_CLASSES.btnMineActive : UI_CLASSES.btnMineInactive}`}>
              <User className="w-4 h-4" /> {showOnlyMine ? "Viendo mis incidencias" : "Ver mis incidencias"}
            </button>
          </div>

          {loading ? <p className={UI_CLASSES.loadingText}>Cargando incidencias...</p> : (
            <div className={UI_CLASSES.incidencesGrid}>
              {filteredIncidences.map((inc) => {
                const config = STATUS_CONFIG[inc.status] || STATUS_CONFIG.pending;
                const style = config.student;

                return (
                  <Card key={inc.id} className={UI_CLASSES.card}>
                    <CardContent className="p-0 flex h-full text-left">
                      <div className={`${UI_CLASSES.cardSideBar} ${style.barClass}`} />
                      <div className="pt-4 px-4 pb-3 flex-1 flex flex-col justify-between min-w-0">
                        <div>
                          <div className="flex justify-between items-start mb-1.5">
                            <div className="flex-1 min-w-0 pr-2 text-left">
                              <h3 className={UI_CLASSES.cardTitle}>{inc.title}</h3>

                              {inc.is_mine ? (
                                <span className="text-[10px] font-bold text-primary uppercase bg-primary/10 px-1.5 py-0.5 rounded-md inline-block">
                                  Tu reporte
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold text-slate-500 uppercase bg-slate-100 px-1.5 py-0.5 rounded-md inline-block">
                                  {inc.student_name}
                                </span>
                              )}
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              <span className={`${UI_CLASSES.statusBadge} ${style.colorClass}`}>{config.label}</span>
                              {inc.is_mine && inc.status === 'pending' && (
                                <div className="flex gap-1">
                                  <button onClick={() => setIncidenceToEdit(inc)} className={UI_CLASSES.actionBtnSmall} title="Editar"><Pencil size={12} className="text-blue-500" /></button>
                                  <button onClick={() => setIncidenceToDelete(inc)} className={UI_CLASSES.actionBtnSmall} title="Eliminar"><Trash2 size={12} className="text-red-500" /></button>
                                </div>
                              )}
                            </div>

                          </div>
                          <div className={COMMON_UI_CLASSES.cardLocationRow}>
                            <MapPin size={14} className="text-slate-400" />
                            <span className="text-[11px] font-semibold text-slate-500 truncate">
                              {LOCATION_LABELS[inc.location_type]}
                            </span>
                          </div>
                        </div>
                        <div className="mt-4 pt-3 border-t">
                          <div className="flex items-center justify-between mb-2.5">
                            <div className="flex items-center gap-1.5 text-slate-600 truncate text-[11px] font-bold">
                              <Wrench size={13} />{inc.assigned_staff_name || inc.assigned_external_name || 'Sin asignar'}</div>
                            <div className="flex items-center gap-1 text-slate-400 font-bold text-[10px]">
                              <Clock size={10} />{new Date(inc.created_at).toLocaleDateString()}</div>
                          </div>
                          <div className="flex justify-end">
                            <Button variant="outline" onClick={async () => {
                              const res = await fetchWithAuth(`${API_URL_INCIDENCES}${inc.id}/`);
                              if (res.ok) { setSelectedDetails(await res.json()); setIsNotesOpen(true); }
                            }}
                              className={COMMON_UI_CLASSES.btnNotes}>VER DETALLES
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </main>

      <button onClick={() => setIsFormOpen(true)} className={UI_CLASSES.btnFloating} aria-label="Nueva incidencia"><Plus size={32} strokeWidth={3} /></button>

      {/* MODAL ELIMINAR CONFIRMACIÓN */}
      <Dialog open={!!incidenceToDelete} onOpenChange={() => setIncidenceToDelete(null)}>
        <DialogContent className="max-w-[400px] rounded-3xl p-6">
          <DialogTitle className="text-center text-lg font-bold">¿Eliminar incidencia?</DialogTitle>
          <DialogDescription className="text-center text-gray-500 mt-2">Esta acción no se puede deshacer. El reporte "{incidenceToDelete?.title}" será borrado.</DialogDescription>
          <div className="flex gap-3 mt-6">
            <Button variant="outline" onClick={() => setIncidenceToDelete(null)} className="flex-1 rounded-xl h-12 font-bold">Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete} className="flex-1 rounded-xl h-12 font-bold">Eliminar</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL EDITAR */}
      <Dialog open={!!incidenceToEdit} onOpenChange={() => setIncidenceToEdit(null)}>
        <DialogContent className={UI_CLASSES.dialogForm}>
          <IncidenceForm initialData={incidenceToEdit} onSuccess={() => { loadIncidences(); setIncidenceToEdit(null); }} onClose={() => setIncidenceToEdit(null)} />
        </DialogContent>
      </Dialog>

      {/* MODAL DETALLES (HISTORIAL) */}
      <Dialog open={isNotesOpen} onOpenChange={setIsNotesOpen}>
        <DialogContent className={UI_CLASSES.dialogNotes}>
          <DialogTitle className={UI_CLASSES.notesTitle}>Seguimiento de la incidencia</DialogTitle>
          <DialogDescription className="sr-only">Línea de tiempo de actualizaciones</DialogDescription>
          <div className="p-6 bg-white overflow-y-auto max-h-[75vh] space-y-6 pb-12 text-left">
            {selectedDetails && (
              <>
                <section className="border-l-4 border-[#82D14C] pl-3 py-1"><h3 className="font-bold text-lg text-slate-800">{selectedDetails.title}</h3></section>
                <section className="space-y-2 text-left">
                  <div className="flex items-center gap-2"><MessageSquare size={14} className="text-slate-400" /><p className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Descripción</p></div>
                  <div className="bg-slate-50 p-4 rounded-[20px] border border-slate-100 italic text-sm text-slate-600">"{selectedDetails.description}"</div>
                </section>
                {selectedDetails.img && <section className="flex justify-center"><div className="rounded-[24px] overflow-hidden border border-slate-100 max-w-[220px] shadow-sm"><img src={selectedDetails.img} alt="Evidencia" className="w-full h-auto" /></div></section>}
                <section className="pt-2">
                  <p className="text-[10px] font-bold uppercase text-[#3A7A1C] tracking-widest mb-4 text-left">Gestión y Actualizaciones</p>
                  <div className="relative ml-2 space-y-6 border-l-2 border-slate-100 pl-8">
                    {selectedDetails.updates?.map((u: any) => (
                      <div key={u.id} className="relative">
                        <div className="absolute -left-[41px] top-1.5 h-4 w-4 rounded-full border-4 border-white bg-slate-200" />
                        <div className="bg-[#eef8ee] p-4 rounded-[22px] text-left">
                          <div className="flex justify-between items-center mb-2 text-[9px] font-bold">
                            <span className="text-slate-700 uppercase bg-[#b1e7b1] px-1.5 py-0.5 rounded">{u.author_name || 'Gestión'}</span>
                            <span className="text-slate-700">{new Date(u.created_at).toLocaleDateString()}</span>
                          </div>
                          <p className="text-sm text-slate-700 font-medium leading-relaxed">{formatUpdateText(u.text)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* FORMULARIO NUEVA */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className={UI_CLASSES.dialogForm}>
          <DialogTitle className="sr-only">Nueva Incidencia</DialogTitle>
          <IncidenceForm onSuccess={() => { loadIncidences(); setIsFormOpen(false); }} onClose={() => setIsFormOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

const UI_CLASSES = {
  ...COMMON_UI_CLASSES,
  mainLayout: "flex flex-col h-screen bg-[#F6F7F9] overflow-hidden",
  header: "bg-primary p-6 pt-12 flex justify-between items-center shrink-0 shadow-lg",
  headerTitle: "text-primary-foreground text-2xl font-bold",
  topIconButton: "relative text-primary-foreground hover:bg-primary-foreground/20 hover:scale-110 rounded-full transition-all",
  bellBadge: "absolute -right-1 -top-1 min-w-5 h-5 flex items-center justify-center rounded-full bg-[#82D14C] text-[10px] font-bold text-[#123313]",
  mainContent: "flex-1 overflow-y-auto p-4 md:p-6 pb-32 w-full",
  incidencesGrid: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5",
  card: "border-none shadow-sm rounded-[24px] overflow-hidden bg-white h-full flex flex-col hover:shadow-md transition-shadow",
  cardSideBar: "w-1.5 shrink-0",
  cardTitle: "font-bold text-[16px] text-[#1A1C1E] mb-0.5",
  cardLocationRow: "flex items-center gap-1.5 opacity-70 mb-3",
  statusBadge: "text-[11px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider shadow-sm",
  btnNotes: "bg-[#F0F5F0] h-8 px-4 rounded-xl text-[#1B4D1C] border-[#E3F2DA] border-2 font-bold text-[10px] uppercase hover:bg-[#82D14C] hover:text-white transition-all",
  btnMineWrapper: "flex justify-end mb-6",
  btnMineBase: "flex items-center gap-2 px-6 py-3 rounded-full text-xs font-bold transition-all border shadow-sm",
  btnMineActive: "bg-[#1B4D1C] text-white",
  btnMineInactive: "bg-white text-[#1B4D1C]",
  filterGrid: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3",
  dialogForm: "max-w-[90vw] sm:max-w-[425px] rounded-[32px] p-0 border-none overflow-hidden",
  actionBtnSmall: "p-1.5 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors border border-slate-100"
};