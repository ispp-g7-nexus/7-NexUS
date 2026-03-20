import { UserCheck, RefreshCw, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { type AdminGuestPass, GuestPassApiError, listAdminGuestPasses } from "../../services/guestPasses";

const STATUS_OPTIONS = [
  { value: "", label: "Todos" },
  { value: "ACTIVE", label: "Activos" },
  { value: "USED", label: "Usados" },
  { value: "CANCELLED", label: "Cancelados" },
  { value: "REVOKED", label: "Revocados" },
  { value: "REJECTED", label: "Rechazados" },
  { value: "INACTIVE", label: "Inactivos" },
];

const STATUS_BADGE: Record<string, string> = {
  ACTIVE:    "bg-green-100 text-green-700 border-0",
  USED:      "bg-blue-100 text-blue-700 border-0",
  CANCELLED: "bg-gray-100 text-gray-600 border-0",
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

export function AdminGuestPassListPage() {
  const [passes, setPasses] = useState<AdminGuestPass[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");

  async function fetchPasses(status: string) {
    setLoading(true);
    try {
      const data = await listAdminGuestPasses(status || undefined);
      setPasses(data);
    } catch (err) {
      const msg = err instanceof GuestPassApiError ? err.message : "Error al cargar el listado.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchPasses(statusFilter);
  }, [statusFilter]);

  const filtered = search.trim()
    ? passes.filter(
        (p) =>
          p.full_name.toLowerCase().includes(search.toLowerCase()) ||
          p.resident_name.toLowerCase().includes(search.toLowerCase()) ||
          p.pass_code.toLowerCase().includes(search.toLowerCase())
      )
    : passes;

  function renderList() {
    if (loading) {
      return <p className="text-sm text-muted-foreground py-8 text-center">Cargando...</p>;
    }
    if (filtered.length === 0) {
      return <p className="text-sm text-muted-foreground py-8 text-center">No hay pases que coincidan.</p>;
    }
    return (
      <div className="grid gap-3">
        {filtered.map((pass) => (
          <Card key={pass.id} className="hover:shadow-sm transition">
            <CardContent className="flex items-start justify-between gap-4 p-4">
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold truncate">{pass.full_name}</span>
                  <Badge className={STATUS_BADGE[pass.status ?? ""] ?? "border-0"}>
                    {STATUS_LABEL[pass.status ?? ""] ?? pass.status}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Registrado por <span className="font-medium text-foreground">{pass.resident_name}</span>
                  {" · "}Código: <span className="font-mono">{pass.pass_code}</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDateTime(pass.valid_from)} — {formatDateTime(pass.valid_until)}
                </p>
                {pass.comment && (
                  <p className="text-xs text-muted-foreground italic">"{pass.comment}"</p>
                )}
              </div>
              <p className="text-xs text-muted-foreground shrink-0 pt-0.5">
                {formatDateTime(pass.created_at)}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-purple-100 p-2 rounded-xl">
            <UserCheck className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Historial de Invitados</h2>
            <p className="text-sm text-muted-foreground">Pases de visita pasados y actuales</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => fetchPasses(statusFilter)} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Actualizar
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por invitado, residente o código..."
            value={search}
            onChange={(e) => setSearch((e.target as HTMLInputElement).value)}
            className="pl-9"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* Lista */}
      {renderList()}
    </div>
  );
}
