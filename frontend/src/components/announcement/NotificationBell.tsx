import { AlertTriangle, Bell } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { cn } from "../ui/utils";
import { toast } from "sonner";
import announcementService from "../../services/announcement.service";
import { authService } from "../../services/auth";
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

function buildVisitUrgentNotificationStorageKey(email: string): string | null {
  const normalized = email.trim().toLowerCase();
  if (!normalized) {
    return null;
  }
  return `${VISIT_URGENT_NOTIFICATION_KEY_BASE}:${normalized}`;
}

function getActiveVisitUrgentNotifications(storageKey: string | null): VisitUrgentSharedNotification[] {
  if (typeof globalThis.window === "undefined" || !storageKey) {
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

export function NotificationBell({ onMarkAsRead, className, mode = "notifications" }: NotificationBellProps) {
  const [unviewedCount, setUnviewedCount] = useState(0);
  const [visitUrgentNotifications, setVisitUrgentNotifications] = useState<VisitUrgentSharedNotification[]>([]);
  const [currentUserEmail, setCurrentUserEmail] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const visitUrgentStorageKey = buildVisitUrgentNotificationStorageKey(currentUserEmail);
  const totalNotifications = unviewedCount + visitUrgentNotifications.length;
  const hasNotifications = totalNotifications > 0;
  const isAnnouncementsMode = mode === "announcements";

  const title = isAnnouncementsMode ? "Avisos" : "Notificaciones";
  const emptyDescription = isAnnouncementsMode
    ? "No tienes avisos nuevos"
    : "No tienes notificaciones nuevas";

  const refreshBellState = useCallback(async (): Promise<number> => {
    const data = await announcementService.getUnviewedCount();
    setUnviewedCount(data.count);
    setVisitUrgentNotifications(getActiveVisitUrgentNotifications(visitUrgentStorageKey));
    return data.count;
  }, [visitUrgentStorageKey]);

  const loadUnviewedCount = useCallback(async () => {
    try {
      await refreshBellState();
    } catch (error) {
      console.error("Error loading unviewed count:", error);
    }
  }, [refreshBellState]);

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
    loadUnviewedCount().catch((error) => {
      console.error("Error loading unviewed count:", error);
    });

    const refreshVisitUrgentNotifications = () => {
      setVisitUrgentNotifications(getActiveVisitUrgentNotifications(visitUrgentStorageKey));
    };

    refreshVisitUrgentNotifications();
    globalThis.addEventListener(VISIT_URGENT_NOTIFICATION_EVENT, refreshVisitUrgentNotifications);
    const intervalId = globalThis.setInterval(refreshVisitUrgentNotifications, 30000);

    return () => {
      globalThis.removeEventListener(VISIT_URGENT_NOTIFICATION_EVENT, refreshVisitUrgentNotifications);
      globalThis.clearInterval(intervalId);
    };
  }, [loadUnviewedCount, visitUrgentStorageKey]);

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
            {visitUrgentNotifications.map((urgentNotification) => (
              <div key={urgentNotification.id} className="relative rounded-xl border border-amber-300 bg-gradient-to-r from-amber-50 to-orange-50 p-2.5 shadow-[0_6px_18px_rgba(245,158,11,0.18)]">
                <div className="mb-0.5 flex items-start justify-between gap-2 text-left">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{urgentNotification.title}</p>
                  </div>
                  <AlertTriangle className="h-4 w-4 text-amber-700" />
                </div>
                <p className="text-xs text-gray-700 leading-tight">{urgentNotification.message}</p>
              </div>
            ))}

            {unviewedCount > 0 ? (
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
                Tienes {unviewedCount} aviso{unviewedCount === 1 ? "" : "s"} sin leer.
              </div>
            ) : null}

            {visitUrgentNotifications.length === 0 && unviewedCount === 0 ? (
              <p className="py-2 text-sm text-gray-500">{emptyDescription}</p>
            ) : null}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}