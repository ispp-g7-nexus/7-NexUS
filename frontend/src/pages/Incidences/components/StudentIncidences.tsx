import { useState, useEffect, useCallback } from "react";
import { Plus, Bell, MapPin, User, Wrench, MessageSquare, ChevronRight, Loader2, Clock } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Card, CardContent } from "../../../components/ui/card";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "../../../components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "../../../components/ui/popover";
import { fetchWithAuth, API_URL_INCIDENCES } from "../../../utils/api";
import { IncidenceForm } from "./IncidenceForm";
import "../Incidences.css";

const NOTIFICATIONS_LAST_READ_KEY = "incidences-notifications-last-read";

const getLastReadNotificationsAt = () => {
  if (typeof window === "undefined") return 0;
  const storedValue = window.localStorage.getItem(NOTIFICATIONS_LAST_READ_KEY);
  return storedValue ? Date.parse(storedValue) : 0;
};

const saveLastReadNotificationsAt = (timestamp?: string) => {
  if (typeof window === "undefined" || !timestamp) return;
  window.localStorage.setItem(NOTIFICATIONS_LAST_READ_KEY, timestamp);
};

const formatNotificationTime = (value: string) => {
  const createdAt = new Date(value);
  const diffInMinutes = Math.max(0, Math.round((Date.now() - createdAt.getTime()) / 60000));
  if (diffInMinutes < 1) return "Ahora";
  if (diffInMinutes < 60) return `Hace ${diffInMinutes} min`;
  const diffInHours = Math.round(diffInMinutes / 60);
  if (diffInHours < 24) return `Hace ${diffInHours} h`;
  return createdAt.toLocaleDateString();
};

type IncidenceNotification = {
  id: string;
  kind: "incidence_created" | "admin_update";
  incidence_id: number;
  title: string;
  message: string;
  actor_name: string;
  location_label: string;
  status: string;
  created_at: string;
};

type Incidence = {
  id: number;
  title: string;
  description?: string;
  room_number?: string;
  location_type: string;
  status: "pending" | "reviewing" | "in_progress" | "resolved";
  priority: "low" | "high";
  created_at: string;
  assigned_staff_name?: string;
  assigned_staff_job?: string;
  assigned_external_name?: string;
  is_mine: boolean;
  img?: string;
};

