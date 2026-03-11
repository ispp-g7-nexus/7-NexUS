import { useState, useEffect, useCallback } from "react";
import {  Clock, CheckCircle2, Plus, Bell,  MapPin,} from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Card, CardContent } from "../../../components/ui/card";
import { Dialog, DialogContent, DialogTitle } from "../../../components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "../../../components/ui/popover";
import { fetchWithAuth, API_URL_INCIDENCES } from "../../../utils/api";
import { IncidenceForm } from "./IncidenceForm";
import "../Incidences.css";

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
};

type IncidenceUpdateItem = {
  id: number;
  author_name?: string;
  created_at: string;
  text: string;
};

type IncidenceDetails = {
  title: string;
  description?: string;
  admin_notes?: string;
  updates?: IncidenceUpdateItem[];
};

const NOTIFICATIONS_LAST_READ_KEY = "incidences-notifications-last-read";

const getLastReadNotificationsAt = () => {
  if (typeof window === "undefined") {
    return 0;
  }

  const storedValue = window.localStorage.getItem(NOTIFICATIONS_LAST_READ_KEY);
  if (!storedValue) {
    return 0;
  }

  const parsedValue = Date.parse(storedValue);
  return Number.isNaN(parsedValue) ? 0 : parsedValue;
};

const saveLastReadNotificationsAt = (timestamp?: string) => {
  if (typeof window === "undefined" || !timestamp) {
    return;
  }

  window.localStorage.setItem(NOTIFICATIONS_LAST_READ_KEY, timestamp);
};

const formatNotificationTime = (value: string) => {
  const createdAt = new Date(value);
  const diffInMinutes = Math.max(0, Math.round((Date.now() - createdAt.getTime()) / 60000));

  if (diffInMinutes < 1) {
    return "Ahora";
  }

  if (diffInMinutes < 60) {
    return `Hace ${diffInMinutes} min`;
  }

  const diffInHours = Math.round(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `Hace ${diffInHours} h`;
  }

  const diffInDays = Math.round(diffInHours / 24);
  if (diffInDays < 7) {
    return `Hace ${diffInDays} d`;
  }

  return createdAt.toLocaleDateString();
};

