import { useState, useEffect, useCallback } from "react";
import { Clock, Plus, Bell, MapPin, User, MessageSquare, ChevronRight } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Card, CardContent } from "../../../components/ui/card";
import { Dialog, DialogContent, DialogTitle } from "../../../components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "../../../components/ui/popover";
import { fetchWithAuth, API_URL_INCIDENCES } from "../../../utils/api";
import { IncidenceForm } from "./IncidenceForm";
import "../Incidences.css";

const NOTIFICATIONS_LAST_READ_KEY = "incidences-notifications-last-read";

const getLastReadNotificationsAt = () => {
  if (typeof window === "undefined") return 0;
  const storedValue = window.localStorage.getItem(NOTIFICATIONS_LAST_READ_KEY);
  return storedValue ? Date.parse(storedValue) || 0 : 0;
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
  options: Record<string, string | any>,
  placeholder: string,
  className?: string
}) => {
  const [open, setOpen] = useState(false);

  const selectedLabel = value === 'all' || !value ? placeholder : (
    typeof options[value] === 'object' ? options[value].label : options[value]
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className={`flex items-center justify-between w-full px-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-sm font-medium transition-all outline-none focus:ring-2 focus:ring-[#82D14C]/10 hover:border-[#82D14C] ${className}`}>
          <span className={value === 'all' || !value ? 'text-slate-400' : 'text-slate-700'}>
            {selectedLabel}
          </span>
          <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${open ? 'rotate-90' : 'rotate-0'}`} />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[--radix-popover-trigger-width] p-1 bg-white border-none rounded-2xl shadow-xl z-[100]">
        <div className="max-h-60 overflow-y-auto">
          <button
            onClick={() => { onChange('all'); setOpen(false); }}
            className="w-full text-left px-3 py-2 text-sm rounded-xl hover:bg-[#EEF8E7] hover:text-[#1B4D1C] transition-colors font-bold text-slate-400 border-b border-slate-50 mb-1"
          >
            Mostrar todas
          </button>
          {Object.entries(options).map(([key, val]) => (
            <button
              key={key}
              onClick={() => { onChange(key); setOpen(false); }}
              className={`w-full text-left px-3 py-2 text-sm rounded-xl transition-colors font-medium mb-0.5 last:mb-0 ${value === key
                  ? 'bg-[#82D14C] text-white'
                  : 'hover:bg-[#EEF8E7] text-slate-700 hover:text-[#1B4D1C]'
                }`}
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
      let nextNotifications = Array.isArray(data.results) ? data.results : [];
      if (markAsRead && nextNotifications.length > 0) {
        saveLastReadNotificationsAt(nextNotifications[0].created_at);
        setUnreadNotifications(0);
      }
      setNotifications(nextNotifications);
    } catch (error) { console.error(error); } finally { if (!silent) setNotificationsLoading(false); }
  }, []);

  const loadIncidences = async () => {
    try {
      setLoading(true);
      const response = await fetchWithAuth(API_URL_INCIDENCES);
      if (response.ok) setIncidences(await response.json());
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  useEffect(() => {
    loadIncidences();
    loadNotifications();
    const interval = setInterval(() => loadNotifications(false, true), 15000);
    return () => clearInterval(interval);
  }, [loadNotifications]);

  const formatUpdateText = (text: string) => {
    if (!text) return '';
    let out = text.replace(/Nota:\s*/i, '');
    const statusMapTr: Record<string, string> = {
      pending: 'Pendiente', reviewing: 'En revisión', in_progress: 'En proceso', resolved: 'Resuelto',
    };
    Object.keys(statusMapTr).forEach((key) => {
      const re = new RegExp(`\\b${key}\\b`, 'g');
      out = out.replace(re, statusMapTr[key]);
    });
    return out.trim();
  };

  const filteredIncidences = incidences.filter((inc) => {
    const isVisible = inc.is_mine || inc.location_type !== 'habitacion';
    if (!isVisible) return false;
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
        <Popover open={isNotificationsOpen} onOpenChange={setIsNotificationsOpen}>
          <PopoverTrigger asChild>
            <button type="button" className={UI_CLASSES.bellContainer}>
              <Bell className="w-6 h-6 text-white" />
              {unreadNotifications > 0 && <span className={UI_CLASSES.bellBadge}>{unreadNotifications}</span>}
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 p-0 rounded-[28px] overflow-hidden border-none shadow-2xl">
            <div className="bg-white">
              <div className="p-4 border-b border-slate-100">
                <p className="text-xs font-black uppercase tracking-widest text-[#1B4D1C]">Notificaciones</p>
              </div>
              <div className="max-h-80 overflow-y-auto p-2">
                {notifications.map((n) => (
                  <div key={n.id} className="p-3 mb-1 rounded-2xl bg-slate-50 border border-slate-100">
                    <p className="text-xs font-bold text-slate-800">{n.title}</p>
                    <p className="text-xs text-slate-600 mt-1">{n.message}</p>
                  </div>
                ))}
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </header>

      <main className={UI_CLASSES.mainContent}>
        <div className="w-full space-y-6">
          <div className={UI_CLASSES.filterGrid}>
            <div className="relative col-span-1 sm:col-span-2 lg:col-span-1">
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar incidencia..." className={UI_CLASSES.filterInput} />
            </div>

            <IncidenceSelect
              value={filterLocation}
              onChange={setFilterLocation}
              options={LOCATION_LABELS}
              placeholder="Todas las áreas"
            />
            <IncidenceSelect
              value={filterStatus}
              onChange={setFilterStatus}
              options={STATUS_MAP}
              placeholder="Todos los estados"
            />
            <IncidenceSelect
              value={filterPriority}
              onChange={setFilterPriority}
              options={{ low: 'Baja', high: 'Urgente' }}
              placeholder="Prioridad"
            />
          </div>

          <div className={UI_CLASSES.btnMineWrapper}>
            <button onClick={() => setShowOnlyMine(!showOnlyMine)} className={`${UI_CLASSES.btnMineBase} ${showOnlyMine ? UI_CLASSES.btnMineActive : UI_CLASSES.btnMineInactive}`}>
              <User className="w-4 h-4" />
              {showOnlyMine ? "Viendo mis incidencias" : "Ver mis incidencias"}
            </button>
          </div>

          {loading ? <p className={UI_CLASSES.loadingText}>Cargando...</p> : (
            <div className={UI_CLASSES.incidencesGrid}>
              {filteredIncidences.map((inc) => {
                const currentStatus = STATUS_MAP[inc.status] || STATUS_MAP.pending;
                return (
                  <Card key={inc.id} className={UI_CLASSES.card}>
                    <CardContent className="p-0 flex h-full">
                      <div className={`${UI_CLASSES.cardSideBar} ${currentStatus.barClass}`} />
                      <div className="p-5 flex-1 flex flex-col justify-between">
                        <div>
                          <div className="flex justify-between items-start mb-2">
                            <div className="max-w-[70%]">
                              <h3 className={UI_CLASSES.cardTitle}>{inc.title}</h3>
                              {inc.is_mine && <span className="text-[9px] font-black text-[#1B4D1C] uppercase tracking-wider">Tu reporte</span>}
                            </div>
                            <span className={`${UI_CLASSES.statusBadge} ${currentStatus.colorClass}`}>{currentStatus.label}</span>
                          </div>
                          <div className={UI_CLASSES.cardLocationRow}>
                            <MapPin size={14} className="text-slate-400" />
                            <span className="text-[11px] font-semibold text-slate-500">
                              {LOCATION_LABELS[inc.location_type]} {inc.room_number ? `• Hab. ${inc.room_number}` : ''}
                            </span>
                          </div>
                        </div>
                        <div className="flex justify-between items-center mt-6">
                          <div className={UI_CLASSES.cardDateRow}>
                            <Clock size={12} />
                            <span>{new Date(inc.created_at).toLocaleDateString()}</span>
                          </div>
                          <Button variant="outline" onClick={async () => {
                            const res = await fetchWithAuth(`${API_URL_INCIDENCES}${inc.id}/`);
                            if (res.ok) { setSelectedDetails(await res.json()); setIsNotesOpen(true); }
                          }} className={UI_CLASSES.btnNotes}> Detalles </Button>
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

      <button onClick={() => setIsFormOpen(true)} className={UI_CLASSES.btnFloating}><Plus size={32} strokeWidth={3} /></button>

      {/* MODAL DETALLES */}
      <Dialog open={isNotesOpen} onOpenChange={(open) => { if (!open) setIsNotesOpen(false); }}>
        <DialogContent className={UI_CLASSES.dialogNotes}>
          <DialogTitle className={UI_CLASSES.notesTitle}>Seguimiento de Incidencia</DialogTitle>
          <div className="p-6 bg-white overflow-y-auto max-h-[75vh] space-y-6 pb-12">
            {selectedDetails && (
              <>
                <section className="border-l-4 border-[#82D14C] pl-3 py-1">
                  <h3 className="font-bold text-lg text-slate-800">{selectedDetails.title}</h3>
                </section>

                <section className="space-y-2">
                  <div className="flex items-center gap-2">
                    <MessageSquare size={14} className="text-slate-400" />
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Tu reporte original</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-[20px] border border-slate-100">
                    <p className="text-sm text-slate-600 leading-relaxed italic">"{selectedDetails.description}"</p>
                  </div>
                </section>

                {selectedDetails.img && (
                  <section className="flex justify-center">
                    <div className="rounded-[24px] overflow-hidden border border-slate-100 shadow-sm max-w-[220px]">
                      <img src={selectedDetails.img} alt="Evidencia" className="w-full h-auto object-contain max-h-[180px]" />
                    </div>
                  </section>
                )}

                <section className="pt-2">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="h-1.5 w-1.5 rounded-full bg-[#82D14C]"></div>
                    <p className="text-[10px] font-black uppercase text-[#3A7A1C] tracking-widest">Gestión de Residencia</p>
                  </div>

                  <div className="relative ml-2 space-y-6 border-l-2 border-slate-100 pl-8">
                    {selectedDetails.updates && selectedDetails.updates.length > 0 ? (
                      selectedDetails.updates.map((u) => (
                        <div key={u.id} className="relative">
                          <div className="absolute -left-[41px] top-1.5 h-4 w-4 rounded-full border-4 border-white bg-slate-200 shadow-sm"></div>

                          <div className="bg-[#eef8ee] p-4 rounded-[22px] border border-slate-100 shadow-sm">
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-[9px] font-black text-[#1B4D1C] uppercase bg-[#EEF8E7] px-1.5 py-0.5 rounded tracking-wider">
                                {u.author_name || 'Admin'}
                              </span>
                              <span className="text-[9px] text-slate-400 font-bold">
                                {new Date(u.created_at).toLocaleString('es-ES', { 
                                  day: '2-digit', month: '2-digit', year: 'numeric', 
                                  hour: '2-digit', minute: '2-digit' 
                                })}
                              </span>
                            </div>
                            <p className="text-sm text-slate-700 font-medium leading-relaxed">
                              {formatUpdateText(u.text)}
                            </p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-400 italic py-2">Esperando revisión del personal.</p>
                    )}
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
  mainLayout: "flex flex-col h-screen bg-[#F6F7F9] relative",
  header: "bg-[#1B4D1C] p-6 pt-12 flex justify-between items-center shrink-0 shadow-lg",
  headerTitle: "text-white text-2xl font-bold",
  bellContainer: "relative p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors",
  bellBadge: "absolute -right-1 -top-1 min-w-5 h-5 flex items-center justify-center rounded-full bg-[#82D14C] px-1 text-[10px] font-black text-[#123313]",
  mainContent: "flex-1 overflow-y-auto p-4 md:p-10 pb-32 w-full",
  incidencesGrid: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 w-full",
  btnMineWrapper: "flex justify-end mb-6",
  btnMineBase: "flex items-center gap-2 px-6 py-3 rounded-full text-xs font-bold transition-all border shadow-sm",
  btnMineActive: "bg-[#1B4D1C] text-white border-[#1B4D1C]",
  btnMineInactive: "bg-white text-[#1B4D1C] border-slate-200 hover:bg-slate-50",
  filterGrid: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4",
  filterInput: "w-full px-5 py-3 rounded-2xl border border-slate-200 shadow-sm outline-none bg-white focus:ring-2 focus:ring-[#82D14C]/20 transition-all",
  filterSelect: "w-full px-4 py-3 rounded-2xl border border-slate-200 bg-white shadow-sm outline-none focus:ring-2 focus:ring-[#82D14C]/20 text-sm cursor-pointer",
  card: "border-none shadow-md rounded-[32px] overflow-hidden bg-white hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 h-full",
  cardSideBar: "w-2.5 shrink-0",
  cardTitle: "font-bold text-lg text-[#1A1C1E] leading-tight mb-1 truncate",
  cardLocationRow: "flex items-center gap-1.5 mt-2",
  cardDateRow: "flex items-center gap-2 opacity-60 text-slate-500 text-[11px] font-bold",
  statusBadge: "text-[10px] px-3 py-1 rounded-full font-black uppercase tracking-wider shrink-0 shadow-sm",
  btnNotes: "rounded-2xl border-[#D1E4FF] text-[#0061A7] hover:bg-[#D1E4FF]/30 h-10 px-6 text-[12px] font-black transition-colors border-2",
  btnFloating: "fixed bottom-24 right-8 w-16 h-16 bg-[#82D14C] hover:bg-[#74bc44] text-white rounded-full shadow-2xl flex items-center justify-center z-50 transition-transform active:scale-90",
  dialogForm: "max-w-[90vw] sm:max-w-[425px] rounded-[32px] p-0 border-none overflow-hidden",
  dialogNotes: "max-w-[95vw] sm:max-w-[500px] rounded-[35px] p-0 border-none overflow-hidden shadow-2xl",
  notesTitle: "p-5 bg-white border-b border-slate-50 font-black text-[#1B4D1C] uppercase tracking-widest text-[10px] text-center",
  adminNoteBox: "p-4 bg-[#EEF8E7] rounded-[24px] border border-[#D5EBC4] shadow-sm",
  adminNoteLabel: "text-[9px] font-black uppercase text-[#3A7A1C] tracking-[0.2em] mb-1 block",
  adminNoteText: "text-xs font-bold text-[#1B4D1C] leading-relaxed italic",
  loadingText: "text-center text-slate-400 mt-20 text-sm font-bold animate-pulse",
};