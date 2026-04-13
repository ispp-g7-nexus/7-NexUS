import { useState, useEffect, useCallback, useRef } from "react";
import { Plus, Bell, MapPin, User, Wrench, MessageSquare, Loader2, Clock, Pencil, Trash2, LogOut, X, AlertCircle, AlertTriangle } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Card, CardContent } from "../../../components/ui/card";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "../../../components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "../../../components/ui/popover";
import { fetchWithAuth, API_URL_INCIDENCES } from "../../../utils/api";
import { authService } from "../../../services/auth";
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

type IncidenceNotification = {
  id: string;
  kind?: string;
  incidence_id?: number;
  title: string;
  message: string;
  created_at: string;
};

const INCIDENCE_NOTIFICATIONS_DISMISSED_KEY = "incidences-notifications-dismissed-ids";
const HOME_INCIDENCES_SEEN_AT_KEY = "home-incidences-seen-at";
const VISIT_URGENT_NOTIFICATION_KEY_BASE = "visit-urgent-shared-notifications";
const LIVE_REFRESH_MS = 5000;

type VisitUrgentSharedNotification = {
  id: string;
  title: string;
  message: string;
  created_at: string;
  expires_at: string;
  source: "visitors";
};

interface IncidenceNotificationCardProps {
  readonly notification: IncidenceNotification;
  readonly onDismiss: (notificationId: string) => void;
}

