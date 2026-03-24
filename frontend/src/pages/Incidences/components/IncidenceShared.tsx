import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "../../../components/ui/popover";

export interface ConfigOption {
  label: string;
  [key: string]: any; 
}

export interface BaseIncidence {
  id: number;
  title: string;
  description?: string;
  img?: string;
  student_name?: string;
  room_number?: {
    id: number;
    numero: string;
    planta?: number;
    edificio?: string;
    tipo?: string;
  };
  location_type: string;
  status: any;
  priority: 'low' | 'high';
  created_at: string;
  assigned_staff?: number;
  assigned_staff_name?: string;
  assigned_external_name?: string;
  is_mine?: boolean; 
  updates?: { id: number; author_name?: string; created_at: string; text: string }[];
}

export const LOCATION_LABELS: Record<string, string> = { 
  habitacion: 'Habitación', baño: 'Baño Común', cocina: 'Cocina', 
  comedor: 'Comedor', exterior: 'Zonas Exteriores', salas_comunes: 'Salas Comunes' 
};

export const PRIORITY_LABELS: Record<string, string> = { low: 'Baja', high: 'Urgente' };

export const STATUS_CONFIG: Record<string, { label: string, student: any, admin: any }> = {
  pending: { 
    label: "Pendiente", 
    student: { colorClass: "bg-[#FFF4E5] text-[#FFB457]", barClass: "bg-[#FFB457]" },
    admin: { bg: 'bg-slate-100', text: 'text-slate-600' }
  },
  reviewing: { 
    label: "En revisión", 
    student: { colorClass: "bg-[#E5F1FF] text-[#0061A7]", barClass: "bg-[#0061A7]" },
    admin: { bg: 'bg-orange-100', text: 'text-orange-600' }
  },
  in_progress: { 
    label: "En proceso", 
    student: { colorClass: "bg-[#E0F7FA] text-[#00ACC1]", barClass: "bg-[#00ACC1]" },
    admin: { bg: 'bg-blue-100', text: 'text-blue-600' }
  },
  resolved: { 
    label: "Resuelto", 
    student: { colorClass: "bg-primary/10 text-primary", barClass: "bg-primary" },
    admin: { bg: 'bg-primary/10', text: 'text-primary' }
  }
};

export const formatUpdateText = (text: string) => {
  if (!text) return '';
  let out = text.replace(/Nota:\s*/i, '');
  Object.keys(STATUS_CONFIG).forEach((key) => { 
    const re = new RegExp(String.raw`\b${key}\b`, 'g');
    out = out.replace(re, STATUS_CONFIG[key].label); 
  });
  return out.trim();
};

export const formatNotificationTime = (value: string) => {
  const createdAt = new Date(value);
  const diff = Math.max(0, Math.round((Date.now() - createdAt.getTime()) / 60000));
  if (diff < 1) return "Ahora";
  if (diff < 60) return `Hace ${diff} min`;
  const hours = Math.round(diff / 60);
  return hours < 24 ? `Hace ${hours} h` : createdAt.toLocaleDateString();
};

export const getLastReadNotificationsAt = () => {
  if (typeof window === "undefined") return 0;
  const stored = window.localStorage.getItem("incidences-notifications-last-read");
  return stored ? Date.parse(stored) : 0;
};

export const saveLastReadNotificationsAt = (timestamp?: string) => {
  if (typeof window === "undefined" || !timestamp) return;
  window.localStorage.setItem("incidences-notifications-last-read", timestamp);
};

export const applyIncidenceFilters = (inc: any, filters: any) => {
  const { search, location, status, priority } = filters;
  const q = search.trim().toLowerCase();
  if (q && !(inc.title?.toLowerCase().includes(q) || inc.room_number?.toLowerCase().includes(q) || (inc.student_name || '').toLowerCase().includes(q))) return false;
  if (location !== 'all' && inc.location_type !== location) return false;
  if (status !== 'all' && inc.status !== status) return false;
  if (priority !== 'all' && inc.priority !== priority) return false;
  return true;
};

