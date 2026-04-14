import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Download,
  RefreshCw,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";

import { Button } from "../../../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";
import { Input } from "../../../components/ui/input";
import {
  type IncidenceAnalyticsResponse,
  type IncidenceOpenByDay,
  type IncidenceResolvedByStaff,
  getIncidenceAnalytics,
} from "../../../services/incidences";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDateInput(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function addDays(base: Date, n: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + n);
  return d;
}

function shortDate(iso: string): string {
  const [, mm, dd] = iso.split("-");
  return `${dd}/${mm}`;
}

function downloadCsv(
  filename: string,
  header: string[],
  rows: Array<Array<string | number | null>>
) {
  const escape = (v: string | number | null) => {
    if (v === null || v === undefined) return "";
    const s = String(v);
    return s.includes(",") || s.includes('"') || s.includes("\n")
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };
  const lines = [header.join(","), ...rows.map((r) => r.map(escape).join(","))];
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Tooltips ──────────────────────────────────────────────────────────────────

function OpenByDayTooltip({
  active,
  payload,
  label,
}: Readonly<{
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}>) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-md border bg-white p-2 shadow-sm text-xs">
      <p className="font-semibold mb-0.5">{label}</p>
      <p className="text-orange-700">Abiertas acumuladas: {payload[0].value}</p>
    </div>
  );
}

