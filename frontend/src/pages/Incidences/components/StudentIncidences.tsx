import { useState, useEffect } from "react";
import { 
 Clock, CheckCircle2, Plus, Bell, 
} from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Card, CardContent } from "../../../components/ui/card";
import { Dialog, DialogContent, DialogTitle } from "../../../components/ui/dialog";
import { fetchWithAuth, API_URL_INCIDENCES } from "../../../utils/api";
import { IncidenceForm } from "./IncidenceForm";
import "../Incidences.css";

export default function StudentIncidences() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [incidences, setIncidences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterLocation, setFilterLocation] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');

  const loadIncidences = async () => {
    try {
      const response = await fetchWithAuth(API_URL_INCIDENCES);
      if (response.ok) {
        const data = await response.json();
        setIncidences(data);
      }
    } catch (error) {
      console.error("Error cargando incidencias:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadIncidences(); }, []);

  return (
    <div className="flex flex-col h-screen bg-[#F6F7F9] relative">
      <header className="bg-[#1B4D1C] p-6 pt-12 flex justify-between items-center shrink-0 shadow-lg">
        <h1 className="text-white text-2xl font-bold">Incidencias</h1>
        <div className="relative p-2 bg-white/10 rounded-full">
          <div className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-[#1B4D1C]"></div>
          <Bell className="w-6 h-6 text-white" />
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 space-y-4 pb-32">

        <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative col-span-1 sm:col-span-2">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por título, persona o lugar..."
              className="w-full pl-3 pr-3 py-2 rounded-xl border border-slate-200 shadow-sm"
            />
          </div>
          <div>
            <select value={filterLocation} onChange={(e) => setFilterLocation(e.target.value)} className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-200 bg-white">
              <option value="all">Todas las áreas</option>
              <option value="habitacion">Habitación</option>
              <option value="baño">Baño Común</option>
              <option value="cocina">Cocina</option>
              <option value="zonas_comunes">Zonas Comunes</option>
            </select>
          </div>
          <div>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-200 bg-white">
              <option value="all">Todos los estados</option>
              <option value="pending">Pendiente</option>
              <option value="reviewing">En revisión</option>
              <option value="in_progress">En proceso</option>
              <option value="resolved">Resuelto</option>
            </select>
          </div>
          <div>
            <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)} className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-200 bg-white">
              <option value="all">Todas las prioridades</option>
              <option value="low">BAJA</option>
              <option value="medium">MEDIA</option>
              <option value="high">ALTA</option>
            </select>
          </div>
        </div>
        {loading ? (
          <p className="text-center text-gray-400 mt-10 text-sm">Cargando reportes...</p>
        ) : incidences.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <CheckCircle2 className="w-12 h-12 mx-auto mb-2 opacity-20" />
            <p className="text-sm">No tienes incidencias activas</p>
          </div>
        ) : (
          incidences
            .filter((inc: any) => {
              const q = search.trim().toLowerCase();
              if (q) {
                const inTitle = inc.title?.toLowerCase().includes(q);
                const inRoom = inc.room_number?.toLowerCase().includes(q);
                if (!inTitle && !inRoom) return false;
              }
              if (filterLocation !== 'all' && inc.location_type !== filterLocation) return false;
              if (filterStatus !== 'all' && inc.status !== filterStatus) return false;
              if (filterPriority !== 'all' && inc.priority !== filterPriority) return false;
              return true;
            })
            .map((inc: any) => (
            <Card key={inc.id} className="border-none shadow-sm rounded-[24px] overflow-hidden bg-white">
              <CardContent className="p-0 flex">
                <div className={`w-1.5 ${inc.status === 'resolved' ? 'bg-[#82D14C]' : 'bg-[#FFB457]'}`} />
                <div className="p-5 flex-1">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-lg text-[#1A1C1E]">{inc.title}</h3>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                      inc.status === 'resolved' ? 'bg-[#F0F9EB] text-[#82D14C]' : 'bg-[#FFF4E5] text-[#FFB457]'
                    }`}>
                      {inc.status_label || "Pendiente"}
                    </span>
                  </div>
                  <div className="space-y-1 text-[#74777F] mb-4 text-xs">
                    <div className="flex items-center gap-2 opacity-60"><Clock className="w-3.5 h-3.5" />{new Date(inc.created_at).toLocaleDateString()}</div>
                  </div>
                  <div className="flex justify-end">
                    <Button 
                      variant="outline" 
                      className="rounded-xl border-[#D1E4FF] text-[#0061A7] hover:bg-[#D1E4FF]/20 h-8 px-4 text-xs font-bold"
                    >
                      Ver notas
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </main>

      <button 
        onClick={() => setIsFormOpen(true)}
        className="fixed bottom-24 right-6 w-14 h-14 bg-[#82D14C] hover:bg-[#74bc44] text-white rounded-full shadow-2xl flex items-center justify-center z-50 transition-transform active:scale-90"
      >
        <Plus className="w-8 h-8" strokeWidth={3} />
      </button>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-[90vw] sm:max-w-[425px] rounded-[32px] p-0 border-none overflow-hidden">
          <DialogTitle className="sr-only">Nueva Incidencia</DialogTitle>
          <IncidenceForm 
            onSuccess={() => {
              loadIncidences();
              setIsFormOpen(false);
            }} 
            onClose={() => setIsFormOpen(false)}
          />
        </DialogContent>
      </Dialog>

    </div>
  );
}