export default function StudentIncidences() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [incidences, setIncidences] = useState<Incidence[]>([]);
  const [selectedIncidenceDetails, setSelectedIncidenceDetails] = useState<IncidenceDetails | null>(null);
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
  const locationLabels: Record<string, string> = {
    habitacion: 'Habitación',
    baño: 'Baño Común',
    cocina: 'Cocina',
    zonas_comunes: 'Zonas Comunes',
  };

  const loadIncidences = async () => {
    try {
      const response = await fetchWithAuth(API_URL_INCIDENCES);
      if (response.ok) {
        const data: Incidence[] = await response.json();
        setIncidences(data);
      }
    } catch (error) {
      console.error("Error cargando incidencias:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateUnreadNotifications = (nextNotifications: IncidenceNotification[]) => {
    const lastReadAt = getLastReadNotificationsAt();
    const unreadCount = nextNotifications.filter((notification) => {
      return Date.parse(notification.created_at) > lastReadAt;
    }).length;

    setUnreadNotifications(unreadCount);
  };

  const loadNotifications = useCallback(async (markAsRead = false, silent = false) => {
    try {
      if (!silent) {
        setNotificationsLoading(true);
      }
      const response = await fetchWithAuth(`${API_URL_INCIDENCES}notifications/`);

      if (!response.ok) {
        return;
      }

      const data: { results?: IncidenceNotification[] } = await response.json();
      let nextNotifications: IncidenceNotification[] = Array.isArray(data.results) ? data.results : [];

      // Filtrar las notificaciones ya leídas
      const lastReadAt = getLastReadNotificationsAt();
      nextNotifications = nextNotifications.filter((n) => Date.parse(n.created_at) > lastReadAt);

      // Si ya están leídas, actualizar la marca de la campanita
      if (markAsRead && nextNotifications.length > 0) {
        saveLastReadNotificationsAt(nextNotifications[0].created_at);
        setUnreadNotifications(0);
      }

      setNotifications(nextNotifications);

      // Solo contar unread si no está marcadas como leídas
      if (!markAsRead) {
        updateUnreadNotifications(nextNotifications);
      }
    } catch (error) {
      console.error("Error cargando notificaciones de incidencias:", error);
    } finally {
      if (!silent) {
        setNotificationsLoading(false);
      }
    }
  }, []);

  const openNotes = async (inc: Incidence) => {
    try {
      const response = await fetchWithAuth(`${API_URL_INCIDENCES}${inc.id}/`);
      if (response.ok) {
        const data: IncidenceDetails = await response.json();
        setSelectedIncidenceDetails(data);
        setIsNotesOpen(true);
      }
    } catch (error) {
      console.error('Error cargando notas de la incidencia:', error);
    }
  };

  useEffect(() => {
    loadIncidences();
    loadNotifications();

    const intervalId = window.setInterval(() => {
      if (isNotificationsOpen) {
        // Cada 5 seg cuando está abierto para actualizar sin sobrecargar
        loadNotifications(false, true);
      }
    }, isNotificationsOpen ? 5000 : 15000);

    return () => window.clearInterval(intervalId);
  }, [isNotificationsOpen, loadNotifications]);

  useEffect(() => {
    if (isNotificationsOpen) {
      loadNotifications(true);
    }
  }, [isNotificationsOpen, loadNotifications]);

  const handleNotificationsOpenChange = (open: boolean) => {
    setIsNotificationsOpen(open);
  };

  // Formatea el texto de una actualización: elimina el prefijo "Nota:" y traduce claves de estado a etiquetas en español.
  const formatUpdateText = (text: string) => {
    if (!text) return '';
    let out = text.replace(/Nota:\s*/i, '');

    const statusMap: Record<string, string> = {
      pending: 'Pendiente',
      reviewing: 'En revisión',
      in_progress: 'En proceso',
      resolved: 'Resuelto',
    };

    Object.keys(statusMap).forEach((key) => {
      const re = new RegExp(`\\b${key}\\b`, 'g');
      out = out.replace(re, statusMap[key]);
    });

    out = out.replace(/\s+\./g, '.');
    return out.trim();
  };

  const statusMap: Record<string, { label: string; colorClass: string; barClass: string }> = {
    pending: {
      label: "Pendiente",
      colorClass: "bg-[#FFF4E5] text-[#FFB457]",
      barClass: "bg-[#FFB457]"
    },
    reviewing: {
      label: "En revisión",
      colorClass: "bg-[#E5F1FF] text-[#0061A7]",
      barClass: "bg-[#0061A7]"
    },
    in_progress: {
      label: "En proceso",
      colorClass: "bg-[#E0F7FA] text-[#00ACC1]",
      barClass: "bg-[#00ACC1]"
    },
    resolved: {
      label: "Resuelto",
      colorClass: "bg-[#F0F9EB] text-[#82D14C]",
      barClass: "bg-[#82D14C]"
    },
  };

  const hasUnreadNotifications = unreadNotifications > 0;

  return (
    <div className="flex flex-col h-screen bg-[#F6F7F9] relative">
      <header className="bg-[#1B4D1C] p-6 pt-12 flex justify-between items-center shrink-0 shadow-lg">
        <h1 className="text-white text-2xl font-bold">Incidencias</h1>
        <Popover open={isNotificationsOpen} onOpenChange={handleNotificationsOpenChange}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="relative rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/15"
              aria-label="Ver notificaciones recientes de incidencias"
            >
              <Bell className="w-6 h-6 text-white" />
              {hasUnreadNotifications && (
                <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-[#82D14C] px-1.5 py-0.5 text-[10px] font-black text-[#123313] shadow-lg">
                  {unreadNotifications > 9 ? "9+" : unreadNotifications}
                </span>
              )}
            </button>
          </PopoverTrigger>

          <PopoverContent align="end" sideOffset={14} className="w-[min(24rem,calc(100vw-2rem))] rounded-[28px] border-none p-0 shadow-2xl">
            <div className="overflow-hidden rounded-[28px] bg-white">
              <div className="border-b border-slate-100 px-5 py-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-black uppercase tracking-[0.18em] text-[#1B4D1C]">Notificaciones</p>
                    <p className="mt-1 text-sm text-slate-500">Incidencias recientes de residentes y actualizaciones del personal.</p>
                  </div>
                  <span className="rounded-full bg-[#EEF8E7] px-3 py-1 text-xs font-bold text-[#3A7A1C]">
                    {notifications.length} recientes
                  </span>
                </div>
              </div>

              <div className="max-h-[26rem] overflow-y-auto px-3 py-3">
                {notificationsLoading ? (
                  <p className="px-2 py-8 text-center text-sm text-slate-400">Cargando notificaciones...</p>
                ) : notifications.length === 0 ? (
                  <div className="px-2 py-8 text-center text-slate-400">
                    <Bell className="mx-auto mb-3 h-8 w-8 opacity-25" />
                    <p className="text-sm font-medium">No hay notificaciones recientes</p>
                    <p className="mt-1 text-xs">Las incidencias nuevas o las actualizadas por el staff se mostrarán aquí.</p>
                  </div>
                ) : (
                  notifications.map((notification) => {
                    const isAdminUpdate = notification.kind === "admin_update";
                    return (
                      <div
                        key={notification.id}
                        className="mb-2 rounded-[22px] border border-slate-100 bg-slate-50/80 px-4 py-3 last:mb-0"
                      >
                        <div className="mb-2 flex items-start justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <span className={`h-2.5 w-2.5 rounded-full ${isAdminUpdate ? "bg-[#0061A7]" : "bg-[#82D14C]"}`} />
                            <p className="text-sm font-bold text-slate-800">{notification.title}</p>
                          </div>
                          <span className="shrink-0 text-[11px] font-semibold text-slate-400">
                            {formatNotificationTime(notification.created_at)}
                          </span>
                        </div>

                        <p className="text-sm leading-5 text-slate-600">
                          {isAdminUpdate ? formatUpdateText(notification.message) : notification.message}
                        </p>

                        <div className="mt-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                          <MapPin className="h-3.5 w-3.5" />
                          <span>{notification.location_label}</span>
                          <span className="text-slate-300">•</span>
                          <span>{isAdminUpdate ? notification.actor_name : "Residente"}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </header>

      <main className="flex-1 overflow-y-auto p-4 space-y-4 pb-32">

        <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative col-span-1 sm:col-span-2">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por título, persona o lugar..."
              className="w-full pl-3 pr-3 py-2 rounded-xl border border-slate-200 shadow-sm"
            />
          </div>
          <div>
            <select value={filterLocation} onChange={(e) => setFilterLocation(e.target.value)} className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-200 bg-white">
              <option value="all">Todas las áreas</option>
              <option value="habitacion">Habitación</option>
              <option value="baño">Baño Común</option>
              <option value="cocina">Cocina</option>
              <option value="zonas_comunes">Zonas Comunes</option>
            </select>
          </div>
          <div>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-200 bg-white">
              <option value="all">Todos los estados</option>
              <option value="pending">Pendiente</option>
              <option value="reviewing">En revisión</option>
              <option value="in_progress">En proceso</option>
              <option value="resolved">Resuelto</option>
            </select>
          </div>
          <div>
            <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)} className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-200 bg-white">
              <option value="all">Todas las prioridades</option>
              <option value="low">BAJA</option>
              <option value="high">URGENTE</option>
            </select>
          </div>
        </div>
        {loading ? (
          <p className="text-center text-gray-400 mt-10 text-sm">Cargando reportes...</p>
        ) : incidences.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <CheckCircle2 className="w-12 h-12 mx-auto mb-2 opacity-20" />
            <p className="text-sm">No tienes incidencias activas</p>
          </div>
        ) : (
          incidences
            .filter((inc) => {
              const q = search.trim().toLowerCase();
              if (q) {
                const inTitle = inc.title?.toLowerCase().includes(q);
                const inRoom = inc.room_number?.toLowerCase().includes(q);
                if (!inTitle && !inRoom) return false;
              }
              if (filterLocation !== 'all' && inc.location_type !== filterLocation) return false;
              if (filterStatus !== 'all' && inc.status !== filterStatus) return false;
              if (filterPriority !== 'all' && inc.priority !== filterPriority) return false;
              return true;
            })
            .map((inc) => {
              
              const currentStatus = statusMap[inc.status as keyof typeof statusMap] || statusMap.pending;

              return (
                <Card key={inc.id} className="border-none shadow-sm rounded-[24px] overflow-hidden bg-white">
                  <CardContent className="p-0 flex">
                    <div className={`w-1.5 ${currentStatus.barClass}`} />

                    <div className="p-5 flex-1">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-bold text-lg text-[#1A1C1E]">{inc.title}</h3>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${currentStatus.colorClass}`}>
                          {currentStatus.label}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 text-slate-500 mb-4">
                        <MapPin size={14} strokeWidth={2.5} className="text-slate-400" />
                        <span className="text-sm font-medium">
                          {locationLabels[inc.location_type] || inc.location_type}
                          {inc.location_type === 'habitacion' && inc.room_number ? ` • Planta ${inc.room_number.charAt(0)}` : ''}
                        </span>
                      </div>

                      <div className="space-y-1 text-[#74777F] mb-4 text-xs">
                        <div className="flex items-center gap-2 opacity-60"><Clock className="w-3.5 h-3.5" />{new Date(inc.created_at).toLocaleDateString()}</div>
                      </div>
                      <div className="flex justify-end">
                        <Button
                          variant="outline"
                          onClick={() => openNotes(inc)}
                          className="rounded-xl border-[#D1E4FF] text-[#0061A7] hover:bg-[#D1E4FF]/20 h-8 px-4 text-xs font-bold"
                        >
                          Ver notas
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
        )}

      </main>

      <button
        onClick={() => setIsFormOpen(true)}
        className="fixed bottom-24 right-6 w-14 h-14 bg-[#82D14C] hover:bg-[#74bc44] text-white rounded-full shadow-2xl flex items-center justify-center z-50 transition-transform active:scale-90"
      >
        <Plus className="w-8 h-8" strokeWidth={3} />
      </button>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-[90vw] sm:max-w-[425px] rounded-[32px] p-0 border-none overflow-hidden">
          <DialogTitle className="sr-only">Nueva Incidencia</DialogTitle>
          <IncidenceForm
            onSuccess={() => {
              loadIncidences();
              setIsFormOpen(false);
            }}
            onClose={() => setIsFormOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={isNotesOpen} onOpenChange={(open) => { if (!open) { setIsNotesOpen(false); setSelectedIncidenceDetails(null);} }}>
        <DialogContent className="max-w-[90vw] sm:max-w-[640px] rounded-[24px] p-0 border-none overflow-hidden">
          <DialogTitle className="p-6 bg-white border-b">Notas de la incidencia</DialogTitle>
          <div className="p-6 bg-white">
            {selectedIncidenceDetails ? (
              <div>
                <h3 className="font-bold text-lg mb-2">{selectedIncidenceDetails.title}</h3>
                <p className="text-sm text-slate-500 italic mb-4">{selectedIncidenceDetails.description}</p>

                {selectedIncidenceDetails.admin_notes && (
                  <div className="mb-4 p-4 bg-emerald-50 rounded">
                    <div className="text-[10px] font-black uppercase text-emerald-600 mb-1">Nota del admin</div>
                    <div className="text-emerald-700">{selectedIncidenceDetails.admin_notes}</div>
                  </div>
                )}

                <div className="mt-4">
                  <div className="text-[10px] font-black uppercase text-slate-400 mb-3">Historial de actualizaciones</div>
                  {selectedIncidenceDetails.updates && selectedIncidenceDetails.updates.length > 0 ? (
                    <ul className="space-y-3">
                      {selectedIncidenceDetails.updates.map((u) => (
                        <li key={u.id} className="p-3 border rounded bg-slate-50">
                          <div className="text-xs text-slate-500 mb-1">{u.author_name || 'Sistema'} • {new Date(u.created_at).toLocaleString()}</div>
                          <div className="text-sm text-slate-700">{formatUpdateText(u.text)}</div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-slate-400">No hay actualizaciones aún.</p>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-400">Cargando...</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}