function StaffTooltip({
  active,
  payload,
}: Readonly<{
  active?: boolean;
  payload?: Array<{ payload: IncidenceResolvedByStaff }>;
}>) {
  if (!active || !payload || payload.length === 0) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-md border bg-white p-2 shadow-sm text-xs">
      <p className="font-semibold mb-0.5">{d.staff_name}</p>
      <p className="text-teal-700">Resueltas: {d.resolved_count}</p>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function IncidencesAnalytics() {
  const today = useMemo(() => new Date(), []);
  const [from, setFrom] = useState(formatDateInput(addDays(today, -29)));
  const [to, setTo] = useState(formatDateInput(today));
  const [analytics, setAnalytics] = useState<IncidenceAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const hasInvalidRange = from !== "" && to !== "" && from > to;

  const load = useCallback(async (f: string, t: string) => {
    if (f > t) {
      setError("El rango temporal es inválido. Ajusta las fechas.");
      setLoading(false);
      setAnalytics(null);
      return;
    }
    const id = ++requestIdRef.current;
    setLoading(true);
    setError(null);
    try {
      const data = await getIncidenceAnalytics({ from: f, to: t });
      if (id !== requestIdRef.current) return;
      setAnalytics(data);
    } catch (err) {
      if (id !== requestIdRef.current) return;
      const msg =
        err instanceof Error
          ? err.message
          : "No se pudieron cargar las analíticas de incidencias.";
      setError(msg);
      setAnalytics(null);
      toast.error(msg);
    } finally {
      if (id === requestIdRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(from, to);
  }, [from, to, load]);

  const openByDayData = useMemo<(IncidenceOpenByDay & { label: string })[]>(
    () => (analytics?.open_by_day ?? []).map((d) => ({ ...d, label: shortDate(d.date) })),
    [analytics]
  );

  const tickInterval = useMemo(() => {
    const n = openByDayData.length;
    if (n <= 14) return 0;
    if (n <= 31) return 2;
    return Math.floor(n / 10);
  }, [openByDayData]);

  const exportOpenByDayCsv = () => {
    if (!analytics) return;
    downloadCsv(
      "incidencias_abiertas_por_dia.csv",
      ["fecha", "abiertas_acumuladas"],
      analytics.open_by_day.map((d) => [d.date, d.open_count])
    );
  };

  const exportStaffCsv = () => {
    if (!analytics) return;
    downloadCsv(
      "incidencias_por_staff.csv",
      ["staff", "resueltas"],
      analytics.resolved_by_staff.map((s) => [s.staff_name, s.resolved_count])
    );
  };

  return (
    <section className="space-y-6">
      {/* ── Filters ── */}
      <Card className="border-border/80 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Filtros de analítica</CardTitle>
          <CardDescription>
            Ajusta el rango temporal para actualizar el panel.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <div className="space-y-1">
            <p className="text-xs font-medium text-gray-600">Desde</p>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium text-gray-600">Hasta</p>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div className="flex items-end md:col-span-2">
            <Button
              type="button"
              variant="outline"
              className="w-full md:w-auto"
              onClick={() => { load(from, to); }}
              disabled={loading}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Actualizar
            </Button>
          </div>
        </CardContent>
      </Card>

      {hasInvalidRange && (
        <Card className="border-red-200 bg-red-50/50">
          <CardContent className="flex items-center gap-2 py-6 text-sm text-red-700">
            <AlertCircle className="h-4 w-4" />
            El rango temporal no es válido: la fecha inicial debe ser anterior o igual a la final.
          </CardContent>
        </Card>
      )}

      {loading && !analytics && (
        <Card className="border-border/80 shadow-sm">
          <CardContent className="flex items-center justify-center gap-2 py-12 text-sm text-gray-500">
            <RefreshCw className="h-4 w-4 animate-spin" />
            Cargando analíticas de incidencias...
          </CardContent>
        </Card>
      )}

      {!loading && error && (
        <Card className="border-red-200 bg-red-50/30 shadow-sm">
          <CardContent className="flex flex-col gap-4 py-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-sm text-red-700">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
            <Button type="button" variant="outline" onClick={() => { load(from, to); }}>
              Reintentar
            </Button>
          </CardContent>
        </Card>
      )}

      {!error && analytics && (
        <>
          {/* ── Summary cards ── */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <Card className="border-border/80 shadow-sm">
              <CardHeader className="pb-2">
                <CardDescription>Creadas en el periodo</CardDescription>
                <CardTitle className="flex items-center gap-2 text-3xl font-semibold">
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                  {analytics.summary.total_created_in_period}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card className="border-border/80 shadow-sm">
              <CardHeader className="pb-2">
                <CardDescription>Resueltas en el periodo</CardDescription>
                <CardTitle className="flex items-center gap-2 text-3xl font-semibold">
                  <CheckCircle2 className="h-5 w-5 text-teal-500" />
                  {analytics.summary.total_resolved_in_period}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card className="border-border/80 shadow-sm">
              <CardHeader className="pb-2">
                <CardDescription>Abiertas actualmente</CardDescription>
                <CardTitle className="flex items-center gap-2 text-3xl font-semibold">
                  <AlertCircle className="h-5 w-5 text-red-500" />
                  {analytics.summary.currently_open}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card className="border-border/80 shadow-sm">
              <CardHeader className="pb-2">
                <CardDescription>Tiempo medio de resolución</CardDescription>
                <CardTitle className="flex items-center gap-2 text-3xl font-semibold">
                  <Clock className="h-5 w-5 text-indigo-500" />
                  {analytics.summary.avg_resolution_hours === null
                    ? "—"
                    : `${analytics.summary.avg_resolution_hours}h`}
                </CardTitle>
              </CardHeader>
            </Card>
          </div>

          {/* ── Chart 1: open incidences by day (backlog) ── */}
          <Card className="border-border/80 shadow-sm">
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-lg">Incidencias abiertas por día</CardTitle>
                <CardDescription>
                  Acumulado diario de incidencias sin resolver. Si no se cierra, se
                  suma al día siguiente.
                </CardDescription>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={exportOpenByDayCsv}>
                <Download className="mr-2 h-4 w-4" />
                Exportar CSV
              </Button>
            </CardHeader>
            <CardContent>
              {openByDayData.every((d) => d.open_count === 0) ? (
                <p className="py-8 text-center text-sm text-gray-500">
                  No hay incidencias abiertas en el rango seleccionado.
                </p>
              ) : (
                <div className="h-[320px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={openByDayData}
                      margin={{ top: 8, right: 16, left: 0, bottom: 4 }}
                    >
                      <defs>
                        <linearGradient id="openGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f97316" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="#f97316" stopOpacity={0.03} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 11 }}
                        interval={tickInterval}
                        angle={openByDayData.length > 14 ? -35 : 0}
                        dy={openByDayData.length > 14 ? 8 : 0}
                        height={openByDayData.length > 14 ? 46 : 30}
                      />
                      <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                      <Tooltip content={<OpenByDayTooltip />} />
                      <Area
                        type="monotone"
                        dataKey="open_count"
                        name="Abiertas"
                        stroke="#f97316"
                        strokeWidth={2}
                        fill="url(#openGradient)"
                        dot={false}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── Chart 2: resolved by staff ── */}
          <Card className="border-border/80 shadow-sm">
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-lg">Incidencias resueltas por staff</CardTitle>
                <CardDescription>
                  Número de incidencias resueltas por cada miembro del equipo en el
                  periodo seleccionado.
                </CardDescription>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={exportStaffCsv}>
                <Download className="mr-2 h-4 w-4" />
                Exportar CSV
              </Button>
            </CardHeader>
            <CardContent>
              {analytics.resolved_by_staff.length === 0 ? (
                <p className="py-8 text-center text-sm text-gray-500">
                  No hay incidencias resueltas en el periodo seleccionado.
                </p>
              ) : (
                <div
                  className="w-full"
                  style={{
                    height: Math.max(240, analytics.resolved_by_staff.length * 40 + 40),
                  }}
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={analytics.resolved_by_staff}
                      layout="vertical"
                      margin={{ top: 4, right: 48, left: 8, bottom: 4 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                      <YAxis
                        type="category"
                        dataKey="staff_name"
                        width={150}
                        tick={{ fontSize: 12 }}
                        tickFormatter={(v: string) => (v.length > 22 ? `${v.slice(0, 22)}…` : v)}
                      />
                      <Tooltip content={<StaffTooltip />} />
                      <Bar
                        dataKey="resolved_count"
                        name="Resueltas"
                        fill="#0d9488"
                        radius={[0, 6, 6, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          <p className="text-xs text-gray-400">
            * El tiempo medio de resolución y las fechas de cierre se aproximan a partir
            de la última modificación de cada incidencia.
          </p>
        </>
      )}
    </section>
  );
}