type IncidenceDetails = {
  title: string;
  description?: string;
  admin_notes?: string;
  img?: string;
  updates?: { id: number; author_name?: string; created_at: string; text: string }[];
};

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
  
  let selectedLabel = placeholder;
  if (value !== 'all' && value && options[value]) {
    const option = options[value];
    selectedLabel = typeof option === 'object' ? option.label : option;
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button 
          type="button"
          className={`flex items-center justify-between w-full px-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-sm font-medium transition-all outline-none focus:ring-2 focus:ring-[#82D14C]/10 hover:border-[#82D14C] ${className}`}
        >
          <span className={value === 'all' || !value ? 'text-slate-400' : 'text-slate-700'}>{selectedLabel}</span>
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
            Mostrar todas
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

export default function StudentIncidences() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [incidences, setIncidences] = useState<Incidence[]>([]);
  const [selectedDetails, setSelectedDetails] = useState<IncidenceDetails | null>(null);
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<IncidenceNotification[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [filterLocation, setFilterLocation] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [showOnlyMine, setShowOnlyMine] = useState(false);

  const loadNotifications = useCallback(async (markAsRead = false, silent = false) => {
    try {
      if (!silent) setNotificationsLoading(true);
      const response = await fetchWithAuth(`${API_URL_INCIDENCES}notifications/`);
      if (!response.ok) return;
      const data = await response.json();
      const allNotifications: IncidenceNotification[] = Array.isArray(data.results) ? data.results : [];
      const lastReadAt = getLastReadNotificationsAt();

      if (markAsRead && allNotifications.length > 0) {
        saveLastReadNotificationsAt(allNotifications[0].created_at);
        setUnreadNotifications(0);
      } else {
        const count = allNotifications.filter(n => Date.parse(n.created_at) > lastReadAt).length;
        setUnreadNotifications(count);
      }
      setNotifications(allNotifications);
    } catch (error) { console.error(error); } finally { if (!silent) setNotificationsLoading(false); }
  }, []);

  const loadIncidences = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetchWithAuth(API_URL_INCIDENCES);
      if (response.ok) setIncidences(await response.json());
    } catch (error) { console.error(error); } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    loadIncidences();
    loadNotifications();
    const interval = setInterval(() => loadNotifications(false, true), 15000);
    return () => clearInterval(interval);
  }, [loadIncidences, loadNotifications]);

  const formatUpdateText = (text: string) => {
    if (!text) return '';
    let out = text.replace(/Nota:\s*/i, '');
    const statusMapTr: Record<string, string> = { 
      pending: 'Pendiente', 
      reviewing: 'En revisión', 
      in_progress: 'En proceso', 
      resolved: 'Resuelto' 
    };
    Object.keys(statusMapTr).forEach((key) => { 
      const re = new RegExp(String.raw`\b${key}\b`, 'g');
      out = out.replace(re, statusMapTr[key]); 
    });
    return out.trim();
  };

  const filteredIncidences = incidences.filter((inc) => {
    if (!inc.is_mine && inc.location_type === 'habitacion') return false;
    if (showOnlyMine && !inc.is_mine) return false;
    const q = search.trim().toLowerCase();
    if (q && !(inc.title?.toLowerCase().includes(q) || inc.room_number?.toLowerCase().includes(q))) return false;
    if (filterLocation !== 'all' && inc.location_type !== filterLocation) return false;
    if (filterStatus !== 'all' && inc.status !== filterStatus) return false;
    if (filterPriority !== 'all' && inc.priority !== filterPriority) return false;
    return true;
  });

  return (
    <div className={UI_CLASSES.mainLayout}>
      <header className={UI_CLASSES.header}>
        <h1 className={UI_CLASSES.headerTitle}>Incidencias</h1>
        <Popover open={isNotificationsOpen} onOpenChange={(open) => {
          setIsNotificationsOpen(open);
          if (open) loadNotifications(true);
        }}>
          <PopoverTrigger asChild>
            <button type="button" className={UI_CLASSES.bellContainer} aria-label="Notificaciones">
              <Bell className="w-6 h-6 text-white" />
              {unreadNotifications > 0 && <span className={UI_CLASSES.bellBadge}>{unreadNotifications}</span>}
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 p-0 rounded-[28px] overflow-hidden border-none shadow-2xl">
            <div className="bg-white text-left">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-widest text-[#1B4D1C]">Notificaciones</p>
                {notificationsLoading && <Loader2 className="w-3 h-3 animate-spin text-[#82D14C]" />}
              </div>
              <div className="max-h-80 overflow-y-auto p-2">
                {notifications.length > 0 ? (
                  notifications.map((n) => (
                    <div key={n.id} className="p-3 mb-1 rounded-2xl bg-slate-50 border border-slate-100">
                      <div className="flex justify-between items-start mb-1">
                        <p className="text-xs font-bold text-slate-800">{n.title}</p>
                        <span className="text-[9px] text-slate-400">{formatNotificationTime(n.created_at)}</span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1">{n.message}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-center py-6 text-xs text-slate-400">Sin notificaciones</p>
                )}
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </header>

      <main className={UI_CLASSES.mainContent}>
        <div className="w-full space-y-6">
          <div className={UI_CLASSES.filterGrid}>
            <input 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
              placeholder="Buscar incidencia..." 
              className={UI_CLASSES.filterInput}
              aria-label="Buscar incidencia"
            />
            <IncidenceSelect value={filterLocation} onChange={setFilterLocation} options={LOCATION_LABELS} placeholder="Áreas" />
            <IncidenceSelect value={filterStatus} onChange={setFilterStatus} options={STATUS_MAP} placeholder="Estados" />
            <IncidenceSelect value={filterPriority} onChange={setFilterPriority} options={{ low: 'Baja', high: 'Urgente' }} placeholder="Prioridad" />
          </div>

          <div className={UI_CLASSES.btnMineWrapper}>
            <button 
              type="button"
              onClick={() => setShowOnlyMine(!showOnlyMine)} 
              className={`${UI_CLASSES.btnMineBase} ${showOnlyMine ? UI_CLASSES.btnMineActive : UI_CLASSES.btnMineInactive}`}
            >
              <User className="w-4 h-4" /> {showOnlyMine ? "Viendo mis incidencias" : "Ver mis incidencias"}
            </button>
          </div>

          {loading ? (
            <p className={UI_CLASSES.loadingText}>Cargando...</p>
          ) : (
            <div className={UI_CLASSES.incidencesGrid}>
              {filteredIncidences.map((inc) => {
                const currentStatus = STATUS_MAP[inc.status] || STATUS_MAP.pending;
                return (
                  <Card key={inc.id} className={UI_CLASSES.card}>
                    <CardContent className="p-0 flex h-full">
                      <div className={`${UI_CLASSES.cardSideBar} ${currentStatus.barClass}`} />
                      <div className="pt-4 px-4 pb-3 flex-1 flex flex-col justify-between min-w-0">
                        <div className="text-left">
                          <div className="flex justify-between items-start mb-1.5">
                            <div className="flex-1 min-w-0 pr-2">
                              <h3 className={UI_CLASSES.cardTitle}>{inc.title}</h3>
                              {inc.is_mine && <span className="text-[10px] font-bold text-[#1B4D1C] uppercase tracking-wider bg-[#EEF8E7] px-1.5 py-0.5 rounded-md inline-block">Tu reporte</span>}
                            </div>
                            <span className={`${UI_CLASSES.statusBadge} ${currentStatus.colorClass}`}>{currentStatus.label}</span>
                          </div>
                          <div className={UI_CLASSES.cardLocationRow}>
                            <MapPin size={14} className="text-slate-400" />
                            <span className="text-[11px] font-semibold text-slate-500 truncate">{LOCATION_LABELS[inc.location_type]} {inc.room_number ? `• Hab. ${inc.room_number}` : ''}</span>
                          </div>
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-50">
                          <div className="flex items-center justify-between gap-1 mb-2.5">
                            <div className="min-w-0 flex-1 flex items-center gap-1.5">
                              <Wrench size={13} className="text-slate-400 shrink-0" />
                              <span className="text-[11px] font-bold text-slate-600 truncate">
                                {inc.assigned_staff_name || inc.assigned_external_name || 'Sin asignar'}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 shrink-0 text-slate-400 font-bold">
                              <Clock size={10} />
                              <span className="text-[10px]">{new Date(inc.created_at).toLocaleDateString()}</span>
                            </div>
                          </div>
                          <div className="flex justify-end w-full">
                            <Button
                              variant="outline"
                              onClick={async () => {
                                const res = await fetchWithAuth(`${API_URL_INCIDENCES}${inc.id}/`);
                                if (res.ok) { setSelectedDetails(await res.json()); setIsNotesOpen(true); }
                              }}
                              className={UI_CLASSES.btnNotes}
                            >
                              VER DETALLES
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

      <button type="button" onClick={() => setIsFormOpen(true)} className={UI_CLASSES.btnFloating} aria-label="Nueva incidencia">
        <Plus size={32} strokeWidth={3} />
      </button>

      {/* MODAL DETALLES */}
      <Dialog open={isNotesOpen} onOpenChange={setIsNotesOpen}>
        <DialogContent className={UI_CLASSES.dialogNotes}>
          <DialogTitle className={UI_CLASSES.notesTitle}>Seguimiento de Incidencia</DialogTitle>
          <DialogDescription className="sr-only">Detalles y actualizaciones de la incidencia seleccionada</DialogDescription>
          
          <div className="p-6 bg-white overflow-y-auto max-h-[75vh] space-y-6 pb-12 text-left">
            {selectedDetails && (
              <>
                <section className="border-l-4 border-[#82D14C] pl-3 py-1">
                  <h3 className="font-bold text-lg text-slate-800">{selectedDetails.title}</h3>
                </section>
                <section className="space-y-2">
                  <div className="flex items-center gap-2"><MessageSquare size={14} className="text-slate-400" /><p className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Tu descripción de la incidencia</p></div>
                  <div className="bg-slate-50 p-4 rounded-[20px] border border-slate-100"><p className="text-sm text-slate-600 italic">"{selectedDetails.description}"</p></div>
                </section>
                {selectedDetails.img && (
                  <section className="flex justify-center">
                    <div className="rounded-[24px] overflow-hidden border border-slate-100 shadow-sm max-w-[220px]">
                      <img src={selectedDetails.img} alt="Evidencia de la incidencia" className="w-full h-auto" />
                    </div>
                  </section>
                )}
                <section className="pt-2">
                  <div className="flex items-center gap-2 mb-4"><div className="h-1.5 w-1.5 rounded-full bg-[#82D14C]" /><p className="text-[10px] font-bold uppercase text-[#3A7A1C] tracking-widest">Gestión de Administración</p></div>
                  <div className="relative ml-2 space-y-6 border-l-2 border-slate-100 pl-8">
                    {selectedDetails.updates?.map((u) => (
                      <div key={u.id} className="relative">
                        <div className="absolute -left-[41px] top-1.5 h-4 w-4 rounded-full border-4 border-white bg-slate-200 shadow-sm" />
                        <div className="bg-[#eef8ee] p-4 rounded-[22px] shadow-sm">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-[9px] font-bold text-slate-700 uppercase bg-[#b1e7b1] px-1.5 py-0.5 rounded">{u.author_name || 'Admin'}</span>
                            <span className="text-[9px] text-slate-700 font-bold">{new Date(u.created_at).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
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

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className={UI_CLASSES.dialogForm}>
          <DialogTitle className="sr-only">Nueva Incidencia</DialogTitle>
          <IncidenceForm onSuccess={() => { loadIncidences(); setIsFormOpen(false); }} onClose={() => setIsFormOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

const LOCATION_LABELS: Record<string, string> = { habitacion: 'Habitación', baño: 'Baño Común', cocina: 'Cocina', comedor: 'Comedor', salas_comunes: 'Salas Comunes', exterior: 'Exterior' };

const STATUS_MAP: Record<string, any> = {
  pending: { label: "Pendiente", colorClass: "bg-[#FFF4E5] text-[#FFB457]", barClass: "bg-[#FFB457]" },
  reviewing: { label: "En Revisión", colorClass: "bg-[#E5F1FF] text-[#0061A7]", barClass: "bg-[#0061A7]" },
  in_progress: { label: "En Proceso", colorClass: "bg-[#E0F7FA] text-[#00ACC1]", barClass: "bg-[#00ACC1]" },
  resolved: { label: "Resuelto", colorClass: "bg-[#F0F9EB] text-[#82D14C]", barClass: "bg-[#82D14C]" },
};

const UI_CLASSES = {
  mainLayout: "flex flex-col h-screen bg-[#F6F7F9] overflow-hidden text-left",
  header: "bg-[#1B4D1C] p-6 pt-12 flex justify-between items-center shrink-0 shadow-lg z-10",
  headerTitle: "text-white text-2xl font-bold",
  bellContainer: "relative p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors",
  bellBadge: "absolute -right-1 -top-1 min-w-5 h-5 flex items-center justify-center rounded-full bg-[#82D14C] px-1 text-[10px] font-bold text-[#123313]",
  mainContent: "flex-1 overflow-y-auto p-4 md:p-6 pb-32 w-full", 
  incidencesGrid: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 w-full",
  
  card: "border-none shadow-sm rounded-[24px] overflow-hidden bg-white hover:shadow-md transition-all duration-300 h-full flex flex-col",
  cardSideBar: "w-1.5 shrink-0",
  cardTitle: "font-bold text-[16px] text-[#1A1C1E] leading-tight mb-0.5",
  cardLocationRow: "flex items-center gap-1.5 opacity-70 mb-3",
  statusBadge: "text-[11px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider shrink-0 shadow-sm",
  
  btnNotes: "bg-[#F0F5F0] w-fit h-8 px-4 rounded-xl border-[#E3F2DA] text-[#1B4D1C] hover:bg-[#82D14C] hover:text-white transition-all border-2 font-bold text-[10px] tracking-widest uppercase",
  btnMineWrapper: "flex justify-end mb-6",
  btnMineBase: "flex items-center gap-2 px-6 py-3 rounded-full text-xs font-bold transition-all border shadow-sm",
  btnMineActive: "bg-[#1B4D1C] text-white border-[#1B4D1C]",
  btnMineInactive: "bg-white text-[#1B4D1C] border-slate-200 hover:bg-slate-50",
  filterGrid: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3",
  filterInput: "w-full px-5 py-2 rounded-2xl border border-slate-200 shadow-sm outline-none bg-white focus:ring-2 focus:ring-[#82D14C]/20 transition-all text-sm",
  btnFloating: "fixed bottom-24 right-8 w-16 h-16 bg-[#82D14C] hover:bg-[#74bc44] text-white rounded-full shadow-2xl flex items-center justify-center z-50 transition-transform active:scale-90",
  dialogForm: "max-w-[90vw] sm:max-w-[425px] rounded-[32px] p-0 border-none overflow-hidden",
  dialogNotes: "max-w-[95vw] sm:max-w-[500px] rounded-[30px] p-0 border-none overflow-hidden shadow-2xl",
  notesTitle: "p-5 bg-white border-b border-slate-50 font-bold text-[#1B4D1C] uppercase tracking-widest text-[11px] text-center",
  loadingText: "text-center text-slate-400 mt-20 text-sm font-bold animate-pulse",
};