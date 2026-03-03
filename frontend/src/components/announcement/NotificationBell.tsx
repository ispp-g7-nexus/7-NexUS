import { Bell } from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "../ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { cn } from "../ui/utils";
import announcementService from "../../services/announcement.service";

interface NotificationBellProps {
  onMarkAsRead?: () => void;
  className?: string;
}

export function NotificationBell({ onMarkAsRead, className }: NotificationBellProps) {
  const [unviewedCount, setUnviewedCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const hasNotifications = unviewedCount > 0;
  const pluralSuffix = unviewedCount !== 1 ? "s" : "";
  const notificationMessage = `Tienes ${unviewedCount} aviso${pluralSuffix} nuevo${pluralSuffix}`;

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

  const handleMarkAsRead = async () => {
    setLoading(true);
    try {
      await announcementService.markAsViewed();
      setUnviewedCount(0);
      onMarkAsRead?.();
    } catch (error) {
      console.error("Error marking as read:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn("relative text-gray-500 w-9 h-9", className)}
        >
          <Bell className="w-5 h-5" />
          {hasNotifications && (
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4" align="end">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">Notificaciones</h4>
            {hasNotifications && (
              <button
                onClick={handleMarkAsRead}
                disabled={loading}
                className="text-xs text-primary hover:underline disabled:opacity-50"
              >
                Marcar todas como leídas
              </button>
            )}
          </div>
          
          {unviewedCount === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No tienes notificaciones nuevas
            </p>
          ) : (
            <div className="space-y-2">
              <p className="text-sm">{notificationMessage}</p>
              <Button
                size="sm"
                className="w-full"
                onClick={handleMarkAsRead}
                disabled={loading}
              >
                Ver avisos
              </Button>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}