import { useState, useEffect } from "react";
import { Clock, CheckCircle2, Plus, Bell, MapPin, MessageSquare, X } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Card, CardContent } from "../../../components/ui/card";
import { Dialog, DialogContent, DialogTitle } from "../../../components/ui/dialog";
import { IncidenceService, Incidence } from "../../../services/incidences";
import { IncidenceForm } from "./IncidenceForm";
import "../Incidences.css";

export default function StudentIncidences() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [incidences, setIncidences] = useState<Incidence[]>([]);
  const [selectedDetails, setSelectedDetails] = useState<any>(null);
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Filtros
  const [search, setSearch] = useState('');
  const [filterLocation, setFilterLocation] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');

  const loadIncidences = async () => {
    try {
      setLoading(true);
      const data = await IncidenceService.getAll();
      setIncidences(data);
    } catch (error) {
      console.error("Error cargando incidencias:", error);
    } finally {
      setLoading(false);
    }
  };

  const openNotes = async (incId: number) => {
    try {
      const data = await IncidenceService.getById(incId);
      setSelectedDetails(data);
      setIsNotesOpen(true);
    } catch (error) {
      console.error('Error cargando detalles:', error);
    }
  };

  useEffect(() => { loadIncidences(); }, []);

  const filteredIncidences = incidences.filter((inc) => {
    const q = search.trim().toLowerCase();
    if (q && !(inc.title?.toLowerCase().includes(q) || inc.room_number?.toLowerCase().includes(q))) return false;
    if (filterLocation !== 'all' && inc.location_type !== filterLocation) return false;
    if (filterStatus !== 'all' && inc.status !== filterStatus) return false;
    if (filterPriority !== 'all' && inc.priority !== filterPriority) return false;
    return true;
  });

  return (
    <div className={UI_CLASSES.mainLayout}>
      {/* Header Estilo Alumno */}
      <header className={UI_CLASSES.header}>
        <h1 className={UI_CLASSES.headerTitle}>Incidencias</h1>
        <div className={UI_CLASSES.bellContainer}>
          <div className={UI_CLASSES.bellDot}></div>
          <Bell className="w-6 h-6 text-white" />
        </div>
      </header>

      <main className={UI_CLASSES.mainContent}>
        {/* Barra de Filtros */}
        <div className={UI_CLASSES.filterGrid}>
          <div className="relative col-span-1 sm:col-span-2">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por título, persona o lugar..."
              className={UI_CLASSES.filterInput}
            />
          </div>
          <select value={filterLocation} onChange={(e) => setFilterLocation(e.target.value)} className={UI_CLASSES.filterSelect}>
            <option value="all">Todas las áreas</option>
            {Object.entries(LOCATION_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className={UI_CLASSES.filterSelect}>
            <option value="all">Todos los estados</option>
            {Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)} className={UI_CLASSES.filterSelect}>
            <option value="all">Todas las prioridades</option>
            <option value="low">BAJA</option>
            <option value="high">URGENTE</option>
          </select>
        </div>

        {loading ? (
          <p className={UI_CLASSES.loadingText}>Cargando reportes...</p>
        ) : filteredIncidences.length === 0 ? (
          <div className={UI_CLASSES.emptyState}>
            <CheckCircle2 className="w-12 h-12 mx-auto mb-2 opacity-20" />
            <p className="text-sm">No tienes incidencias activas</p>
          </div>
        ) : (
          filteredIncidences.map((inc) => {
            const currentStatus = STATUS_MAP[inc.status] || STATUS_MAP.pending;
            return (
              <Card key={inc.id} className={UI_CLASSES.card}>
                <CardContent className="p-0 flex">
                  <div className={`${UI_CLASSES.cardSideBar} ${currentStatus.barClass}`} />
                  <div className="p-5 flex-1">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className={UI_CLASSES.cardTitle}>{inc.title}</h3>
                      <span className={`${UI_CLASSES.statusBadge} ${currentStatus.colorClass}`}>
                        {currentStatus.label}
                      </span>
                    </div>

                    <div className={UI_CLASSES.cardLocationRow}>
                      <MapPin size={14} strokeWidth={2.5} className="text-slate-400" />
                      <span className="text-sm font-medium">
                        {LOCATION_LABELS[inc.location_type] || inc.location_type}
                        {inc.location_type === 'habitacion' && inc.room_number ? ` • Planta ${inc.room_number.charAt(0)}` : ''}
                      </span>
                    </div>

                    <div className={UI_CLASSES.cardDateRow}>
                      <Clock className="w-3.5 h-3.5" />
                      <span>{new Date(inc.created_at).toLocaleDateString()}</span>
                    </div>
                    
                    <div className="flex justify-end">
                      <Button
                        variant="outline"
                        onClick={() => openNotes(inc.id)}
                        className={UI_CLASSES.btnNotes}
                      >
                        Ver notas
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </main>

      {/* Botón Flotante */}
      <button onClick={() => setIsFormOpen(true)} className={UI_CLASSES.btnFloating}>
        <Plus className="w-8 h-8" strokeWidth={3} />
      </button>

      {/* Dialog Formulario */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className={UI_CLASSES.dialogForm}>
          <DialogTitle className="sr-only">Nueva Incidencia</DialogTitle>
          <IncidenceForm
            onSuccess={() => { loadIncidences(); setIsFormOpen(false); }}
            onClose={() => setIsFormOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Dialog Notas */}
      <Dialog open={isNotesOpen} onOpenChange={(open) => { if (!open) { setIsNotesOpen(false); setSelectedDetails(null);} }}>
        <DialogContent className={UI_CLASSES.dialogNotes}>
          <DialogTitle className={UI_CLASSES.notesTitle}>Notas de la incidencia</DialogTitle>
          <div className="p-6 bg-white">
            {selectedDetails ? (
              <div>
                <h3 className="font-bold text-lg mb-2">{selectedDetails.title}</h3>
                <p className="text-sm text-slate-500 italic mb-4 font-normal">"{selectedDetails.description}"</p>

                {selectedDetails.admin_notes && (
                  <div className={UI_CLASSES.adminNoteBox}>
                    <div className={UI_CLASSES.adminNoteLabel}>Nota del admin</div>
                    <div className="text-emerald-700 font-normal">{selectedDetails.admin_notes}</div>
                  </div>
                )}

                <div className="mt-4">
                  <div className={UI_CLASSES.historyLabel}>Historial de actualizaciones</div>
                  {selectedDetails.updates && selectedDetails.updates.length > 0 ? (
                    <ul className="space-y-3">
                      {selectedDetails.updates.map((u: any) => (
                        <li key={u.id} className={UI_CLASSES.historyItem}>
                          <div className="text-[10px] text-slate-400 mb-1 font-bold uppercase">
                            {u.author_name || 'Sistema'} • {new Date(u.created_at).toLocaleString()}
                          </div>
                          <div className="text-sm text-slate-700 font-normal">{formatUpdateText(u.text)}</div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-slate-400 font-normal">No hay actualizaciones aún.</p>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-400">Cargando...</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// --- UTILS & HELPERS ---
const formatUpdateText = (text: string) => {
  if (!text) return '';
  let out = text.replace(/Nota:\s*/i, '');
  const statusTranslations: Record<string, string> = {
    pending: 'Pendiente',
    reviewing: 'En revisión',
    in_progress: 'En proceso',
    resolved: 'Resuelto',
  };
  Object.keys(statusTranslations).forEach((key) => {
    const re = new RegExp(`\\b${key}\\b`, 'g');
    out = out.replace(re, statusTranslations[key]);
  });
  return out.replace(/\s+\./g, '.').trim();
};

// --- CONFIGURACIÓN ---
const LOCATION_LABELS: Record<string, string> = {
  habitacion: 'Habitación',
  baño: 'Baño Común',
  cocina: 'Cocina',
  zonas_comunes: 'Zonas Comunes',
};

const STATUS_MAP: Record<string, { label: string; colorClass: string; barClass: string }> = {
  pending: { label: "Pendiente", colorClass: "bg-[#FFF4E5] text-[#FFB457]", barClass: "bg-[#FFB457]" },
  reviewing: { label: "En revisión", colorClass: "bg-[#E5F1FF] text-[#0061A7]", barClass: "bg-[#0061A7]" },
  in_progress: { label: "En proceso", colorClass: "bg-[#E0F7FA] text-[#00ACC1]", barClass: "bg-[#00ACC1]" },
  resolved: { label: "Resuelto", colorClass: "bg-[#F0F9EB] text-[#82D14C]", barClass: "bg-[#82D14C]" },
};

const UI_CLASSES = {
  mainLayout: "flex flex-col h-screen bg-[#F6F7F9] relative",
  header: "bg-[#1B4D1C] p-6 pt-12 flex justify-between items-center shrink-0 shadow-lg",
  headerTitle: "text-white text-2xl font-bold",
  bellContainer: "relative p-2 bg-white/10 rounded-full",
  bellDot: "absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-[#1B4D1C]",
  mainContent: "flex-1 overflow-y-auto p-4 space-y-4 pb-32",
  
  // Filtros
  filterGrid: "mb-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3",
  filterInput: "w-full pl-3 pr-3 py-2 rounded-xl border border-slate-200 shadow-sm font-normal outline-none focus:ring-2 focus:ring-[#82D14C]",
  filterSelect: "w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-normal outline-none",
  
  // Tarjetas
  card: "border-none shadow-sm rounded-[24px] overflow-hidden bg-white",
  cardSideBar: "w-1.5",
  cardTitle: "font-bold text-lg text-[#1A1C1E]",
  cardLocationRow: "flex items-center gap-1.5 text-slate-500 mb-4",
  cardDateRow: "flex items-center gap-2 opacity-60 text-[#74777F] text-xs font-normal",
  statusBadge: "text-[10px] px-2 py-0.5 rounded-full font-bold uppercase",
  
  // Botones
  btnNotes: "rounded-xl border-[#D1E4FF] text-[#0061A7] hover:bg-[#D1E4FF]/20 h-8 px-4 text-xs font-bold transition-colors",
  btnFloating: "fixed bottom-24 right-6 w-14 h-14 bg-[#82D14C] hover:bg-[#74bc44] text-white rounded-full shadow-2xl flex items-center justify-center z-50 transition-transform active:scale-90",
  
  // Dialogs
  dialogForm: "max-w-[90vw] sm:max-w-[425px] rounded-[32px] p-0 border-none overflow-hidden",
  dialogNotes: "max-w-[90vw] sm:max-w-[640px] rounded-[24px] p-0 border-none overflow-hidden",
  notesTitle: "p-6 bg-white border-b font-bold text-slate-800",
  
  // Contenido Notas
  adminNoteBox: "mb-4 p-4 bg-emerald-50 rounded-xl",
  adminNoteLabel: "text-[10px] font-black uppercase text-emerald-600 mb-1",
  historyLabel: "text-[10px] font-black uppercase text-slate-400 mb-3 tracking-widest",
  historyItem: "p-3 border border-slate-100 rounded-xl bg-slate-50",
  
  // Utils
  loadingText: "text-center text-gray-400 mt-10 text-sm font-normal",
  emptyState: "text-center py-20 text-gray-400"
};