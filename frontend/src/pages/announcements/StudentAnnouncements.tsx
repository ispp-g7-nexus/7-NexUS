import { useState, useEffect } from "react";
import { AnnouncementCard } from "../../components/announcement/AnnouncementCard";
import { AnnouncementFilters } from "../../components/announcement/AnnouncementFilters";
import { NotificationBell } from "../../components/announcement/NotificationBell";
import announcementService from "../../services/announcement.service";
import { AnnouncementList } from "../../types/announcement.types";


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
    <div className="flex flex-col w-full bg-background">
      {/* Header */}
      <header className="bg-primary  p-6 pt-12 flex justify-between items-center shrink-0 shadow-lg sticky top-0 z-20">
        <h1 className="text-primary-foreground text-2xl font-bold">Avisos</h1>
        <NotificationBell onMarkAsRead={loadAnnouncements} className="relative p-2 bg-white/10 rounded-full text-white hover:text-white" />
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