export const COMMON_UI_CLASSES = {
  mainLayout: "flex flex-col h-screen bg-background overflow-hidden",
  header: "bg-primary p-6 pt-12 flex justify-between items-center shrink-0 shadow-lg",
  headerTitle: "text-primary-foreground text-2xl font-bold",
  mainContent: "flex-1 overflow-y-auto p-4 md:p-6 pb-32 w-full",
  filterGrid: "grid grid-cols-2 md:grid-cols-4 gap-3 bg-white p-4 rounded-xl shadow-sm",
  filterInput: "w-full px-5 py-2 rounded-2xl border border-slate-200 bg-white text-sm focus:ring-2 focus:ring-primary/20 outline-none",
  btnMineWrapper: "flex justify-end mb-6",
  btnMineBase: "flex items-center gap-2 px-6 py-3 rounded-full text-xs font-bold transition-all border shadow-sm",
  btnMineActive: "bg-primary text-primary-foreground",
  btnMineInactive: "bg-white text-primary border-primary/20",
  incidencesGrid: "grid gap-3",
  card: "flex border-0 shadow-sm rounded-2xl bg-white overflow-hidden hover:shadow-md transition-shadow",
  cardSideBar: "w-1 shrink-0",
  cardTitle: "text-sm font-bold text-slate-800 truncate",
  statusBadge: "px-2 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap",
  cardLocationRow: "flex items-center gap-2 mt-2",
  btnNotes: "bg-primary/10 h-8 px-4 rounded-xl text-primary border-primary/20 border-2 font-bold text-[10px] uppercase hover:bg-primary hover:text-primary-foreground transition-all",
  loadingText: "text-center text-slate-400 mt-20 text-sm font-bold animate-pulse",
  bellContainer: "relative p-2 bg-white/10 rounded-full text-white hover:text-white transition-colors hover:bg-white/20",
  bellBadge: "absolute -right-1 -top-1 min-w-5 h-5 flex items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground ring-2 ring-background",
  dialogNotes: "max-w-[95vw] sm:max-w-[500px] rounded-[30px] p-0 border-none overflow-hidden shadow-2xl",
  notesTitle: "p-5 bg-white border-b border-slate-50 font-bold text-primary text-[11px] text-center uppercase tracking-widest",
  btnFloating: "fixed bottom-24 right-8 w-16 h-16 bg-primary hover:bg-primary/90 text-primary-foreground rounded-full shadow-2xl flex items-center justify-center z-50 transition-transform active:scale-90",
  actionBtn: "p-2 rounded-full transition-colors hover:bg-slate-100",
  deleteBtn: "text-red-500 hover:bg-red-50",
  editBtn: "text-blue-500 hover:bg-blue-50"
};

export const IncidenceSelect = ({ value, onChange, options, placeholder, className = "" }: any) => {
  const [open, setOpen] = useState(false);
  const getLabel = () => {
    if (!value || value === 'all' || !options[value]) return placeholder;
    const option = options[value];
    return (option && typeof option === 'object') ? (option as ConfigOption).label : String(option);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" className={`flex items-center justify-between w-full px-4 h-[50px] bg-white border border-slate-200 rounded-2xl text-sm font-medium transition-all outline-none focus:ring-2 focus:ring-primary/10 hover:border-primary ${className}`}>
          <span className={!value || value === 'all' ? 'text-slate-400' : 'text-slate-700'}>{getLabel()}</span>
          <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${open ? 'rotate-90' : 'rotate-0'}`} />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[--radix-popover-trigger-width] p-1 bg-white border-none rounded-2xl shadow-xl z-[100]">
        <div className="max-h-60 overflow-y-auto">
          <button type="button" onClick={() => { onChange('all'); setOpen(false); }} className="w-full text-left px-3 py-2 text-sm rounded-xl hover:bg-primary/10 hover:text-primary font-bold text-slate-400 border-b mb-1">Todas</button>
          {Object.entries(options).map(([key, val]) => (
            <button key={key} type="button" onClick={() => { onChange(key); setOpen(false); }} className={`w-full text-left px-3 py-2 text-sm rounded-xl mb-0.5 ${value === key ? 'bg-primary text-primary-foreground' : 'hover:bg-primary/10 text-slate-700'}`}>
              {(val && typeof val === 'object') ? (val as ConfigOption).label : String(val)}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};