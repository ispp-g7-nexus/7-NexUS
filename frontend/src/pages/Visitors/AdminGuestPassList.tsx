import { UserCheck, RefreshCw, Search, Calendar, User, Hash, Clock, MessageSquare } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import { type AdminGuestPass, GuestPassApiError, listAdminGuestPasses } from "../../services/guestPasses";

const STATUS_OPTIONS = [
  { value: "", label: "Todos los estados" },
  { value: "ACTIVE", label: "Activos" },
  { value: "USED", label: "Usados" },
  { value: "CANCELLED", label: "Cancelados" },
  { value: "REVOKED", label: "Revocados" },
  { value: "REJECTED", label: "Rechazados" },
  { value: "INACTIVE", label: "Inactivos" },
];

const SORT_OPTIONS = [
  { value: "date_desc", label: "Fecha: Recientes primero" },
  { value: "date_asc", label: "Fecha: Antiguos primero" },
  { value: "name_asc", label: "Nombre: A-Z" },
  { value: "name_desc", label: "Nombre: Z-A" },
];

const STATUS_BADGE: Record<string, string> = {
  ACTIVE:    "bg-green-100 text-green-700 border-0",
  USED:      "bg-blue-100 text-blue-700 border-0",
  CANCELLED: "bg-gray-100 text-gray-500 border-0",
  REVOKED:   "bg-red-100 text-red-700 border-0",
  REJECTED:  "bg-orange-100 text-orange-700 border-0",
  INACTIVE:  "bg-yellow-100 text-yellow-700 border-0",
};

const STATUS_LABEL: Record<string, string> = {
  ACTIVE:    "Activo",
  USED:      "Usado",
  CANCELLED: "Cancelado",
  REVOKED:   "Revocado",
  REJECTED:  "Rechazado",
  INACTIVE:  "Inactivo",
};

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface GuestPassDetailDialogProps {
  readonly pass: AdminGuestPass | null;
  readonly onClose: () => void;
}

