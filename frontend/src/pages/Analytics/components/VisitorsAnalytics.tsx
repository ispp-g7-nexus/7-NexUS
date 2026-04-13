import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  Clock3,
  Download,
  Minus,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  UserCheck,
  Users,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";

import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../components/ui/card";
import { Input } from "../../../components/ui/input";
import { NativeSelect } from "../../../components/ui/native-select";
import {
  getAdminVisitorsAnalytics,
  type PeakHourAnalyticsItem,
  type VisitorsAnalyticsCompare,
  type VisitorsAnalyticsResponse,
} from "../../../services/guestPasses";

type VisitorsAnalyticsFilters = {
  from: string;
  to: string;
  compare: VisitorsAnalyticsCompare;
};

function formatDateInput(value: Date): string {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, "0");
  const day = `${value.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(base: Date, days: number): Date {
  const next = new Date(base);
  next.setDate(next.getDate() + days);
  return next;
}

function formatShortDate(iso: string | null): string {
  if (!iso) return "—";
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatDelta(value: number | null): string {
  if (value === null) return "—";
  if (value > 0) return `+${value}`;
  return `${value}`;
}

function formatDeltaPct(value: number | null): string {
  if (value === null) return "—";
  if (value > 0) return `+${value.toFixed(2)}%`;
  return `${value.toFixed(2)}%`;
}

function getDeltaBadgeClass(delta: number | null): string {
  if (delta === null) return "bg-gray-100 text-gray-600";
  if (delta > 0) return "bg-emerald-100 text-emerald-700";
  if (delta < 0) return "bg-red-100 text-red-700";
  return "bg-slate-100 text-slate-700";
}

function getTrendIcon(delta: number | null) {
  if (delta === null) return <Minus className="h-3.5 w-3.5" />;
  if (delta > 0) return <TrendingUp className="h-3.5 w-3.5" />;
  if (delta < 0) return <TrendingDown className="h-3.5 w-3.5" />;
  return <Minus className="h-3.5 w-3.5" />;
}

function downloadCsv(filename: string, header: string[], rows: Array<Array<string | number | null>>) {
  const escapeCell = (value: string | number | null): string => {
    if (value === null || value === undefined) return "";
    const asString = String(value);
    if (asString.includes(",") || asString.includes('"') || asString.includes("\n")) {
      return `"${asString.replace(/"/g, '""')}"`;
    }
    return asString;
  };

  const lines = [
    header.join(","),
    ...rows.map((row) => row.map((cell) => escapeCell(cell)).join(",")),
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function PeakHoursTooltip({
  active,
  payload,
  compareEnabled,
}: {
  active?: boolean;
  payload?: Array<{ payload: PeakHourAnalyticsItem }>;
  compareEnabled: boolean;
}) {
  if (!active || !payload || payload.length === 0) return null;

  const point = payload[0].payload;
  return (
    <div className="rounded-md border bg-white p-2 shadow-sm">
      <p className="text-sm font-semibold">{point.label}</p>
      <p className="text-xs text-gray-700">Visitas: {point.visits_count}</p>
      {compareEnabled && (
        <>
          <p className="text-xs text-gray-700">Periodo anterior: {point.compare_value ?? "—"}</p>
          <p className="text-xs text-gray-700">
            Delta: {formatDelta(point.delta)} ({formatDeltaPct(point.delta_pct)})
          </p>
        </>
      )}
    </div>
  );
}

export function VisitorsAnalytics() {
  const today = useMemo(() => new Date(), []);
  const [filters, setFilters] = useState<VisitorsAnalyticsFilters>({
    from: formatDateInput(addDays(today, -29)),
    to: formatDateInput(today),
    compare: "previous_period",
  });
  const [analytics, setAnalytics] = useState<VisitorsAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const compareEnabled = filters.compare === "previous_period";

  const hasInvalidRange = useMemo(() => {
    if (!filters.from || !filters.to) return false;
    return filters.from > filters.to;
  }, [filters.from, filters.to]);

  const loadAnalytics = useCallback(async (nextFilters: VisitorsAnalyticsFilters) => {
    const invalidRange = nextFilters.from !== "" && nextFilters.to !== "" && nextFilters.from > nextFilters.to;
    if (invalidRange) {
      setError("El rango temporal es inválido. Ajusta las fechas.");
      setLoading(false);
      setAnalytics(null);
      return;
    }

    const currentId = ++requestIdRef.current;
    setLoading(true);
    setError(null);

    try {
      const response = await getAdminVisitorsAnalytics({
        from: nextFilters.from,
        to: nextFilters.to,
        granularity: "hour",
        compare: nextFilters.compare,
      });
      if (currentId !== requestIdRef.current) return;
      setAnalytics(response);
    } catch (err) {
      if (currentId !== requestIdRef.current) return;
      const message =
        err instanceof Error ? err.message : "No se pudieron cargar las analíticas de visitantes.";
      setError(message);
      setAnalytics(null);
      toast.error(message);
    } finally {
      if (currentId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void loadAnalytics(filters);
  }, [filters, loadAnalytics]);

  const topHosts = useMemo(
    () => (analytics?.visitors_by_host || []).slice(0, 10),
    [analytics?.visitors_by_host]
  );

  const peakHoursChartData = useMemo(() => {
    const series = analytics?.peak_hours || [];
    const sorted = [...series].sort((a, b) => b.visits_count - a.visits_count);
    const topThree = sorted.filter((item) => item.visits_count > 0).slice(0, 3);
    const topHours = new Set(topThree.map((item) => item.hour));

    return series.map((item) => ({
      ...item,
      is_peak: topHours.has(item.hour),
    }));
  }, [analytics?.peak_hours]);

  const exportHostsCsv = () => {
    if (!analytics) return;
    downloadCsv(
      "visitors_by_host.csv",
      ["host_id", "host_name", "visitors_count", "pct_of_total", "compare_value", "delta", "delta_pct"],
      analytics.visitors_by_host.map((item) => [
        item.host_id,
        item.host_name,
        item.visitors_count,
        item.pct_of_total,
        item.compare_value,
        item.delta,
        item.delta_pct,
      ])
    );
  };

  const exportPeakHoursCsv = () => {
    if (!analytics) return;
    downloadCsv(
      "visitors_peak_hours.csv",
      ["hour", "label", "visits_count", "compare_value", "delta", "delta_pct"],
      analytics.peak_hours.map((item) => [
        item.hour,
        item.label,
        item.visits_count,
        item.compare_value,
        item.delta,
        item.delta_pct,
      ])
    );
  };

  return (
    <section className="space-y-6">
      <Card className="border-border/80 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Filtros de analítica</CardTitle>
          <CardDescription>
            Ajusta el rango temporal y la comparación para actualizar el panel.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-5">
          <div className="space-y-1">
            <p className="text-xs font-medium text-gray-600">Desde</p>
            <Input
              type="date"
              value={filters.from}
              onChange={(event) => setFilters((prev) => ({ ...prev, from: event.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium text-gray-600">Hasta</p>
            <Input
              type="date"
              value={filters.to}
              onChange={(event) => setFilters((prev) => ({ ...prev, to: event.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium text-gray-600">Granularidad</p>
            <div className="flex h-9 items-center rounded-md border border-input bg-input-background px-3 text-sm text-foreground">
              Hora del día
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium text-gray-600">Comparar</p>
            <NativeSelect
              value={filters.compare}
              className="bg-input-background shadow-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              onChange={(event) =>
                setFilters((prev) => ({
                  ...prev,
                  compare: event.target.value as VisitorsAnalyticsCompare,
                }))
              }
            >
              <option value="previous_period">Periodo anterior</option>
              <option value="none">Sin comparación</option>
            </NativeSelect>
          </div>
          <div className="flex items-end gap-2">
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => void loadAnalytics(filters)}
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
            Cargando analíticas de visitantes...
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
            <Button type="button" variant="outline" onClick={() => void loadAnalytics(filters)}>
              Reintentar
            </Button>
          </CardContent>
        </Card>
      )}

      {!error && analytics && (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Card className="border-border/80 shadow-sm">
              <CardHeader className="pb-2">
                <CardDescription>Total de visitas del periodo</CardDescription>
                <CardTitle className="flex items-center gap-2 text-3xl font-semibold">
                  <UserCheck className="h-5 w-5 text-purple-600" />
                  {analytics.summary.total_visits}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {compareEnabled ? (
                  <Badge className={`inline-flex items-center gap-1 ${getDeltaBadgeClass(analytics.summary.delta_total_visits)}`}>
                    {getTrendIcon(analytics.summary.delta_total_visits)}
                    {formatDelta(analytics.summary.delta_total_visits)} ({formatDeltaPct(analytics.summary.delta_pct_total_visits)})
                  </Badge>
                ) : (
                  <p className="text-xs text-gray-500">Comparación desactivada</p>
                )}
              </CardContent>
            </Card>

            <Card className="border-border/80 shadow-sm">
              <CardHeader className="pb-2">
                <CardDescription>Usuarios anfitriones con visitas</CardDescription>
                <CardTitle className="flex items-center gap-2 text-3xl font-semibold">
                  <Users className="h-5 w-5 text-blue-600" />
                  {analytics.summary.total_hosts}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {compareEnabled ? (
                  <Badge className={`inline-flex items-center gap-1 ${getDeltaBadgeClass(analytics.summary.delta_total_hosts)}`}>
                    {getTrendIcon(analytics.summary.delta_total_hosts)}
                    {formatDelta(analytics.summary.delta_total_hosts)} ({formatDeltaPct(analytics.summary.delta_pct_total_hosts)})
                  </Badge>
                ) : (
                  <p className="text-xs text-gray-500">Comparación desactivada</p>
                )}
              </CardContent>
            </Card>
          </div>

          <p className="text-xs text-gray-500">
            Periodo: {formatShortDate(analytics.meta.from_value)} - {formatShortDate(analytics.meta.to_value)}
            {compareEnabled && (
              <> · Comparado con {formatShortDate(analytics.meta.compare_from)} - {formatShortDate(analytics.meta.compare_to)}</>
            )}
          </p>

          {analytics.summary.total_visits === 0 ? (
            <Card className="border-border/80 shadow-sm">
              <CardContent className="py-12 text-center text-sm text-gray-500">
                No hay visitas en el rango seleccionado.
              </CardContent>
            </Card>
          ) : (
            <>
              <Card className="border-border/80 shadow-sm">
                <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle className="text-lg">Usuarios que más visitantes registran</CardTitle>
                    <CardDescription>Ranking de anfitriones por volumen de visitas en el periodo.</CardDescription>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={exportHostsCsv}>
                    <Download className="mr-2 h-4 w-4" />
                    Exportar CSV
                  </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="h-[360px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={topHosts}
                        layout="vertical"
                        margin={{ top: 4, right: 16, left: 6, bottom: 4 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                        <XAxis type="number" allowDecimals={false} />
                        <YAxis
                          type="category"
                          dataKey="host_name"
                          width={170}
                          tick={{ fontSize: 12 }}
                          tickFormatter={(value: string) =>
                            value.length > 26 ? `${value.slice(0, 26)}…` : value
                          }
                        />
                        <Tooltip
                          formatter={(value: number) => [`${value}`, "Visitas"]}
                          labelFormatter={(value: string) => `Anfitrión: ${value}`}
                        />
                        <Bar dataKey="visitors_count" radius={[0, 8, 8, 0]} fill="#7c5cbf" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b text-xs uppercase text-gray-500">
                          <th className="py-2 pr-3">Anfitrión</th>
                          <th className="py-2 pr-3">Visitas</th>
                          <th className="py-2 pr-3">% del total</th>
                          <th className="py-2 pr-3">Comparación</th>
                        </tr>
                      </thead>
                      <tbody>
                        {topHosts.map((item) => (
                          <tr key={item.host_id} className="border-b last:border-b-0">
                            <td className="py-2 pr-3 font-medium text-gray-900">{item.host_name}</td>
                            <td className="py-2 pr-3">{item.visitors_count}</td>
                            <td className="py-2 pr-3">{item.pct_of_total.toFixed(2)}%</td>
                            <td className="py-2 pr-3">
                              {compareEnabled ? (
                                <span className="text-xs text-gray-700">
                                  {formatDelta(item.delta)} ({formatDeltaPct(item.delta_pct)})
                                </span>
                              ) : (
                                <span className="text-xs text-gray-400">—</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/80 shadow-sm">
                <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle className="text-lg">Horas de mayor afluencia</CardTitle>
                    <CardDescription>
                      Distribución de visitas por hora para identificar picos operativos.
                    </CardDescription>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={exportPeakHoursCsv}>
                    <Download className="mr-2 h-4 w-4" />
                    Exportar CSV
                  </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="h-[340px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={peakHoursChartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={1} angle={-35} dy={8} height={46} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                        <Tooltip content={<PeakHoursTooltip compareEnabled={compareEnabled} />} />
                        <Bar dataKey="visits_count" radius={[6, 6, 0, 0]}>
                          {peakHoursChartData.map((item) => (
                            <Cell
                              key={item.hour}
                              fill={item.is_peak ? "#0f766e" : "#94a3b8"}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
                    <span className="inline-flex items-center gap-1">
                      <Clock3 className="h-3.5 w-3.5" />
                      Barras en verde: horas pico del periodo.
                    </span>
                    {compareEnabled && <span>Tooltip incluye comparación y delta vs periodo anterior.</span>}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </>
      )}
    </section>
  );
}
