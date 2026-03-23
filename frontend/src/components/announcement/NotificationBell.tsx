import { Bell } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { cn } from "../ui/utils";
import { toast } from "sonner";
import announcementService from "../../services/announcement.service";

interface NotificationBellProps {
  onMarkAsRead?: () => void;
  className?: string;
}

const TOAST_COOLDOWN_MS = 3500; // Tiempo para no repetir el mismo toast de notificación

export function NotificationBell({ onMarkAsRead, className }: NotificationBellProps) {
  const [unviewedCount, setUnviewedCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const lastEmptyToastTimeRef = useRef<number>(0);
  const hasNotifications = unviewedCount > 0;

  useEffect(() => {
    loadUnviewedCount();
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
          toast.info("Avisos", {
            description: "No tienes avisos nuevos",
            duration: 3000,
          });
          lastEmptyToastTimeRef.current = now;
        }
      } else {
        // Si hay avisos, resetear el cooldown para permitir mostrar de nuevo
        lastEmptyToastTimeRef.current = 0;
        const pluralSuffix = data.count !== 1 ? "s" : "";
        toast.info("Avisos", {
          description: `Tienes ${data.count} aviso${pluralSuffix} nuevo${pluralSuffix}`,
          duration: 3000,
        });

        await announcementService.markAsViewed();
        setUnviewedCount(0);
      }

      onMarkAsRead?.();
    } catch (error) {
      console.error("Error loading unviewed count:", error);
      toast.error("Avisos", {
        description: "No se pudo cargar el estado de notificaciones.",
        duration: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      aria-label="Ver notificaciones de avisos"
      onClick={handleBellClick}
      disabled={loading}
      className={cn("relative p-2 bg-white/10 rounded-full", className)}
    >
      <Bell className="w-6 h-6 text-white" />
      {hasNotifications && (
        <span className="absolute -right-1 -top-1 min-w-5 h-5 flex items-center justify-center rounded-full bg-[#82D14C] px-1 text-[10px] font-black text-[#123313]" />
      )}
    </button>
  );
}