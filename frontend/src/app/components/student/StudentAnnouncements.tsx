import { useState } from "react";
import { Badge } from "../ui/badge";
import { AlertCircle, Calendar, Wrench, HelpCircle, MessageCircle, Clock } from "lucide-react";
import { StudentHeader } from "./StudentHeader";

export function StudentAnnouncements() {
  const [selectedCategory, setSelectedCategory] = useState("all");

  const categories = [
    { id: "all", label: "Todas", icon: null },
    { id: "urgent", label: "Urgente", icon: <AlertCircle className="w-3.5 h-3.5" /> },
    { id: "maintenance", label: "Mantenimiento", icon: <Wrench className="w-3.5 h-3.5" /> },
    { id: "event", label: "Evento", icon: <Calendar className="w-3.5 h-3.5" /> },
    { id: "help", label: "Ayuda", icon: <HelpCircle className="w-3.5 h-3.5" /> },
    { id: "general", label: "General", icon: <MessageCircle className="w-3.5 h-3.5" /> },
  ];

  const announcements = [
    {
      id: 1,
      category: "urgent",
      title: "Corte de Agua Programado - Miércoles 5 de Febrero",
      description:
        "Se realizará mantenimiento de las tuberías principales. El servicio de agua estará interrumpido de 9:00 AM a 3:00 PM. Por favor...",
      time: "30 de enero de 2026",
      author: "Dirección de la Residencia",
      hasImage: true,
      imageType: "maintenance",
    },
    {
      id: 2,
      category: "event",
      title: "Asamblea General de Residentes - Febrero 2026",
      description:
        "Te esperamos el próximo sábado 8 de febrero a las 11:00 AM en el salón común. Temas a tratar: actividades del mes, mejoras en las instalaciones...",
      time: "30 de enero de 2026",
      author: "Dirección de la Residencia",
      hasImage: true,
      imageType: "meeting",
    },
    {
      id: 3,
      category: "event",
      title: "Noche de Juegos de Mesa",
      description:
        "Ven a disfrutar de una tarde de diversión con tus compañeros de residencia. Tendremos snacks, bebidas y muchos juegos para todos. ¡No te lo pierdas!",
      time: "28 de enero de 2026",
      author: "Equipo de Actividades",
      hasImage: false,
    },
    {
      id: 4,
      category: "general",
      title: "Nuevas Normas de Uso del Gimnasio",
      description:
        "A partir del 1 de febrero, el gimnasio tendrá nuevos horarios y reglas de uso. Consulta el tablón para más detalles.",
      time: "25 de enero de 2026",
      author: "Administración",
      hasImage: false,
    },
  ];

  const filteredAnnouncements =
    selectedCategory === "all"
      ? announcements
      : announcements.filter((a) => a.category === selectedCategory);

  return (
    <div className="min-h-screen bg-background p-4">
      <StudentHeader title="Avisos" />

      {/* Category Filters */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide mb-4">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
              selectedCategory === cat.id
                ? "bg-primary text-primary-foreground shadow-md"
                : "bg-card text-card-foreground border border-border hover:border-primary/30"
            }`}
          >
            {cat.icon}
            {cat.label}
          </button>
        ))}
      </div>

      {/* Main Content - Announcements */}
      <div className="space-y-4">
        {filteredAnnouncements.map((announcement) => (
          <AnnouncementCard key={announcement.id} {...announcement} />
        ))}
      </div>
    </div>
  );
}

interface AnnouncementCardProps {
  category: string;
  title: string;
  description: string;
  time: string;
  author: string;
  hasImage: boolean;
  imageType?: string;
}

function AnnouncementCard({
  category,
  title,
  description,
  time,
  author,
  hasImage,
  imageType,
}: AnnouncementCardProps) {
  const getCategoryBadge = () => {
    switch (category) {
      case "urgent":
        return (
          <Badge className="bg-destructive/10 text-destructive border-0 hover:bg-destructive/10">
            <AlertCircle className="w-3 h-3 mr-1" />
            Urgente
          </Badge>
        );
      case "event":
        return (
          <Badge className="bg-[#A78BFA]/10 text-[#A78BFA] border-0 hover:bg-[#A78BFA]/10">
            <Calendar className="w-3 h-3 mr-1" />
            Evento
          </Badge>
        );
      case "maintenance":
        return (
          <Badge className="bg-[#FDB462]/10 text-[#FDB462] border-0 hover:bg-[#FDB462]/10">
            <Wrench className="w-3 h-3 mr-1" />
            Mantenimiento
          </Badge>
        );
      case "help":
        return (
          <Badge className="bg-accent/10 text-accent border-0 hover:bg-accent/10">
            <HelpCircle className="w-3 h-3 mr-1" />
            Ayuda
          </Badge>
        );
      default:
        return (
          <Badge className="bg-muted text-muted-foreground border-0 hover:bg-muted">
            <MessageCircle className="w-3 h-3 mr-1" />
            General
          </Badge>
        );
    }
  };

  return (
    <div className="bg-card rounded-2xl overflow-hidden shadow-sm border border-border hover:shadow-md transition-shadow">
      {hasImage && (
        <div className="relative h-48 bg-gradient-to-br from-secondary to-muted overflow-hidden">
          {imageType === "maintenance" && (
            <div className="w-full h-full flex items-center justify-center">
              <Wrench className="w-20 h-20 text-muted-foreground" />
            </div>
          )}
          {imageType === "meeting" && (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-accent/5 to-accent/10">
              <Calendar className="w-20 h-20 text-accent" />
            </div>
          )}
          <div className="absolute top-3 right-3">{getCategoryBadge()}</div>
        </div>
      )}
      <div className="p-4">
        {!hasImage && <div className="mb-3">{getCategoryBadge()}</div>}
        <h3 className="font-bold text-card-foreground text-lg mb-2 line-clamp-2">{title}</h3>
        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{description}</p>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            <span>{time}</span>
          </div>
          <span className="font-medium">{author}</span>
        </div>
      </div>
    </div>
  );
}