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
  room_number?: string;
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
    student: { colorClass: "bg-[#F0F9EB] text-[#82D14C]", barClass: "bg-[#82D14C]" },
    admin: { bg: 'bg-green-100', text: 'text-green-600' }
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
  mainLayout: "flex flex-col w-full bg-[#F6F7F9]",
  header: "bg-[#1B4D1C] p-6 pt-12 flex justify-between items-center shrink-0 shadow-lg sticky top-0 z-20",
  headerTitle: "text-white text-2xl font-bold",
  mainContent: "w-full px-4 py-6 pb-32",
  filterGrid: "grid grid-cols-2 md:grid-cols-4 gap-3 bg-white p-4 rounded-xl shadow-sm",
  filterInput: "w-full px-5 py-2 rounded-2xl border border-slate-200 bg-white text-sm focus:ring-2 focus:ring-[#82D14C]/20 outline-none",
  btnMineWrapper: "flex justify-center",
  btnMineBase: "flex items-center gap-2 px-4 py-2 rounded-2xl font-medium transition-all duration-200",
  btnMineActive: "bg-[#82D14C] text-white",
  btnMineInactive: "bg-white border border-slate-200 text-slate-600 hover:border-[#82D14C]",
  incidencesGrid: "grid gap-3",
  card: "flex border-0 shadow-sm rounded-2xl bg-white overflow-hidden hover:shadow-md transition-shadow",
  cardSideBar: "w-1 shrink-0",
  cardTitle: "text-sm font-bold text-slate-800 truncate",
  statusBadge: "px-2 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap",
  cardLocationRow: "flex items-center gap-2 mt-2",
  btnNotes: "text-[10px] font-bold h-7 px-3",
  loadingText: "text-center text-slate-400 mt-20 text-sm font-bold animate-pulse",
  bellContainer: "relative p-2 bg-white/10 rounded-full text-white hover:text-white transition-colors hover:bg-white/20",
  bellBadge: "absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-[#1B4D1C] text-[10px] font-bold flex items-center justify-center text-white",
  dialogNotes: "max-w-[95vw] sm:max-w-[500px] rounded-[30px] p-0 border-none overflow-hidden shadow-2xl",
  notesTitle: "p-5 bg-white border-b border-slate-50 font-bold text-[#1B4D1C] text-[11px] text-center uppercase tracking-widest",
  btnFloating: "fixed bottom-24 right-8 w-16 h-16 bg-[#82D14C] hover:bg-[#74bc44] text-white rounded-full shadow-2xl flex items-center justify-center z-50 transition-transform active:scale-90",
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
        <button type="button" className={`flex items-center justify-between w-full px-4 h-[50px] bg-white border border-slate-200 rounded-2xl text-sm font-medium transition-all outline-none focus:ring-2 focus:ring-[#82D14C]/10 hover:border-[#82D14C] ${className}`}>
          <span className={!value || value === 'all' ? 'text-slate-400' : 'text-slate-700'}>{getLabel()}</span>
          <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${open ? 'rotate-90' : 'rotate-0'}`} />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[--radix-popover-trigger-width] p-1 bg-white border-none rounded-2xl shadow-xl z-[100]">
        <div className="max-h-60 overflow-y-auto">
          <button type="button" onClick={() => { onChange('all'); setOpen(false); }} className="w-full text-left px-3 py-2 text-sm rounded-xl hover:bg-[#EEF8E7] hover:text-[#1B4D1C] font-bold text-slate-400 border-b mb-1">Todas</button>
          {Object.entries(options).map(([key, val]) => (
            <button key={key} type="button" onClick={() => { onChange(key); setOpen(false); }} className={`w-full text-left px-3 py-2 text-sm rounded-xl mb-0.5 ${value === key ? 'bg-[#82D14C] text-white' : 'hover:bg-[#EEF8E7] text-slate-700'}`}>
              {(val && typeof val === 'object') ? (val as ConfigOption).label : String(val)}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};