import { Bell } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { cn } from "../ui/utils";
import { toast } from "sonner";
import announcementService from "../../services/announcement.service";

interface NotificationBellProps {
  onMarkAsRead?: () => void;
  className?: string;
  mode?: "notifications" | "announcements";
}

const TOAST_COOLDOWN_MS = 3500; // Tiempo para no repetir el mismo toast de notificación
const TOAST_DURATION_MS = 2000;

export function NotificationBell({ onMarkAsRead, className, mode = "notifications" }: NotificationBellProps) {
  const [unviewedCount, setUnviewedCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const lastEmptyToastTimeRef = useRef<number>(0);
  const activeToastIdRef = useRef<string | number | undefined>(undefined);
  const hasNotifications = unviewedCount > 0;
  const isAnnouncementsMode = mode === "announcements";

  const title = isAnnouncementsMode ? "Avisos" : "Notificaciones";
  const emptyDescription = isAnnouncementsMode
    ? "No tienes avisos nuevos"
    : "No tienes notificaciones nuevas";
  const singularLabel = isAnnouncementsMode ? "aviso" : "notificación";

  useEffect(() => {
    loadUnviewedCount();
  }, []);

  useEffect(() => {
    return () => {
      if (activeToastIdRef.current !== undefined) {
        toast.dismiss(activeToastIdRef.current);
        activeToastIdRef.current = undefined;
      }
    };
  }, []);

  const loadUnviewedCount = async () => {
    try {
      const data = await announcementService.getUnviewedCount();
      setUnviewedCount(data.count);
    } catch (error) {
      console.error("Error loading unviewed count:", error);
    }
  };

  const handleBellClick = async () => {
    setLoading(true);
    try {
      const data = await announcementService.getUnviewedCount();
      setUnviewedCount(data.count);

      if (data.count === 0) {
        const now = Date.now();
        // Solo mostrar el toast de "no hay avisos" si ha pasado el cooldown
        if (now - lastEmptyToastTimeRef.current > TOAST_COOLDOWN_MS) {
          if (activeToastIdRef.current !== undefined) {
            toast.dismiss(activeToastIdRef.current);
          }
          activeToastIdRef.current = toast.info(title, {
            description: emptyDescription,
            duration: TOAST_DURATION_MS,
          });
          lastEmptyToastTimeRef.current = now;
        }
      } else {
        // Si hay avisos, resetear el cooldown para permitir mostrar de nuevo
        lastEmptyToastTimeRef.current = 0;
        const pluralSuffix = data.count !== 1 ? "s" : "";
        if (activeToastIdRef.current !== undefined) {
          toast.dismiss(activeToastIdRef.current);
        }
        activeToastIdRef.current = toast.info(title, {
          description: `Tienes ${data.count} ${singularLabel}${pluralSuffix} nueva${pluralSuffix}`,
          duration: TOAST_DURATION_MS,
        });

        await announcementService.markAsViewed();
        setUnviewedCount(0);
      }

      onMarkAsRead?.();
    } catch (error) {
      console.error("Error loading unviewed count:", error);
      if (activeToastIdRef.current !== undefined) {
        toast.dismiss(activeToastIdRef.current);
      }
      activeToastIdRef.current = toast.error(title, {
        description: "No se pudo cargar el estado de notificaciones.",
        duration: TOAST_DURATION_MS,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      aria-label={isAnnouncementsMode ? "Ver notificaciones de avisos" : "Ver notificaciones"}
      onClick={handleBellClick}
      disabled={loading}
      className={cn("relative h-9 w-9 inline-flex items-center justify-center rounded-full text-primary-foreground transition-colors hover:bg-primary-foreground/20", className)}
    >
      <Bell className="w-4 h-4 text-current" />
      {hasNotifications && (
        <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-background" />
      )}
    </button>
  );
}