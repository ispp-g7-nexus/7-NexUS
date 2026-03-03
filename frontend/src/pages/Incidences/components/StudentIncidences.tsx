import { useState, useEffect } from "react";
import { 
  FileText, MapPin, Clock, CheckCircle2, Plus, Bell, Home, Calendar, Users, MessageSquare 
} from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Card, CardContent } from "../../../components/ui/card";
import { Dialog, DialogContent, DialogTitle } from "../../../components/ui/dialog";
import { fetchWithAuth, API_URL_INCIDENCES } from "../../../utils/api";
//import { NavItem } from "../../../components/NavItem"; 
import { IncidenceForm } from "./IncidenceForm";
//import { AdminNotesModal } from "./AdminNotesModal";
import "../Incidences.css";

export default function StudentIncidences() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedNotes, setSelectedNotes] = useState<string | null>(null);
  const [incidences, setIncidences] = useState([]);
  const [loading, setLoading] = useState(true);

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
      {/* HEADER */}
      <header className="bg-[#1B4D1C] p-6 pt-12 flex justify-between items-center shrink-0 shadow-lg">
        <h1 className="text-white text-2xl font-bold">Incidencias</h1>
        <div className="relative p-2 bg-white/10 rounded-full">
          <div className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-[#1B4D1C]"></div>
          <Bell className="w-6 h-6 text-white" />
        </div>
      </header>

      {/* LISTA DE TARJETAS */}
      <main className="flex-1 overflow-y-auto p-4 space-y-4 pb-32">
        {loading ? (
          <p className="text-center text-gray-400 mt-10 text-sm">Cargando reportes...</p>
        ) : incidences.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <CheckCircle2 className="w-12 h-12 mx-auto mb-2 opacity-20" />
            <p className="text-sm">No tienes incidencias activas</p>
          </div>
        ) : (
          incidences.map((inc: any) => (
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
                      onClick={() => setSelectedNotes(inc.admin_notes)}
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

      {/* BOTÓN FLOTANTE (FAB) */}
      <button 
        onClick={() => setIsFormOpen(true)}
        className="fixed bottom-24 right-6 w-14 h-14 bg-[#82D14C] hover:bg-[#74bc44] text-white rounded-full shadow-2xl flex items-center justify-center z-50 transition-transform active:scale-90"
      >
        <Plus className="w-8 h-8" strokeWidth={3} />
      </button>

      {/* MODAL DEL FORMULARIO */}
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

      {/* MODAL DE NOTAS 
      <AdminNotesModal 
        isOpen={!!selectedNotes} 
        onClose={() => setSelectedNotes(null)} 
        notes={selectedNotes || ""} 
      />*/}
    </div>
  );
}