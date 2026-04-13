import { AlertTriangle, Bell } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { cn } from "../ui/utils";
import { toast } from "sonner";
import announcementService from "../../services/announcement.service";
import { authService } from "../../services/auth";
import { objectsService } from "../../services/objects";
import { listMyReservationReminders, type ReservationReminderNotification } from "../../services/reservations";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";

interface NotificationBellProps {
  onMarkAsRead?: () => void;
  className?: string;
  mode?: "notifications" | "announcements";
}

const VISIT_URGENT_NOTIFICATION_KEY_BASE = "visit-urgent-shared-notifications";
const VISIT_URGENT_NOTIFICATION_EVENT = "visit-urgent-notification-changed";

type VisitUrgentSharedNotification = {
  id: string;
  title: string;
  message: string;
  created_at: string;
  expires_at: string;
  source: "visitors";
};

type ReservationReminderItem = ReservationReminderNotification;

function buildVisitUrgentNotificationStorageKey(email: string): string | null {
  const normalized = email.trim().toLowerCase();
  if (!normalized) {
    return null;
  }
  return `${VISIT_URGENT_NOTIFICATION_KEY_BASE}:${normalized}`;
}

function getActiveVisitUrgentNotifications(storageKey: string | null): VisitUrgentSharedNotification[] {
  if (globalThis.window === undefined || !storageKey) {
    return [];
  }

  const raw = globalThis.localStorage.getItem(storageKey);
  if (!raw) {
    return [];
  }

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

    return active.sort((a, b) => Date.parse(a.expires_at) - Date.parse(b.expires_at));
  } catch {
    globalThis.localStorage.removeItem(storageKey);
    return [];
  }
}

function formatRelativeFuture(isoDate: string) {
  const date = new Date(isoDate);
  const diffInMinutes = Math.floor((date.getTime() - Date.now()) / 60000);

  if (diffInMinutes <= 0) return "Ahora";
  if (diffInMinutes < 60) return `En ${diffInMinutes} min`;

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `En ${diffInHours} h`;

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `En ${diffInDays} d`;

  return date.toLocaleDateString();
}