function IncidenceNotificationCard({ notification, onDismiss }: IncidenceNotificationCardProps) {
  const normalizedKind = (notification.kind || "").trim().toLowerCase();
  const isVisitUrgent = notification.kind === "visit_limit_warning";
  const hasKnownKind = normalizedKind.length > 0 && normalizedKind !== "unknown";
  const statusUpdateKinds = new Set(["admin_update", "status_update", "incidence_update", "estado", "update"]);
  const fallbackStatusUpdate = /estado|status/i.test(`${notification.title} ${notification.message}`);
  const isStatusUpdate = hasKnownKind ? statusUpdateKinds.has(normalizedKind) : fallbackStatusUpdate;
  const isRedundantStatusTitle = isStatusUpdate && /cambio de estado|status update/i.test(notification.title);
  const stateChangedMatch = isStatusUpdate ? notification.message.match(/Estado cambiado/i) : null;

  const containerClasses = isVisitUrgent
    ? "border-amber-300 bg-gradient-to-br from-amber-50 via-white to-orange-50 shadow-[0_8px_24px_rgba(245,158,11,0.16)]"
    : isStatusUpdate
      ? "border-slate-200 bg-gradient-to-br from-white via-slate-50 to-slate-100"
      : "border-red-200 bg-gradient-to-br from-red-50 via-white to-rose-50 shadow-[0_3px_10px_rgba(239,68,68,0.08)]";

  const accentClass = isVisitUrgent
    ? "bg-gradient-to-b from-amber-400 to-orange-600"
    : isStatusUpdate
      ? "bg-gradient-to-b from-slate-300 to-slate-500"
      : "bg-gradient-to-b from-red-400 to-rose-600";

  const badgeClass = isVisitUrgent
    ? "bg-amber-100 text-amber-700"
    : isStatusUpdate
      ? "bg-slate-200 text-slate-700"
      : "bg-red-100 text-red-700";

  const iconWrapClass = isVisitUrgent
    ? "bg-amber-100 ring-1 ring-amber-200"
    : isStatusUpdate
      ? "bg-slate-100 ring-1 ring-slate-200"
      : "bg-red-100 ring-1 ring-red-200";

  const timeClass = isVisitUrgent
    ? "text-amber-700"
    : isStatusUpdate
      ? "text-slate-500"
      : "text-red-700";

  const badgeLabel = isVisitUrgent ? "Urgente" : isStatusUpdate ? "Actualización" : "Incidencia";

  const renderNotificationMessage = () => {
    if (!stateChangedMatch || stateChangedMatch.index === undefined) {
      return notification.message;
    }

    const start = stateChangedMatch.index;
    const highlightedText = stateChangedMatch[0];
    const end = start + highlightedText.length;

    return (
      <>
        {notification.message.slice(0, start)}
        <strong className="font-semibold text-gray-700">{highlightedText}</strong>
        {notification.message.slice(end)}
      </>
    );
  };

  return (
    <div className={`relative w-full overflow-hidden rounded-xl border ${containerClasses} transition-all hover:shadow-sm`}>
      <span className={`absolute left-0 top-0 h-full ${isVisitUrgent ? "w-1.5" : "w-1"} ${accentClass}`} />
      {isVisitUrgent ? null : (
        <button
          type="button"
          aria-label="Descartar notificación"
          className="absolute right-1 top-1 h-7 w-7 rounded-lg text-slate-400 transition-all hover:bg-red-50 hover:text-red-600"
          onClick={() => onDismiss(notification.id)}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}

      <div className={`flex gap-2 py-1.5 pl-2.5 text-left ${isVisitUrgent ? "pr-2.5" : "pr-8"}`}>
        <div className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full shadow-sm ${iconWrapClass}`}>
          {isVisitUrgent ? (
            <AlertTriangle className="h-3 w-3 text-amber-700" />
          ) : isStatusUpdate ? (
            <Clock className="h-3 w-3 text-slate-600" />
          ) : (
            <AlertCircle className="h-3 w-3 text-red-600" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          {badgeLabel ? (
            <span className={`mb-0.5 inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${badgeClass}`}>
              {badgeLabel}
            </span>
          ) : null}
          {isRedundantStatusTitle ? null : (
            <p className="mb-0.5 text-[13px] font-semibold leading-tight text-gray-900">{notification.title}</p>
          )}
          <p className={`line-clamp-1 text-[12px] leading-tight text-gray-600 ${isRedundantStatusTitle ? "mb-0" : "mb-0.5"}`}>{renderNotificationMessage()}</p>
          <span className={`text-[11px] font-medium ${timeClass}`}>{formatNotificationTime(notification.created_at)}</span>
        </div>
      </div>
    </div>
  );
}

const getDismissedNotificationIds = (): string[] => {
  if (globalThis.window === undefined) return [];
  const raw = globalThis.localStorage.getItem(INCIDENCE_NOTIFICATIONS_DISMISSED_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const saveDismissedNotificationIds = (ids: string[]) => {
  if (globalThis.window === undefined) return;
  globalThis.localStorage.setItem(INCIDENCE_NOTIFICATIONS_DISMISSED_KEY, JSON.stringify(ids));
};

const saveHomeIncidencesSeenAt = (timestamp?: string) => {
  if (globalThis.window === undefined || !timestamp) return;
  globalThis.localStorage.setItem(HOME_INCIDENCES_SEEN_AT_KEY, timestamp);
};

const buildVisitUrgentNotificationStorageKey = (email: string): string | null => {
  const normalized = email.trim().toLowerCase();
  if (!normalized) {
    return null;
  }
  return `${VISIT_URGENT_NOTIFICATION_KEY_BASE}:${normalized}`;
};

const mergeAndSortNotifications = (
  baseItems: IncidenceNotification[],
  urgentItems: IncidenceNotification[],
  dismissedIds: string[]
): IncidenceNotification[] => {
  return [...urgentItems, ...baseItems]
    .filter((item) => item.kind === "visit_limit_warning" || !dismissedIds.includes(item.id))
    .sort((a, b) => {
      const aPinned = a.kind === "visit_limit_warning" ? 1 : 0;
      const bPinned = b.kind === "visit_limit_warning" ? 1 : 0;
      if (aPinned !== bPinned) {
        return bPinned - aPinned;
      }
      return Date.parse(b.created_at) - Date.parse(a.created_at);
    });
};

const getActiveVisitUrgentNotifications = (storageKey: string | null): IncidenceNotification[] => {
  if (globalThis.window === undefined || !storageKey) return [];

  const raw = globalThis.localStorage.getItem(storageKey);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as VisitUrgentSharedNotification | VisitUrgentSharedNotification[];
    const items = Array.isArray(parsed) ? parsed : [parsed];
    const nowMs = Date.now();

    const active = items.filter((item) => {
      const expiresAtMs = Date.parse(item.expires_at);
      return Number.isFinite(expiresAtMs) && expiresAtMs > nowMs;
    });

    if (active.length !== items.length) {
      if (active.length === 0) {
        globalThis.localStorage.removeItem(storageKey);
      } else {
        globalThis.localStorage.setItem(storageKey, JSON.stringify(active));
      }
    }

    const sortedActive = [...active].sort((a, b) => Date.parse(a.expires_at) - Date.parse(b.expires_at));

    return sortedActive
      .map((item) => ({
        id: item.id,
        kind: "visit_limit_warning",
        title: item.title,
        message: item.message,
        created_at: item.created_at,
      }));
  } catch {
    globalThis.localStorage.removeItem(storageKey);
    return [];
  }
};

export default function StudentIncidences({ onGoToProfile, onLogout }: StudentIncidencesProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [incidences, setIncidences] = useState<BaseIncidence[]>([]);
  const [selectedDetails, setSelectedDetails] = useState<BaseIncidence | null>(null);
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<IncidenceNotification[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [loading, setLoading] = useState(true);
  const [currentUserEmail, setCurrentUserEmail] = useState("");
  const dismissedNotificationIdsRef = useRef<string[]>(getDismissedNotificationIds());
  const visitUrgentStorageKey = buildVisitUrgentNotificationStorageKey(currentUserEmail);

  const [incidenceToDelete, setIncidenceToDelete] = useState<BaseIncidence | null>(null);
  const [incidenceToEdit, setIncidenceToEdit] = useState<BaseIncidence | null>(null);

  const [search, setSearch] = useState('');
  const [filterLocation, setFilterLocation] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [showOnlyMine, setShowOnlyMine] = useState(false);

  const appendDismissedNotificationIds = useCallback((ids: string[]) => {
    if (ids.length === 0) return;

    const next = Array.from(new Set([...dismissedNotificationIdsRef.current, ...ids]));
    dismissedNotificationIdsRef.current = next;
    saveDismissedNotificationIds(next);
  }, []);

  const recalculateUnreadNotifications = useCallback((items: IncidenceNotification[]) => {
    const lastReadAt = getLastReadNotificationsAt();
    setUnreadNotifications(items.filter((item) => Date.parse(item.created_at) > lastReadAt).length);
  }, []);

  const dismissNotification = useCallback((notificationId: string) => {
    appendDismissedNotificationIds([notificationId]);
    setNotifications((prev) => {
      const next = prev.filter((item) => item.id !== notificationId);
      recalculateUnreadNotifications(next);
      return next;
    });
  }, [appendDismissedNotificationIds, recalculateUnreadNotifications]);

  useEffect(() => {
    authService.me()
      .then((session) => {
        setCurrentUserEmail((session.user?.email || "").trim().toLowerCase());
      })
      .catch(() => {
        setCurrentUserEmail("");
      });
  }, []);

  const loadNotifications = useCallback(async (markAsRead = false, silent = false) => {
    try {
      if (!silent) setNotificationsLoading(true);
      const res = await fetchWithAuth(`${API_URL_INCIDENCES}notifications/`);
      if (!res.ok) return;

      const data = await res.json();
      const baseItems = Array.isArray(data.results) ? (data.results as IncidenceNotification[]) : [];
      const visitWarnings = getActiveVisitUrgentNotifications(visitUrgentStorageKey);

      if (markAsRead && baseItems.length > 0) {
        saveHomeIncidencesSeenAt(baseItems[0].created_at);
      }

      const latestNotifications = mergeAndSortNotifications(
        baseItems,
        visitWarnings,
        dismissedNotificationIdsRef.current
      );

      const lastReadAt = getLastReadNotificationsAt();

      if (markAsRead && latestNotifications.length > 0) {
        saveLastReadNotificationsAt(latestNotifications[0].created_at);
        setUnreadNotifications(0);
      } else {
        const count = latestNotifications.filter((n) => Date.parse(n.created_at) > lastReadAt).length;
        setUnreadNotifications(count);
      }
      setNotifications(latestNotifications);
    } catch (e) {
      console.error(e);
    } finally {
      if (!silent) setNotificationsLoading(false);
    }
  }, [visitUrgentStorageKey]);

  const handleNotificationsOpenChange = useCallback((open: boolean) => {
    setIsNotificationsOpen(open);
    if (open) {
      loadNotifications(true);
    }
  }, [loadNotifications]);

  const loadIncidences = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const res = await fetchWithAuth(API_URL_INCIDENCES);
      if (res.ok) setIncidences(await res.json());
    } catch (e) { console.error(e); } finally { if (!silent) setLoading(false); }
  }, []);

  useEffect(() => {
    loadIncidences(); loadNotifications();
    const notificationsInterval = setInterval(() => loadNotifications(false, true), LIVE_REFRESH_MS);
    const incidencesInterval = setInterval(() => loadIncidences(true), LIVE_REFRESH_MS);
    return () => {
      clearInterval(notificationsInterval);
      clearInterval(incidencesInterval);
    };
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
          <Popover open={isNotificationsOpen} onOpenChange={handleNotificationsOpenChange}>
            <PopoverTrigger asChild>
              <Button type="button" size="icon" variant="ghost" className={`${UI_CLASSES.topIconButton} hover:scale-100`} aria-label="Notificaciones">
                <Bell className="w-5 h-5" />
                {unreadNotifications > 0 && <span className={UI_CLASSES.bellBadge} />}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" sideOffset={10} avoidCollisions={false} className="w-[min(26rem,calc(100vw-2rem))] p-0">
              <div className="max-h-[70vh] overflow-y-auto rounded-md bg-white p-4">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Bell className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold text-gray-900">Notificaciones</h3>
                  </div>
                  {notificationsLoading && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                </div>

                <div className="space-y-3">
                  {notifications.length > 0
                    ? notifications.map((notification) => (
                        <IncidenceNotificationCard
                          key={notification.id}
                          notification={notification}
                          onDismiss={dismissNotification}
                        />
                      ))
                    : <p className="py-4 text-sm text-gray-500 text-center">Sin notificaciones</p>}
                </div>
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
                              {inc.is_mine && inc.status === 'pending' && !inc.assigned_staff && !(inc.assigned_external_name && inc.assigned_external_name.trim()) && (!inc.updates || inc.updates.length === 0) && (
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
                              {inc.location_type === 'habitacion' && inc.room_number_detail && (
                                <>
                                  {` • Hab. ${inc.room_number_detail.numero}`}
                                  {inc.room_number_detail.planta && ` Planta ${inc.room_number_detail.planta}` }
                                  {inc.room_number_detail.edificio && ` Edificio ${inc.room_number_detail.edificio}`}
                                </>
                              )}
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
                    {selectedDetails.updates?.map((u) => (
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
  bellBadge: "absolute top-1 right-1 w-2.5 h-2.5 bg-destructive rounded-full border-2 border-primary",
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