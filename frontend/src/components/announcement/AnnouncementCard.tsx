import { Calendar, AlertCircle, Wrench, MessageCircle, Edit2, Trash2 } from "lucide-react";
import { Badge } from "../ui/badge";
import { AnnouncementCategory, AnnouncementList } from "../../types/announcement.types";

interface AnnouncementCardProps {
  announcement: AnnouncementList;
  onClick?: () => void;
  showControls?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
}

const categoryConfig: Record<AnnouncementCategory, { icon: React.ComponentType<{ className?: string }>; label: string; color: "destructive" | "warning" | "info" | "outline" }> = {
  URGENT: { icon: AlertCircle, label: "Urgente", color: "destructive" },
  MAINTENANCE: { icon: Wrench, label: "Mantenimiento", color: "warning" },
  EVENT: { icon: Calendar, label: "Evento", color: "info" },
  GENERAL: { icon: MessageCircle, label: "General", color: "outline" },
};

export function AnnouncementCard({
  announcement,
  onClick,
  showControls = false,
  onEdit,
  onDelete
}: AnnouncementCardProps) {
  const config = categoryConfig[announcement.category];
  const Icon = config.icon;

  const handleClick = () => {
    if (onClick) onClick();
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onEdit) onEdit();
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) onDelete();
  };

  return (
    <div
      onClick={handleClick}
      className={`h-full rounded-2xl overflow-hidden shadow-sm border hover:shadow-md transition-all cursor-pointer ${
        announcement.has_passed ? 'bg-slate-100 border-slate-300' : 'bg-card border-emerald-200'
      } ${
        announcement.has_passed ? 'opacity-60' : ''
      }`}
    >
      <div className="p-3 md:p-4 h-full">
        <div className="flex items-start justify-between gap-3 h-full">
          <div className="flex-1 min-w-0 flex flex-col h-full">
            <div className="flex items-center gap-2 mb-2">
              <Badge
                variant={config.color}
                className={`gap-1 ${announcement.category === "GENERAL" ? "bg-slate-200 text-slate-700 border border-slate-300" : ""} ${announcement.category === "MAINTENANCE" ? "bg-orange-100 text-orange-800" : ""}`}
              >
                <Icon className="w-3 h-3" />
                {config.label}
              </Badge>
              {announcement.featured && (
                <Badge variant="default" className="bg-yellow-100 text-yellow-800">
                  ⭐ Destacado
                </Badge>
              )}
            </div>
            <h3 className="font-bold text-card-foreground text-base md:text-lg mb-1.5 line-clamp-2">
              {announcement.title}
            </h3>
            <p className="text-sm text-muted-foreground mb-2.5">
              {announcement.description}
            </p>
            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-auto pt-2">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {new Date(announcement.announcement_date).toLocaleDateString('es-ES', { 
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric'
                })}
              </span>
            </div>
          </div>
          
          {showControls && (
            <div className="flex gap-1">
              <button
                onClick={handleEdit}
                className="p-2 text-gray-600 hover:text-green-800 rounded-lg hover:bg-green-100 transition-colors duration-200"
                aria-label="Editar aviso"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                onClick={handleDelete}
                className="p-2 text-red-600 hover:text-red-700 rounded-lg hover:bg-red-50 transition-colors duration-200"
                aria-label="Eliminar aviso"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}