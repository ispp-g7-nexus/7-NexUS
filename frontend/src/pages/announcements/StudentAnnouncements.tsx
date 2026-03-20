import { useState, useEffect } from "react";
import { AnnouncementCard } from "../../components/announcement/AnnouncementCard";
import { AnnouncementFilters } from "../../components/announcement/AnnouncementFilters";
import { NotificationBell } from "../../components/announcement/NotificationBell";
import announcementService from "../../services/announcement.service";
import { AnnouncementList } from "../../types/announcement.types";
import logo from "../../assets/logo.png";

export function StudentAnnouncements() {
  const [announcements, setAnnouncements] = useState<AnnouncementList[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAnnouncements();
  }, [selectedCategory]);

  const loadAnnouncements = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await announcementService.getAnnouncementsByCategory(selectedCategory);
      setAnnouncements(data);
    } catch (err) {
      setError("Error al cargar los avisos");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-primary border-b border-primary/80 px-4 py-3">
        <div className="relative flex items-center justify-center min-h-[2.25rem]">
          <div className="absolute left-0 w-11 h-11 flex items-center justify-center">
            <img src={logo} alt="NexUS Logo" className="w-full h-full object-contain" />
            </div>
          <h1 className="text-xl font-bold text-primary-foreground">Avisos</h1>
          <NotificationBell onMarkAsRead={loadAnnouncements} className="absolute right-0 text-primary-foreground hover:opacity-80 transition-opacity" />
        </div>
      </div>

      {/* Filtros */}
      <div className="px-4 py-3 flex justify-center">
        <div className="w-fit max-w-full">
          <AnnouncementFilters
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
          />
        </div>
      </div>

      {/* Lista de avisos */}
      <div className="px-4 pb-6">
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
      </div>
    </div>
  );
}