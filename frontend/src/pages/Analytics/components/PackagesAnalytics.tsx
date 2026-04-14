import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  Box,
  Download,
  Package,
  RefreshCw,
  Warehouse,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
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
  type PackageAnalyticsResponse,
  type PackageByResident,
  type PackageDailyActivity,
  getPackageAnalytics,
} from "../../../services/packages";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDateInput(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function addDays(base: Date, days: number): Date {
  const next = new Date(base);
  next.setDate(next.getDate() + days);
  return next;
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

function DailyTooltip({
  active,
  payload,
  label,
}: Readonly<{
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}>) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-md border bg-white p-2 shadow-sm text-xs space-y-0.5">
      <p className="font-semibold mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  );
}

function ResidentTooltip({
  active,
  payload,
}: Readonly<{
  active?: boolean;
  payload?: Array<{ payload: PackageByResident }>;
}>) {
  if (!active || !payload || payload.length === 0) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-md border bg-white p-2 shadow-sm text-xs">
      <p className="font-semibold mb-1">{d.resident_name}</p>
      <p className="text-gray-700">Recibidos: {d.total_received}</p>
      <p className="text-gray-700">Recogidos: {d.total_delivered}</p>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function PackagesAnalytics() {
  const today = useMemo(() => new Date(), []);
  const [from, setFrom] = useState(formatDateInput(addDays(today, -29)));
  const [to, setTo] = useState(formatDateInput(today));
  const [analytics, setAnalytics] = useState<PackageAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const hasInvalidRange = from !== "" && to !== "" && from > to;

  const load = useCallback(
    async (f: string, t: string) => {
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
        const data = await getPackageAnalytics({ from: f, to: t });
        if (id !== requestIdRef.current) return;
        setAnalytics(data);
      } catch (err) {
        if (id !== requestIdRef.current) return;
        const msg =
          err instanceof Error
            ? err.message
            : "No se pudieron cargar las analíticas de paquetería.";
        setError(msg);
        setAnalytics(null);
        toast.error(msg);
      } finally {
        if (id === requestIdRef.current) setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    load(from, to);
  }, [from, to, load]);

  // Thin out X-axis labels when many days
  const dailyChartData = useMemo<(PackageDailyActivity & { label: string })[]>(
    () =>
      (analytics?.daily_activity ?? []).map((d) => ({
        ...d,
        label: shortDate(d.date),
      })),
    [analytics]
  );

  const tickInterval = useMemo(() => {
    const n = dailyChartData.length;
    if (n <= 14) return 0;
    if (n <= 31) return 2;
    if (n <= 60) return 6;
    return Math.floor(n / 10);
  }, [dailyChartData]);

  const exportDailyCsv = () => {
    if (!analytics) return;
    downloadCsv(
      "paquetes_diario.csv",
      ["fecha", "recibidos", "recogidos", "acumulados_conserjeria"],
      analytics.daily_activity.map((d) => [
        d.date,
        d.received,
        d.delivered,
        d.pending_cumulative,
      ])
    );
  };

  const exportResidentCsv = () => {
    if (!analytics) return;
    downloadCsv(
      "paquetes_por_persona.csv",
      ["residente", "total_recibidos", "total_recogidos"],
      analytics.by_resident.map((r) => [
        r.resident_name,
        r.total_received,
        r.total_delivered,
      ])
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
            <Input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium text-gray-600">Hasta</p>
            <Input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
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
            Cargando analíticas de paquetería...
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
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Card className="border-border/80 shadow-sm">
              <CardHeader className="pb-2">
                <CardDescription>Paquetes recibidos en el periodo</CardDescription>
                <CardTitle className="flex items-center gap-2 text-3xl font-semibold">
                  <Package className="h-5 w-5 text-indigo-500" />
                  {analytics.summary.total_received_in_period}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card className="border-border/80 shadow-sm">
              <CardHeader className="pb-2">
                <CardDescription>Paquetes recogidos en el periodo</CardDescription>
                <CardTitle className="flex items-center gap-2 text-3xl font-semibold">
                  <Box className="h-5 w-5 text-teal-500" />
                  {analytics.summary.total_delivered_in_period}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card className="border-border/80 shadow-sm">
              <CardHeader className="pb-2">
                <CardDescription>Pendientes ahora en conserjería</CardDescription>
                <CardTitle className="flex items-center gap-2 text-3xl font-semibold">
                  <Warehouse className="h-5 w-5 text-amber-500" />
                  {analytics.summary.currently_pending}
                </CardTitle>
              </CardHeader>
            </Card>
          </div>

          {/* ── Chart 1: daily received + delivered + cumulative pending ── */}
          <Card className="border-border/80 shadow-sm">
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-lg">
                  Paquetes recogidos por día y acumulados en conserjería
                </CardTitle>
                <CardDescription>
                  Barras: paquetes recibidos y recogidos cada día. Línea: stock acumulado en
                  conserjería al final de cada día.
                </CardDescription>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={exportDailyCsv}>
                <Download className="mr-2 h-4 w-4" />
                Exportar CSV
              </Button>
            </CardHeader>
            <CardContent>
              {dailyChartData.every((d) => d.received === 0 && d.delivered === 0) ? (
                <p className="py-8 text-center text-sm text-gray-500">
                  No hay actividad de paquetes en el rango seleccionado.
                </p>
              ) : (
                <div className="h-[360px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart
                      data={dailyChartData}
                      margin={{ top: 8, right: 24, left: 0, bottom: 4 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 11 }}
                        interval={tickInterval}
                        angle={dailyChartData.length > 14 ? -35 : 0}
                        dy={dailyChartData.length > 14 ? 8 : 0}
                        height={dailyChartData.length > 14 ? 46 : 30}
                      />
                      <YAxis yAxisId="bars" allowDecimals={false} tick={{ fontSize: 12 }} />
                      <YAxis
                        yAxisId="line"
                        orientation="right"
                        allowDecimals={false}
                        tick={{ fontSize: 12 }}
                      />
                      <Tooltip content={<DailyTooltip />} />
                      <Legend
                        formatter={(value) => {
                          if (value === "received") return "Recibidos";
                          if (value === "delivered") return "Recogidos";
                          if (value === "pending_cumulative") return "En conserjería";
                          return value;
                        }}
                      />
                      <Bar
                        yAxisId="bars"
                        dataKey="received"
                        name="Recibidos"
                        fill="#6366f1"
                        radius={[4, 4, 0, 0]}
                      />
                      <Bar
                        yAxisId="bars"
                        dataKey="delivered"
                        name="Recogidos"
                        fill="#0d9488"
                        radius={[4, 4, 0, 0]}
                      />
                      <Line
                        yAxisId="line"
                        type="monotone"
                        dataKey="pending_cumulative"
                        name="En conserjería"
                        stroke="#f59e0b"
                        strokeWidth={2}
                        dot={false}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── Chart 2: packages by resident ── */}
          <Card className="border-border/80 shadow-sm">
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-lg">
                  Número de paquetes por persona
                </CardTitle>
                <CardDescription>
                  Top 15 residentes por paquetes recibidos en el periodo. Barra oscura: recogidos.
                </CardDescription>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={exportResidentCsv}>
                <Download className="mr-2 h-4 w-4" />
                Exportar CSV
              </Button>
            </CardHeader>
            <CardContent>
              {analytics.by_resident.length === 0 ? (
                <p className="py-8 text-center text-sm text-gray-500">
                  No hay datos de paquetes por residente en el periodo seleccionado.
                </p>
              ) : (
                <div
                  className="w-full"
                  style={{
                    height: Math.max(280, analytics.by_resident.length * 36 + 40),
                  }}
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={analytics.by_resident}
                      layout="vertical"
                      margin={{ top: 4, right: 16, left: 8, bottom: 4 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                      <YAxis
                        type="category"
                        dataKey="resident_name"
                        width={160}
                        tick={{ fontSize: 12 }}
                        tickFormatter={(v: string) => (v.length > 24 ? `${v.slice(0, 24)}…` : v)}
                      />
                      <Tooltip content={<ResidentTooltip />} />
                      <Legend
                        formatter={(value) => {
                          if (value === "total_received") return "Recibidos";
                          if (value === "total_delivered") return "Recogidos";
                          return value;
                        }}
                      />
                      <Bar
                        dataKey="total_received"
                        name="Recibidos"
                        fill="#a5b4fc"
                        radius={[0, 6, 6, 0]}
                      />
                      <Bar
                        dataKey="total_delivered"
                        name="Recogidos"
                        fill="#6366f1"
                        radius={[0, 6, 6, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </section>
  );
}
