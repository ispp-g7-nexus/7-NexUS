import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  Download,
  Minus,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  CalendarClock,
  Ban,
  GaugeCircle,
  MapPinned,
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
  getAdminReservationsAnalytics,
  type ReservationsAnalyticsCompare,
  type ReservationsAnalyticsResourceType,
  type ReservationsAnalyticsResponse,
  type ReservationsPeakTimeByZoneItem,
} from "../../../services/reservationsAnalytics";

type ReservationsAnalyticsFilters = {
  from: string;
  to: string;
  compare: ReservationsAnalyticsCompare;
  resource_type: ReservationsAnalyticsResourceType;
  zone_id: string;
};

type ZoneOption = {
  zone_id: string;
  zone_name: string;
  resource_type: string;
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

function formatRate(value: number | null): string {
  if (value === null) return "—";
  return `${value.toFixed(2)}%`;
}

function formatRateDelta(value: number | null): string {
  if (value === null) return "—";
  if (value > 0) return `+${value.toFixed(2)} pp`;
  return `${value.toFixed(2)} pp`;
}

function formatResourceTypeLabel(value: string): string {
  if (value === "spaces") return "Espacios";
  if (value === "objects") return "Objetos";
  return value;
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

function downloadCsv(filename: string, headers: string[], rows: Array<Array<string | number | null>>) {
  const escapeCell = (value: string | number | null): string => {
    if (value === null || value === undefined) return "";
    const asString = String(value);
    if (asString.includes(",") || asString.includes('"') || asString.includes("\n")) {
      return `"${asString.replace(/"/g, '""')}"`;
    }
    return asString;
  };

  const lines = [
    headers.join(","),
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

function PeakByZoneTooltip({
  active,
  payload,
  compareEnabled,
}: {
  active?: boolean;
  payload?: Array<{ payload: ReservationsPeakTimeByZoneItem }>;
  compareEnabled: boolean;
}) {
  if (!active || !payload || payload.length === 0) return null;

  const point = payload[0].payload;
  return (
    <div className="rounded-md border bg-white p-2 shadow-sm">
      <p className="text-sm font-semibold">{point.label}</p>
      <p className="text-xs text-gray-700">Reservas: {point.reservations_count}</p>
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

export function ReservationsAnalytics() {
  const today = useMemo(() => new Date(), []);
  const [filters, setFilters] = useState<ReservationsAnalyticsFilters>({
    from: formatDateInput(addDays(today, -29)),
    to: formatDateInput(today),
    compare: "previous_period",
    resource_type: "all",
    zone_id: "",
  });
  const [analytics, setAnalytics] = useState<ReservationsAnalyticsResponse | null>(null);
  const [selectedPeakZoneId, setSelectedPeakZoneId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const compareEnabled = filters.compare === "previous_period";

  const hasInvalidRange = useMemo(() => {
    if (!filters.from || !filters.to) return false;
    return filters.from > filters.to;
  }, [filters.from, filters.to]);

  const loadAnalytics = useCallback(async (nextFilters: ReservationsAnalyticsFilters) => {
    const invalidRange =
      nextFilters.from !== "" && nextFilters.to !== "" && nextFilters.from > nextFilters.to;
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
      const response = await getAdminReservationsAnalytics({
        from: nextFilters.from,
        to: nextFilters.to,
        compare: nextFilters.compare,
        resource_type: nextFilters.resource_type,
        zone_id: nextFilters.zone_id || undefined,
      });

      if (currentId !== requestIdRef.current) return;
      setAnalytics(response);
    } catch (err) {
      if (currentId !== requestIdRef.current) return;
      const message =
        err instanceof Error ? err.message : "No se pudieron cargar las analíticas de reservas.";
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

  const zoneOptions = useMemo<ZoneOption[]>(() => {
    if (!analytics) return [];

    const zoneMap = new Map<string, ZoneOption>();
    const pushOption = (zone_id: string, zone_name: string, resource_type: string) => {
      if (!zoneMap.has(zone_id)) {
        zoneMap.set(zone_id, { zone_id, zone_name, resource_type });
      }
    };

    analytics.most_reserved_zones.forEach((item) =>
      pushOption(item.zone_id, item.zone_name, item.resource_type)
    );
    analytics.cancellation_rate_by_zone.forEach((item) =>
      pushOption(item.zone_id, item.zone_name, item.resource_type)
    );
    analytics.peak_time_by_zone.forEach((item) =>
      pushOption(item.zone_id, item.zone_name, item.resource_type)
    );

    return [...zoneMap.values()].sort((left, right) =>
      left.zone_name.localeCompare(right.zone_name, "es")
    );
  }, [analytics]);

  useEffect(() => {
    if (!filters.zone_id) return;
    const stillExists = zoneOptions.some((zone) => zone.zone_id === filters.zone_id);
    if (!stillExists) {
      setFilters((prev) => ({ ...prev, zone_id: "" }));
    }
  }, [filters.zone_id, zoneOptions]);

  const mostReservedTop = useMemo(
    () => (analytics?.most_reserved_zones || []).slice(0, 10),
    [analytics?.most_reserved_zones]
  );

  const cancellationByZoneTop = useMemo(
    () => (analytics?.cancellation_rate_by_zone || []).slice(0, 10),
    [analytics?.cancellation_rate_by_zone]
  );

  const cancellationByUserTop = useMemo(
    () => (analytics?.cancellation_rate_by_user || []).slice(0, 10),
    [analytics?.cancellation_rate_by_user]
  );

  const availablePeakZones = useMemo(() => {
    if (!analytics) return [];
    const zoneMap = new Map<string, ZoneOption>();
    analytics.peak_time_by_zone.forEach((item) => {
      if (!zoneMap.has(item.zone_id)) {
        zoneMap.set(item.zone_id, {
          zone_id: item.zone_id,
          zone_name: item.zone_name,
          resource_type: item.resource_type,
        });
      }
    });
    return [...zoneMap.values()].sort((left, right) =>
      left.zone_name.localeCompare(right.zone_name, "es")
    );
  }, [analytics]);

  useEffect(() => {
    if (availablePeakZones.length === 0) {
      setSelectedPeakZoneId("");
      return;
    }

    if (filters.zone_id && availablePeakZones.some((zone) => zone.zone_id === filters.zone_id)) {
      setSelectedPeakZoneId(filters.zone_id);
      return;
    }

    if (availablePeakZones.some((zone) => zone.zone_id === selectedPeakZoneId)) {
      return;
    }

    setSelectedPeakZoneId(availablePeakZones[0].zone_id);
  }, [availablePeakZones, filters.zone_id, selectedPeakZoneId]);

  const peakHoursForSelectedZone = useMemo(() => {
    if (!analytics || !selectedPeakZoneId) return [];
    const zoneRows = analytics.peak_time_by_zone
      .filter((item) => item.zone_id === selectedPeakZoneId)
      .sort((left, right) => left.hour - right.hour);

    const topHours = new Set(
      [...zoneRows]
        .filter((item) => item.reservations_count > 0)
        .sort((left, right) => right.reservations_count - left.reservations_count)
        .slice(0, 3)
        .map((item) => item.hour)
    );

    return zoneRows.map((item) => ({
      ...item,
      is_peak: topHours.has(item.hour),
    }));
  }, [analytics, selectedPeakZoneId]);

  const selectedPeakZone = useMemo(
    () => availablePeakZones.find((zone) => zone.zone_id === selectedPeakZoneId) || null,
    [availablePeakZones, selectedPeakZoneId]
  );

  const exportMostReservedZonesCsv = () => {
    if (!analytics) return;
    downloadCsv(
      "reservations_most_reserved_zones.csv",
      [
        "zone_id",
        "zone_name",
        "resource_type",
        "reservations_count",
        "pct_of_total",
        "compare_value",
        "delta",
        "delta_pct",
      ],
      analytics.most_reserved_zones.map((item) => [
        item.zone_id,
        item.zone_name,
        item.resource_type,
        item.reservations_count,
        item.pct_of_total,
        item.compare_value,
        item.delta,
        item.delta_pct,
      ])
    );
  };

  const exportPeakByZoneCsv = () => {
    if (!analytics) return;
    downloadCsv(
      "reservations_peak_time_by_zone.csv",
      [
        "zone_id",
        "zone_name",
        "resource_type",
        "hour",
        "label",
        "reservations_count",
        "compare_value",
        "delta",
        "delta_pct",
      ],
      analytics.peak_time_by_zone.map((item) => [
        item.zone_id,
        item.zone_name,
        item.resource_type,
        item.hour,
        item.label,
        item.reservations_count,
        item.compare_value,
        item.delta,
        item.delta_pct,
      ])
    );
  };

  const exportCancellationByZoneCsv = () => {
    if (!analytics) return;
    downloadCsv(
      "reservations_cancellation_by_zone.csv",
      [
        "zone_id",
        "zone_name",
        "resource_type",
        "total_reservations",
        "cancelled_reservations",
        "cancellation_rate",
        "compare_value",
        "delta",
        "delta_pct",
      ],
      analytics.cancellation_rate_by_zone.map((item) => [
        item.zone_id,
        item.zone_name,
        item.resource_type,
        item.total_reservations,
        item.cancelled_reservations,
        item.cancellation_rate,
        item.compare_value,
        item.delta,
        item.delta_pct,
      ])
    );
  };

  const exportCancellationByUserCsv = () => {
    if (!analytics) return;
    downloadCsv(
      "reservations_cancellation_by_user.csv",
      [
        "user_id",
        "user_name",
        "total_reservations",
        "cancelled_reservations",
        "cancellation_rate",
        "compare_value",
        "delta",
        "delta_pct",
      ],
      analytics.cancellation_rate_by_user.map((item) => [
        item.user_id,
        item.user_name,
        item.total_reservations,
        item.cancelled_reservations,
        item.cancellation_rate,
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
            Ajusta el periodo, tipo de recurso y comparación para actualizar el panel.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-6">
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
            <p className="text-xs font-medium text-gray-600">Tipo de recurso</p>
            <NativeSelect
              value={filters.resource_type}
              onChange={(event) =>
                setFilters((prev) => ({
                  ...prev,
                  resource_type: event.target.value as ReservationsAnalyticsResourceType,
                  zone_id: "",
                }))
              }
            >
              <option value="all">Todos</option>
              <option value="spaces">Espacios</option>
              <option value="objects">Objetos</option>
            </NativeSelect>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium text-gray-600">Zona</p>
            <NativeSelect
              value={filters.zone_id}
              onChange={(event) => setFilters((prev) => ({ ...prev, zone_id: event.target.value }))}
            >
              <option value="">Todas las zonas</option>
              {zoneOptions.map((zone) => (
                <option key={zone.zone_id} value={zone.zone_id}>
                  {zone.zone_name} · {formatResourceTypeLabel(zone.resource_type)}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium text-gray-600">Comparar</p>
            <NativeSelect
              value={filters.compare}
              onChange={(event) =>
                setFilters((prev) => ({
                  ...prev,
                  compare: event.target.value as ReservationsAnalyticsCompare,
                }))
              }
            >
              <option value="previous_period">Periodo anterior</option>
              <option value="none">Sin comparación</option>
            </NativeSelect>
          </div>
          <div className="space-y-1">
            <p className="select-none text-xs font-medium text-transparent" aria-hidden="true">
              Acción
            </p>
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
            Cargando analíticas de reservas...
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
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Card className="border-border/80 shadow-sm">
              <CardHeader className="pb-2">
                <CardDescription>Total de reservas</CardDescription>
                <CardTitle className="flex items-center gap-2 text-3xl font-semibold">
                  <CalendarClock className="h-5 w-5 text-indigo-600" />
                  {analytics.summary.total_reservations}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {compareEnabled ? (
                  <Badge className={`inline-flex items-center gap-1 ${getDeltaBadgeClass(analytics.summary.delta_total_reservations)}`}>
                    {getTrendIcon(analytics.summary.delta_total_reservations)}
                    {formatDelta(analytics.summary.delta_total_reservations)} ({formatDeltaPct(analytics.summary.delta_pct_total_reservations)})
                  </Badge>
                ) : (
                  <p className="text-xs text-gray-500">Comparación desactivada</p>
                )}
              </CardContent>
            </Card>

            <Card className="border-border/80 shadow-sm">
              <CardHeader className="pb-2">
                <CardDescription>Total canceladas</CardDescription>
                <CardTitle className="flex items-center gap-2 text-3xl font-semibold">
                  <Ban className="h-5 w-5 text-rose-600" />
                  {analytics.summary.total_cancelled}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {compareEnabled ? (
                  <Badge className={`inline-flex items-center gap-1 ${getDeltaBadgeClass(analytics.summary.delta_total_cancelled)}`}>
                    {getTrendIcon(analytics.summary.delta_total_cancelled)}
                    {formatDelta(analytics.summary.delta_total_cancelled)} ({formatDeltaPct(analytics.summary.delta_pct_total_cancelled)})
                  </Badge>
                ) : (
                  <p className="text-xs text-gray-500">Comparación desactivada</p>
                )}
              </CardContent>
            </Card>

            <Card className="border-border/80 shadow-sm">
              <CardHeader className="pb-2">
                <CardDescription>Tasa global de cancelación</CardDescription>
                <CardTitle className="flex items-center gap-2 text-3xl font-semibold">
                  <GaugeCircle className="h-5 w-5 text-amber-600" />
                  {formatRate(analytics.summary.cancellation_rate)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {compareEnabled ? (
                  <Badge className={`inline-flex items-center gap-1 ${getDeltaBadgeClass(analytics.summary.delta_cancellation_rate)}`}>
                    {getTrendIcon(analytics.summary.delta_cancellation_rate)}
                    {formatRateDelta(analytics.summary.delta_cancellation_rate)} ({formatDeltaPct(analytics.summary.delta_pct_cancellation_rate)})
                  </Badge>
                ) : (
                  <p className="text-xs text-gray-500">Comparación desactivada</p>
                )}
              </CardContent>
            </Card>

            <Card className="border-border/80 shadow-sm">
              <CardHeader className="pb-2">
                <CardDescription>Zonas activas</CardDescription>
                <CardTitle className="flex items-center gap-2 text-3xl font-semibold">
                  <MapPinned className="h-5 w-5 text-emerald-600" />
                  {analytics.summary.active_zones}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {compareEnabled ? (
                  <Badge className={`inline-flex items-center gap-1 ${getDeltaBadgeClass(analytics.summary.delta_active_zones)}`}>
                    {getTrendIcon(analytics.summary.delta_active_zones)}
                    {formatDelta(analytics.summary.delta_active_zones)} ({formatDeltaPct(analytics.summary.delta_pct_active_zones)})
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

          {analytics.summary.total_reservations === 0 ? (
            <Card className="border-border/80 shadow-sm">
              <CardContent className="py-12 text-center text-sm text-gray-500">
                No hay reservas en el rango seleccionado.
              </CardContent>
            </Card>
          ) : (
            <>
              <Card className="border-border/80 shadow-sm">
                <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle className="text-lg">Zonas más reservadas</CardTitle>
                    <CardDescription>Ranking de espacios y objetos por volumen de reservas.</CardDescription>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={exportMostReservedZonesCsv}>
                    <Download className="mr-2 h-4 w-4" />
                    Exportar CSV
                  </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="h-[360px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={mostReservedTop}
                        layout="vertical"
                        margin={{ top: 4, right: 16, left: 6, bottom: 4 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                        <XAxis type="number" allowDecimals={false} />
                        <YAxis
                          type="category"
                          dataKey="zone_name"
                          width={190}
                          tick={{ fontSize: 12 }}
                          tickFormatter={(value: string) =>
                            value.length > 28 ? `${value.slice(0, 28)}…` : value
                          }
                        />
                        <Tooltip
                          formatter={(value: number) => [`${value}`, "Reservas"]}
                          labelFormatter={(value: string) => `Zona: ${value}`}
                        />
                        <Bar dataKey="reservations_count" radius={[0, 8, 8, 0]} fill="#4f46e5" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b text-xs uppercase text-gray-500">
                          <th className="py-2 pr-3">Zona</th>
                          <th className="py-2 pr-3">Tipo</th>
                          <th className="py-2 pr-3">Reservas</th>
                          <th className="py-2 pr-3">% total</th>
                          <th className="py-2 pr-3">Comparación</th>
                        </tr>
                      </thead>
                      <tbody>
                        {mostReservedTop.map((item) => (
                          <tr key={item.zone_id} className="border-b last:border-b-0">
                            <td className="py-2 pr-3 font-medium text-gray-900">{item.zone_name}</td>
                            <td className="py-2 pr-3">{formatResourceTypeLabel(item.resource_type)}</td>
                            <td className="py-2 pr-3">{item.reservations_count}</td>
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
                    <CardTitle className="text-lg">Franjas horarias de mayor reserva por zona</CardTitle>
                    <CardDescription>
                      Distribución horaria para detectar picos de demanda por recurso.
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <NativeSelect
                      value={selectedPeakZoneId}
                      className="sm:w-72"
                      onChange={(event) => setSelectedPeakZoneId(event.target.value)}
                    >
                      {availablePeakZones.map((zone) => (
                        <option key={zone.zone_id} value={zone.zone_id}>
                          {zone.zone_name} · {formatResourceTypeLabel(zone.resource_type)}
                        </option>
                      ))}
                    </NativeSelect>
                    <Button type="button" variant="outline" size="sm" onClick={exportPeakByZoneCsv}>
                      <Download className="mr-2 h-4 w-4" />
                      CSV
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!selectedPeakZone || peakHoursForSelectedZone.length === 0 ? (
                    <div className="rounded-md border border-dashed py-8 text-center text-sm text-gray-500">
                      No hay datos horarios para la zona seleccionada.
                    </div>
                  ) : (
                    <>
                      <p className="text-xs text-gray-500">
                        Zona seleccionada: <span className="font-medium text-gray-700">{selectedPeakZone.zone_name}</span>
                      </p>
                      <div className="h-[330px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={peakHoursForSelectedZone} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={1} angle={-35} dy={8} height={46} />
                            <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                            <Tooltip content={<PeakByZoneTooltip compareEnabled={compareEnabled} />} />
                            <Bar dataKey="reservations_count" radius={[6, 6, 0, 0]}>
                              {peakHoursForSelectedZone.map((item) => (
                                <Cell
                                  key={`${item.zone_id}-${item.hour}`}
                                  fill={item.is_peak ? "#0f766e" : "#94a3b8"}
                                />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card className="border-border/80 shadow-sm">
                <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle className="text-lg">Tasa de cancelación por zona</CardTitle>
                    <CardDescription>
                      Detecta zonas con mayor porcentaje de cancelación sobre reservas totales.
                    </CardDescription>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={exportCancellationByZoneCsv}>
                    <Download className="mr-2 h-4 w-4" />
                    Exportar CSV
                  </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="h-[360px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={cancellationByZoneTop}
                        layout="vertical"
                        margin={{ top: 4, right: 16, left: 6, bottom: 4 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                        <XAxis type="number" domain={[0, 100]} />
                        <YAxis
                          type="category"
                          dataKey="zone_name"
                          width={190}
                          tick={{ fontSize: 12 }}
                          tickFormatter={(value: string) =>
                            value.length > 28 ? `${value.slice(0, 28)}…` : value
                          }
                        />
                        <Tooltip
                          formatter={(value: number) => [`${value.toFixed(2)}%`, "Cancelación"]}
                          labelFormatter={(value: string) => `Zona: ${value}`}
                        />
                        <Bar dataKey="cancellation_rate" radius={[0, 8, 8, 0]} fill="#e11d48" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b text-xs uppercase text-gray-500">
                          <th className="py-2 pr-3">Zona</th>
                          <th className="py-2 pr-3">Tipo</th>
                          <th className="py-2 pr-3">Total</th>
                          <th className="py-2 pr-3">Canceladas</th>
                          <th className="py-2 pr-3">Tasa</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cancellationByZoneTop.map((item) => (
                          <tr key={`cancel-zone-${item.zone_id}`} className="border-b last:border-b-0">
                            <td className="py-2 pr-3 font-medium text-gray-900">{item.zone_name}</td>
                            <td className="py-2 pr-3">{formatResourceTypeLabel(item.resource_type)}</td>
                            <td className="py-2 pr-3">{item.total_reservations}</td>
                            <td className="py-2 pr-3">{item.cancelled_reservations}</td>
                            <td className="py-2 pr-3 font-semibold">{formatRate(item.cancellation_rate)}</td>
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
                    <CardTitle className="text-lg">Tasa de cancelación por usuario</CardTitle>
                    <CardDescription>
                      Ranking de usuarios por porcentaje de cancelaciones y contexto de volumen.
                    </CardDescription>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={exportCancellationByUserCsv}>
                    <Download className="mr-2 h-4 w-4" />
                    Exportar CSV
                  </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="h-[360px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={cancellationByUserTop}
                        layout="vertical"
                        margin={{ top: 4, right: 16, left: 6, bottom: 4 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                        <XAxis type="number" domain={[0, 100]} />
                        <YAxis
                          type="category"
                          dataKey="user_name"
                          width={190}
                          tick={{ fontSize: 12 }}
                          tickFormatter={(value: string) =>
                            value.length > 28 ? `${value.slice(0, 28)}…` : value
                          }
                        />
                        <Tooltip
                          formatter={(value: number) => [`${value.toFixed(2)}%`, "Cancelación"]}
                          labelFormatter={(value: string) => `Usuario: ${value}`}
                        />
                        <Bar dataKey="cancellation_rate" radius={[0, 8, 8, 0]} fill="#f97316" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b text-xs uppercase text-gray-500">
                          <th className="py-2 pr-3">Usuario</th>
                          <th className="py-2 pr-3">Total</th>
                          <th className="py-2 pr-3">Canceladas</th>
                          <th className="py-2 pr-3">Tasa</th>
                          <th className="py-2 pr-3">Comparación</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cancellationByUserTop.map((item) => (
                          <tr key={`cancel-user-${item.user_id}`} className="border-b last:border-b-0">
                            <td className="py-2 pr-3 font-medium text-gray-900">{item.user_name}</td>
                            <td className="py-2 pr-3">{item.total_reservations}</td>
                            <td className="py-2 pr-3">{item.cancelled_reservations}</td>
                            <td className="py-2 pr-3 font-semibold">{formatRate(item.cancellation_rate)}</td>
                            <td className="py-2 pr-3">
                              {compareEnabled ? (
                                <span className="text-xs text-gray-700">
                                  {formatRateDelta(item.delta)} ({formatDeltaPct(item.delta_pct)})
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
            </>
          )}
        </>
      )}
    </section>
  );
}