export function NotificationBell({ onMarkAsRead, className, mode = "notifications" }: NotificationBellProps) {
  const [unviewedCount, setUnviewedCount] = useState(0);
  const [visitUrgentNotifications, setVisitUrgentNotifications] = useState<VisitUrgentSharedNotification[]>([]);
  const [reservationReminders, setReservationReminders] = useState<ReservationReminderItem[]>([]);
  const [currentUserEmail, setCurrentUserEmail] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const visitUrgentStorageKey = buildVisitUrgentNotificationStorageKey(currentUserEmail);
  const totalNotifications = unviewedCount + visitUrgentNotifications.length + reservationReminders.length;
  const hasNotifications = totalNotifications > 0;
  const isAnnouncementsMode = mode === "announcements";

  const title = isAnnouncementsMode ? "Avisos" : "Notificaciones";
  const emptyDescription = isAnnouncementsMode
    ? "No tienes avisos nuevos"
    : "No tienes notificaciones nuevas";

  const refreshBellState = useCallback(async (): Promise<number> => {
    const [announcementCountResult, spaceReminderResult, objectReminderResult] = await Promise.allSettled([
      announcementService.getUnviewedCount(),
      listMyReservationReminders(),
      objectsService.getUserObjectReservationReminders(),
    ]);

    const announcementCount = announcementCountResult.status === "fulfilled" ? announcementCountResult.value.count : 0;
    const combinedReminders: ReservationReminderItem[] = [];

    if (spaceReminderResult.status === "fulfilled") {
      combinedReminders.push(...spaceReminderResult.value);
    }

    if (objectReminderResult.status === "fulfilled") {
      combinedReminders.push(...objectReminderResult.value);
    }

    combinedReminders.sort((a, b) => Date.parse(a.start_time) - Date.parse(b.start_time));

    setUnviewedCount(announcementCount);
    setReservationReminders(combinedReminders);
    setVisitUrgentNotifications(getActiveVisitUrgentNotifications(visitUrgentStorageKey));
    return announcementCount;
  }, [visitUrgentStorageKey]);

  useEffect(() => {
    authService.me()
      .then((session) => {
        setCurrentUserEmail((session.user?.email || "").trim().toLowerCase());
      })
      .catch(() => {
        setCurrentUserEmail("");
      });
  }, []);

  useEffect(() => {
    refreshBellState().catch((error) => {
      console.error("Error loading bell state:", error);
    });

    const refreshVisitUrgentNotifications = () => {
      setVisitUrgentNotifications(getActiveVisitUrgentNotifications(visitUrgentStorageKey));
    };

    refreshVisitUrgentNotifications();
    globalThis.addEventListener(VISIT_URGENT_NOTIFICATION_EVENT, refreshVisitUrgentNotifications);
    const intervalId = globalThis.setInterval(() => {
      refreshBellState().catch((error) => {
        console.error("Error loading bell state:", error);
      });
    }, 30000);

    return () => {
      globalThis.removeEventListener(VISIT_URGENT_NOTIFICATION_EVENT, refreshVisitUrgentNotifications);
      globalThis.clearInterval(intervalId);
    };
  }, [refreshBellState, visitUrgentStorageKey]);

  const handleBellClick = async () => {
    setLoading(true);
    try {
      const unreadAnnouncements = await refreshBellState();

      if (unreadAnnouncements > 0) {
        await announcementService.markAsViewed();
        setUnviewedCount(0);
      }

      onMarkAsRead?.();
    } catch (error) {
      console.error("Error loading unviewed count:", error);
      toast.error(title, {
        description: "No se pudo cargar el estado de notificaciones.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      void handleBellClick();
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={isAnnouncementsMode ? "Ver notificaciones de avisos" : "Ver notificaciones"}
          disabled={loading}
          className={cn("relative h-9 w-9 inline-flex items-center justify-center rounded-full text-primary-foreground transition-colors hover:bg-primary-foreground/20", className)}
        >
          <Bell className="w-4 h-4 text-current" />
          {hasNotifications && (
            <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-background" />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={10} className="w-[min(26rem,calc(100vw-2rem))] p-0">
        <div className="max-h-[70vh] overflow-y-auto rounded-md bg-white p-4">
          <div className="mb-3 flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-gray-900">{title}</h3>
          </div>

          <div className="space-y-3">
            {reservationReminders.map((reminder) => (
              <div key={reminder.id} className="relative overflow-hidden rounded-xl border border-teal-300 bg-gradient-to-br from-teal-50 via-white to-cyan-50 p-2.5 shadow-[0_8px_24px_rgba(13,148,136,0.16)]">
                <span className="absolute left-0 top-0 h-full w-1.5 bg-gradient-to-b from-teal-400 to-cyan-600" />
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="mb-0.5 inline-flex rounded-full bg-teal-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-teal-700">
                      Recordatorio
                    </span>
                    <p className="text-sm font-semibold leading-tight text-gray-900">{reminder.title}</p>
                    <p className="text-xs font-semibold text-teal-700">{formatRelativeFuture(reminder.start_time)}</p>
                  </div>
                  <div className="rounded-full bg-teal-100 p-1 ring-1 ring-teal-200">
                    <Bell className="h-3.5 w-3.5 text-teal-700" />
                  </div>
                </div>
                <p className="mt-0.5 line-clamp-2 text-xs leading-tight text-gray-700">{reminder.message}</p>
              </div>
            ))}

            {visitUrgentNotifications.map((urgentNotification) => (
              <div key={urgentNotification.id} className="relative overflow-hidden rounded-xl border border-amber-300 bg-gradient-to-br from-amber-50 via-white to-orange-50 p-2.5 shadow-[0_8px_24px_rgba(245,158,11,0.18)]">
                <span className="absolute left-0 top-0 h-full w-1.5 bg-gradient-to-b from-amber-400 to-orange-600" />
                <div className="mb-0.5 flex items-start justify-between gap-2 text-left">
                  <div>
                    <span className="mb-0.5 inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                      Urgente
                    </span>
                    <p className="text-sm font-semibold leading-tight text-gray-900">{urgentNotification.title}</p>
                  </div>
                  <div className="rounded-full bg-amber-100 p-1 ring-1 ring-amber-200">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-700" />
                  </div>
                </div>
                <p className="line-clamp-2 text-xs leading-tight text-gray-700">{urgentNotification.message}</p>
              </div>
            ))}

            {unviewedCount > 0 ? (
              <div className="relative overflow-hidden rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50 via-white to-slate-50 p-2.5 shadow-[0_4px_14px_rgba(59,130,246,0.08)]">
                <span className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-blue-400 to-blue-600" />
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="mb-0.5 inline-flex rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-blue-700">
                      Avisos
                    </span>
                    <p className="text-sm font-semibold leading-tight text-gray-900">
                      Tienes {unviewedCount} aviso{unviewedCount === 1 ? "" : "s"} sin leer.
                    </p>
                  </div>
                  <div className="rounded-full bg-blue-100 p-1 ring-1 ring-blue-200">
                    <Bell className="h-3.5 w-3.5 text-blue-700" />
                  </div>
                </div>
              </div>
            ) : null}

            {visitUrgentNotifications.length === 0 && reservationReminders.length === 0 && unviewedCount === 0 ? (
              <p className="py-2 text-sm text-gray-500">{emptyDescription}</p>
            ) : null}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}