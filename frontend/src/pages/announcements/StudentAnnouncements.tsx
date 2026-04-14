import { useCallback, useEffect, useState } from "react";
import { LogOut, User } from "lucide-react";
import { AnnouncementCard } from "../../components/announcement/AnnouncementCard";
import { AnnouncementFilters } from "../../components/announcement/AnnouncementFilters";
import { NotificationBell } from "../../components/announcement/NotificationBell";
import { Button } from "../../components/ui/button";
import announcementService from "../../services/announcement.service";
import { AnnouncementList } from "../../types/announcement.types";
import type { StudentTab } from "../../components/StudentHome";


interface StudentAnnouncementsProps {
  onGoToProfile?: () => void;
  onLogout?: () => void;
  onAnnouncementsLoaded?: () => void;
  onNavigate?: (view: StudentTab) => void;
}

export function StudentAnnouncements({ onGoToProfile, onLogout, onAnnouncementsLoaded, onNavigate }: StudentAnnouncementsProps) {
  const [announcements, setAnnouncements] = useState<AnnouncementList[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [error, setError] = useState<string | null>(null);

  const loadAnnouncements = useCallback(async (isInitialLoad = false) => {
    if (isInitialLoad) {
      setLoading(true);
    }

    setError(null);
    try {
      const data = await announcementService.getAnnouncementsByCategory(selectedCategory);
      setAnnouncements(data);

      const visibleIds = data.map((announcement) => announcement.id);
      if (visibleIds.length > 0) {
        await announcementService.markAsViewed(visibleIds);
      }
      onAnnouncementsLoaded?.();
    } catch (err) {
      setError("Error al cargar los avisos");
      console.error(err);
    } finally {
      if (isInitialLoad) {
        setLoading(false);
      }
    }
  }, [onAnnouncementsLoaded, selectedCategory]);

  useEffect(() => {
    loadAnnouncements(true);

    const intervalId = globalThis.setInterval(() => {
      loadAnnouncements(false);
    }, 3000);

    return () => globalThis.clearInterval(intervalId);
  }, [loadAnnouncements]);


  return (
    <div className="flex flex-col w-full bg-background">
      {/* Header */}
      <header className="bg-primary  p-6 pt-12 flex justify-between items-center shrink-0 shadow-lg sticky top-0 z-20">
        <h1 className="text-primary-foreground text-2xl font-bold">Avisos</h1>
        <div className="flex items-center gap-2">
          <NotificationBell mode="announcements" onMarkAsRead={loadAnnouncements} onNavigate={onNavigate} />
          <Button
            size="icon"
            variant="ghost"
            className="text-primary-foreground hover:bg-primary-foreground/20 hover:scale-110 rounded-full transition-all"
            onClick={() => onGoToProfile?.()}
            aria-label="Ir al perfil"
          >
            <User className="w-5 h-5" />
          </Button>
          {onLogout ? (
            <Button
              size="icon"
              variant="ghost"
              className="text-primary-foreground hover:bg-primary-foreground/20 hover:scale-110 rounded-full transition-all"
              onClick={onLogout}
              aria-label="Cerrar sesión"
            >
              <LogOut className="w-5 h-5" />
            </Button>
          ) : null}
        </div>
      </header>

      {/* Filtros */}
      <div className="px-4 py-3 flex justify-center sticky top-[72px] z-10 bg-[#F6F7F9]">
        <div className="w-fit max-w-full">
          <AnnouncementFilters
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
          />
        </div>
      </div>

      {/* Lista de avisos */}
      <main className="flex-1 overflow-y-auto px-4 pb-32">
        {loading && (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        )}

        {error && (
          <div className="bg-destructive/10 text-destructive rounded-lg p-4 text-center">
            {error}
          </div>
        )}

        {!loading && !error && announcements.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No hay avisos disponibles
          </div>
        )}

        {!loading && !error && announcements.length > 0 && (
          <div className="grid items-stretch grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
            {announcements.map((announcement) => (
              <AnnouncementCard
                key={announcement.id}
                announcement={announcement}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}