"use client";

import { useState, useEffect, useCallback } from "react";
import { Clock, CheckCircle2, Plus, Bell, MapPin } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Card, CardContent } from "../../../components/ui/card";
import { Dialog, DialogContent, DialogTitle } from "../../../components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "../../../components/ui/popover";
import { fetchWithAuth, API_URL_INCIDENCES } from "../../../utils/api";
import { IncidenceForm } from "./IncidenceForm";
import "../Incidences.css";

// --- TIPOS ---
type Incidence = {
  id: number;
  title: string;
  description?: string;
  room_number?: string;
  location_type: string;
  status: "pending" | "reviewing" | "in_progress" | "resolved";
  priority: "low" | "high";
  created_at: string;
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

type IncidenceDetails = {
  title: string;
  description?: string;
  admin_notes?: string;
  updates?: { id: number; author_name?: string; created_at: string; text: string }[];
};

// --- LÓGICA DE NOTIFICACIONES ---
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

  // --- FILTROS RESTAURADOS ---
  const [search, setSearch] = useState('');
  const [filterLocation, setFilterLocation] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');

  const loadIncidences = async () => {
    try {
      setLoading(true);
      const response = await fetchWithAuth(API_URL_INCIDENCES);
      if (response.ok) setIncidences(await response.json());
    } finally {
      setLoading(false);
    }
  };

  const loadNotifications = useCallback(async (markAsRead = false, silent = false) => {
    try {
      if (!silent) setNotificationsLoading(true);
      const response = await fetchWithAuth(`${API_URL_INCIDENCES}notifications/`);
      if (!response.ok) return;
      const data = await response.json();
      let nextNotifications: IncidenceNotification[] = Array.isArray(data.results) ? data.results : [];
      const lastReadAt = getLastReadNotificationsAt();
      nextNotifications = nextNotifications.filter((n) => Date.parse(n.created_at) > lastReadAt);
      if (markAsRead && nextNotifications.length > 0) {
        saveLastReadNotificationsAt(nextNotifications[0].created_at);
        setUnreadNotifications(0);
      }
      setNotifications(nextNotifications);
      if (!markAsRead) setUnreadNotifications(nextNotifications.length);
    } catch (error) { console.error(error); } finally { if (!silent) setNotificationsLoading(false); }
  }, []);

  useEffect(() => {
    loadIncidences();
    loadNotifications();
    const interval = setInterval(() => loadNotifications(false, true), isNotificationsOpen ? 5000 : 15000);
    return () => clearInterval(interval);
  }, [isNotificationsOpen, loadNotifications]);

  useEffect(() => { if (isNotificationsOpen) loadNotifications(true); }, [isNotificationsOpen, loadNotifications]);

  // --- LÓGICA DE FILTRADO COMPLETA ---
  const filteredIncidences = incidences.filter((inc) => {
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
            <button className={UI_CLASSES.bellContainer}>
              <Bell className="w-6 h-6 text-white" />
              {unreadNotifications > 0 && <span className={UI_CLASSES.bellBadge}>{unreadNotifications}</span>}
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className={UI_CLASSES.popoverContent}>
             <div className={UI_CLASSES.popoverHeader}>Notificaciones</div>
             <div className="max-h-80 overflow-y-auto p-3">
                {notifications.map(n => (
                  <div key={n.id} className="mb-2 p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <p className="text-xs font-bold">{n.title}</p>
                    <p className="text-[11px] text-slate-500">{n.message}</p>
                  </div>
                ))}
             </div>
          </PopoverContent>
        </Popover>
      </header>

      <main className={UI_CLASSES.mainContent}>
        {/* BARRA DE FILTROS  */}
        <div className={UI_CLASSES.filterGrid}>
          <div className="relative col-span-1 sm:col-span-2">
            <input
              value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por título o habitación..."
              className={UI_CLASSES.filterInput}
            />
          </div>
          <select value={filterLocation} onChange={(e) => setFilterLocation(e.target.value)} className={UI_CLASSES.filterSelect}>
            <option value="all">Todas las áreas</option>
            {Object.entries(LOCATION_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className={UI_CLASSES.filterSelect}>
            <option value="all">Todos los estados</option>
            {Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)} className={UI_CLASSES.filterSelect}>
            <option value="all">Todas las prioridades</option>
            <option value="low">BAJA</option>
            <option value="high">URGENTE</option>
          </select>
        </div>

        {loading ? (
          <p className={UI_CLASSES.loadingText}>Cargando...</p>
        ) : filteredIncidences.length === 0 ? (
          <div className={UI_CLASSES.emptyState}>
            <CheckCircle2 className="w-12 h-12 mx-auto mb-2 opacity-20" />
            <p>No hay resultados</p>
          </div>
        ) : (
          filteredIncidences.map((inc) => {
            const currentStatus = STATUS_MAP[inc.status] || STATUS_MAP.pending;
            return (
              <Card key={inc.id} className={UI_CLASSES.card}>
                <CardContent className="p-0 flex">
                  <div className={`${UI_CLASSES.cardSideBar} ${currentStatus.barClass}`} />
                  <div className="p-5 flex-1">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className={UI_CLASSES.cardTitle}>{inc.title}</h3>
                      <span className={`${UI_CLASSES.statusBadge} ${currentStatus.colorClass}`}>{currentStatus.label}</span>
                    </div>
                    <div className={UI_CLASSES.cardLocationRow}>
                      <MapPin size={14} className="text-slate-400" />
                      <span className="text-sm font-medium">
                        {LOCATION_LABELS[inc.location_type] || inc.location_type}
                        {inc.room_number ? ` • Hab. ${inc.room_number}` : ''}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className={UI_CLASSES.cardDateRow}><Clock size={14} /> <span>{new Date(inc.created_at).toLocaleDateString()}</span></div>
                      <Button variant="outline" onClick={() => {
                        fetchWithAuth(`${API_URL_INCIDENCES}${inc.id}/`).then(res => res.json()).then(data => {
                          setSelectedDetails(data);
                          setIsNotesOpen(true);
                        });
                      }} className={UI_CLASSES.btnNotes}>Ver notas</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </main>

      <button onClick={() => setIsFormOpen(true)} className={UI_CLASSES.btnFloating}><Plus size={32} strokeWidth={3} /></button>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className={UI_CLASSES.dialogForm}>
          <DialogTitle className="sr-only">Nueva Incidencia</DialogTitle>
          <IncidenceForm onSuccess={() => { loadIncidences(); setIsFormOpen(false); }} onClose={() => setIsFormOpen(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={isNotesOpen} onOpenChange={(open) => { if(!open) setIsNotesOpen(false); }}>
        <DialogContent className={UI_CLASSES.dialogNotes}>
          <DialogTitle className={UI_CLASSES.notesTitle}>Notas</DialogTitle>
          <div className="p-6 bg-white overflow-y-auto max-h-[70vh]">
            {selectedDetails && (
              <>
                <h3 className="font-bold text-lg mb-2">{selectedDetails.title}</h3>
                <p className="text-sm text-slate-500 italic mb-6">"{selectedDetails.description}"</p>
                {selectedDetails.admin_notes && (
                  <div className={UI_CLASSES.adminNoteBox}>
                    <div className={UI_CLASSES.adminNoteLabel}>Admin</div>
                    <div className="text-emerald-700">{selectedDetails.admin_notes}</div>
                  </div>
                )}
                <div className={UI_CLASSES.historyLabel}>Actualizaciones</div>
                <div className="space-y-3">
                  {selectedDetails.updates?.map(u => (
                    <div key={u.id} className={UI_CLASSES.historyItem}>
                      <div className="text-[10px] text-slate-400 font-bold mb-1 uppercase">{u.author_name} • {new Date(u.created_at).toLocaleString()}</div>
                      <div className="text-sm text-slate-700">{u.text}</div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const LOCATION_LABELS: Record<string, string> = {
  habitacion: 'Habitación', baño: 'Baño Común', cocina: 'Cocina', comedor: 'Comedor', salas_comunes: 'Salas Comunes', exterior: 'Exterior',
};

const STATUS_MAP: Record<string, any> = {
  pending: { label: "Pendiente", colorClass: "bg-[#FFF4E5] text-[#FFB457]", barClass: "bg-[#FFB457]" },
  reviewing: { label: "En revisión", colorClass: "bg-[#E5F1FF] text-[#0061A7]", barClass: "bg-[#0061A7]" },
  in_progress: { label: "En proceso", colorClass: "bg-[#E0F7FA] text-[#00ACC1]", barClass: "bg-[#00ACC1]" },
  resolved: { label: "Resuelto", colorClass: "bg-[#F0F9EB] text-[#82D14C]", barClass: "bg-[#82D14C]" },
};

const UI_CLASSES = {
  mainLayout: "flex flex-col h-screen bg-[#F6F7F9] relative",
  header: "bg-[#1B4D1C] p-6 pt-12 flex justify-between items-center shrink-0 shadow-lg",
  headerTitle: "text-white text-2xl font-bold",
  bellContainer: "relative p-2 bg-white/10 rounded-full",
  bellBadge: "absolute -right-1 -top-1 min-w-5 h-5 flex items-center justify-center rounded-full bg-[#82D14C] px-1 text-[10px] font-black text-[#123313]",
  mainContent: "flex-1 overflow-y-auto p-4 space-y-4 pb-32",
  filterGrid: "mb-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3",
  filterInput: "w-full px-4 py-2 rounded-xl border border-slate-200 shadow-sm outline-none focus:ring-2 focus:ring-[#82D14C]",
  filterSelect: "w-full px-3 py-2 rounded-xl border border-slate-200 bg-white outline-none",
  card: "border-none shadow-sm rounded-[24px] overflow-hidden bg-white",
  cardSideBar: "w-1.5 shrink-0",
  cardTitle: "font-bold text-lg text-[#1A1C1E]",
  cardLocationRow: "flex items-center gap-1.5 text-slate-500 mb-4",
  cardDateRow: "flex items-center gap-2 opacity-60 text-[#74777F] text-xs",
  statusBadge: "text-[10px] px-2 py-0.5 rounded-full font-bold uppercase",
  btnNotes: "rounded-xl border-[#D1E4FF] text-[#0061A7] hover:bg-[#D1E4FF]/20 h-8 px-4 text-xs font-bold",
  btnFloating: "fixed bottom-24 right-6 w-14 h-14 bg-[#82D14C] hover:bg-[#74bc44] text-white rounded-full shadow-2xl flex items-center justify-center z-50",
  dialogForm: "max-w-[90vw] sm:max-w-[425px] rounded-[32px] p-0 border-none overflow-hidden",
  dialogNotes: "max-w-[90vw] sm:max-w-[600px] rounded-[24px] p-0 border-none overflow-hidden",
  notesTitle: "p-6 bg-white border-b font-bold text-slate-800",
  adminNoteBox: "mb-6 p-4 bg-emerald-50 rounded-2xl border border-emerald-100",
  adminNoteLabel: "text-[10px] font-black uppercase text-emerald-600 mb-1",
  historyLabel: "text-[10px] font-black uppercase text-slate-400 mb-3",
  historyItem: "p-3 border border-slate-100 rounded-xl bg-slate-50/50",
  popoverContent: "w-[min(24rem,calc(100vw-2rem))] rounded-[28px] border-none shadow-2xl bg-white p-0 overflow-hidden",
  popoverHeader: "bg-slate-50 px-5 py-3 border-b text-[10px] font-bold uppercase tracking-widest text-[#1B4D1C]",
  loadingText: "text-center text-slate-400 mt-10 text-sm",
  emptyState: "text-center py-20 text-slate-300 font-medium"
};