function GuestPassDetailDialog({ pass, onClose }: GuestPassDetailDialogProps) {
  return (
    <Dialog open={pass !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-md">
        {pass && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 flex-wrap text-xl">
                {pass.full_name}
                <Badge className={STATUS_BADGE[pass.status ?? ""] ?? "border-0"}>
                  {STATUS_LABEL[pass.status ?? ""] ?? pass.status}
                </Badge>
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="flex items-center gap-3">
                <Hash className="w-4 h-4 text-gray-500 shrink-0" />
                <div>
                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Código de pase</p>
                  <p className="font-mono font-bold text-blue-600">{pass.pass_code}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <User className="w-4 h-4 text-gray-500 shrink-0" />
                <div>
                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Registrado por</p>
                  <p className="font-semibold">{pass.resident_name}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4 text-gray-500 shrink-0" />
                <div>
                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Período de validez</p>
                  <p className="text-sm font-medium">{formatDateTime(pass.valid_from)}</p>
                  <p className="text-sm font-medium text-gray-500">{formatDateTime(pass.valid_until)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="w-4 h-4 text-gray-500 shrink-0" />
                <div>
                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Fecha de creación</p>
                  <p className="text-sm">{formatDateTime(pass.created_at)}</p>
                </div>
              </div>
              {pass.comment && (
                <div className="flex items-start gap-3 bg-gray-50 p-3 rounded-lg border border-gray-100">
                  <MessageSquare className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Comentario</p>
                    <p className="text-sm italic text-gray-700">"{pass.comment}"</p>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function AdminGuestPassListPage() {
  const [passes, setPasses] = useState<AdminGuestPass[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [sortFilter, setSortFilter] = useState("date_desc");
  const [search, setSearch] = useState("");
  const [selectedPass, setSelectedPass] = useState<AdminGuestPass | null>(null);
  const requestIdRef = useRef(0);

  async function fetchPasses(status: string) {
    const currentId = ++requestIdRef.current;
    setLoading(true);
    try {
      const data = await listAdminGuestPasses(status || undefined);
      if (currentId !== requestIdRef.current) return;
      setPasses(data);
    } catch (err) {
      if (currentId !== requestIdRef.current) return;
      toast.error(err instanceof GuestPassApiError ? err.message : "Error al cargar el listado.");
    } finally {
      if (currentId === requestIdRef.current) setLoading(false);
    }
  }

  useEffect(() => {
    fetchPasses(statusFilter);
  }, [statusFilter]);

  const processedPasses = [...passes]
    .filter((p) => {
      if (!search.trim()) return true;
      const s = search.toLowerCase();
      return (
        p.full_name?.toLowerCase().includes(s) ||
        p.resident_name?.toLowerCase().includes(s) ||
        p.pass_code?.toLowerCase().includes(s)
      );
    })
    .sort((a, b) => {
      switch (sortFilter) {
        case "name_asc": return (a.full_name || "").localeCompare(b.full_name || "");
        case "name_desc": return (b.full_name || "").localeCompare(a.full_name || "");
        case "date_asc": return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        default: return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-purple-100 p-2.5 rounded-xl">
            <UserCheck className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Historial de Invitados</h2>
            <p className="text-sm text-gray-500 font-medium">Gestión y control de pases de visita</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => fetchPasses(statusFilter)} disabled={loading} className="shadow-sm">
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Actualizar
        </Button>
      </div>

      <div className="flex flex-col lg:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Buscar por invitado, residente o código..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10 shadow-sm"
          />
        </div>
        
        <div className="flex gap-2">
          <select
            aria-label="Filtrar por estado"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-sm min-w-[140px]"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          <select
            aria-label="Ordenar por"
            value={sortFilter}
            onChange={(e) => setSortFilter(e.target.value)}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-sm min-w-[180px]"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <RefreshCw className="w-8 h-8 text-purple-500 animate-spin" />
          <p className="text-sm text-gray-500 font-medium">Cargando pases de invitados...</p>
        </div>
      ) : processedPasses.length === 0 ? (
        <Card className="border-dashed shadow-none bg-gray-50/50">
          <CardContent className="py-12 text-center">
            <p className="text-gray-500 font-medium">No se han encontrado pases que coincidan.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {processedPasses.map((pass) => (
            <Card
              key={pass.id}
              className="hover:shadow-md transition-all cursor-pointer hover:border-purple-300 group border-gray-200"
              onClick={() => setSelectedPass(pass)}
            >
              <CardContent className="p-5 flex flex-col h-full">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <span className="font-bold text-gray-900 group-hover:text-purple-700 transition-colors line-clamp-1 flex-1">
                    {pass.full_name}
                  </span>
                  <Badge className={`${STATUS_BADGE[pass.status ?? ""]} whitespace-nowrap shrink-0`}>
                    {STATUS_LABEL[pass.status ?? ""] ?? pass.status}
                  </Badge>
                </div>
                
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2 text-xs">
                    <User className="w-3.5 h-3.5 text-gray-400" />
                    <span className="text-gray-500">De: </span>
                    <span className="font-semibold text-gray-800 line-clamp-1">{pass.resident_name}</span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-xs">
                    <Hash className="w-3.5 h-3.5 text-gray-400" />
                    <span className="text-gray-500">Código: </span>
                    <span className="font-mono font-bold text-purple-600">{pass.pass_code}</span>
                  </div>

                  <div className="flex items-start gap-2 text-[11px] text-gray-500 bg-gray-50 p-2 rounded-md border border-gray-100 mt-2">
                    <Calendar className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <div className="leading-tight">
                      <p>{formatDateTime(pass.valid_from).split(',')[0]}</p>
                      <p className="text-[10px] text-gray-400">hasta {formatDateTime(pass.valid_until).split(',')[0]}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-[10px] text-gray-400 font-medium">
                  <span className="uppercase tracking-wider">Creado</span>
                  <span>{formatDateTime(pass.created_at).split(',')[0]}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <GuestPassDetailDialog pass={selectedPass} onClose={() => setSelectedPass(null)} />
    </div>
  );
}