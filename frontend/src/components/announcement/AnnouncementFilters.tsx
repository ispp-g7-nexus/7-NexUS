import { AlertCircle, Calendar, Wrench, MessageCircle } from "lucide-react";

interface FilterOption {
  id: string;
  label: string;
  icon?: React.ReactNode;
}

interface AnnouncementFiltersProps {
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  categories?: FilterOption[];
}

const defaultCategories: FilterOption[] = [
  { id: "all", label: "Todos" },
  { id: "URGENT", label: "Urgente", icon: <AlertCircle className="w-3.5 h-3.5" /> },
  { id: "MAINTENANCE", label: "Mantenimiento", icon: <Wrench className="w-3.5 h-3.5" /> },
  { id: "EVENT", label: "Evento", icon: <Calendar className="w-3.5 h-3.5" /> },
  { id: "GENERAL", label: "General", icon: <MessageCircle className="w-3.5 h-3.5" /> },
];

export function AnnouncementFilters({
  selectedCategory,
  onCategoryChange,
  categories = defaultCategories
}: AnnouncementFiltersProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
      {categories.map((cat) => (
        <button
          key={cat.id}
          onClick={() => onCategoryChange(cat.id)}
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
  );
}