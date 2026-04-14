import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  AlertCircle,
  Calendar,
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
  getAdminEventsAnalytics,
  type EventCreationByResidentItem,
  type EventsAnalyticsCompare,
  type EventsAnalyticsEventType,
  type EventsAnalyticsMeasurementType,
  type EventsAnalyticsResponse,
  type TopResidentByAttendanceItem,
} from "../../../services/eventsAnalytics";

type EventsAnalyticsFilters = {
  from: string;
  to: string;
  compare: EventsAnalyticsCompare;
  event_type: EventsAnalyticsEventType;
  creator_id: string;
};

type AttendanceBarPoint = {
  label: string;
  count: number;
  tone: "with" | "without";
};

const analyticsDateInputClassName =
  "pr-8 [color-scheme:light] [&::-webkit-calendar-picker-indicator]:m-0 [&::-webkit-calendar-picker-indicator]:h-4 [&::-webkit-calendar-picker-indicator]:w-4 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-75 hover:[&::-webkit-calendar-picker-indicator]:opacity-100";

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

  // Preserve the literal calendar date returned by backend (no browser timezone shift).
  const datePart = iso.split("T")[0] ?? "";
  const parts = datePart.split("-");
  if (parts.length !== 3) return "—";

  const [year, month, day] = parts;
  if (
    year.length !== 4 ||
    month.length !== 2 ||
    day.length !== 2 ||
    !/^\d+$/.test(`${year}${month}${day}`)
  ) {
    return "—";
  }

  return `${day}/${month}/${year}`;
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

function formatDeltaPoints(value: number | null): string {
  if (value === null) return "—";
  const absText = Math.abs(value).toFixed(2);
  return `${value >= 0 ? "+" : "-"}${absText} pp`;
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

function formatMeasurementLabel(measurementType: EventsAnalyticsMeasurementType): string {
  if (measurementType === "real_attendance") {
    return "Asistencia real";
  }
  return "Proxy por inscripciones";
}

function formatEventTypeLabel(value: EventsAnalyticsEventType): string {
  if (value === "official") return "Oficiales";
  if (value === "resident") return "Residentes";
  return "Todos";
}

function downloadCsv(filename: string, header: string[], rows: Array<Array<string | number | null>>) {
  const escapeCell = (value: string | number | null): string => {
    if (value === null || value === undefined) return "";
    const rawString = String(value);
    const safeString =
      typeof value === "string" && /^[\t\r\n ]*[=+\-@]/.test(rawString)
        ? `'${rawString}`
        : rawString;

    if (safeString.includes(",") || safeString.includes('"') || safeString.includes("\n")) {
      return `"${safeString.replace(/"/g, '""')}"`;
    }
    return safeString;
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

function AttendanceTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: AttendanceBarPoint }> }) {
  if (!active || !payload || payload.length === 0) return null;

  const point = payload[0].payload;
  return (
    <div className="rounded-md border bg-white p-2 shadow-sm">
      <p className="text-sm font-semibold">{point.label}</p>
      <p className="text-xs text-gray-700">Eventos: {point.count}</p>
    </div>
  );
}

export function EventsAnalytics() {
  const today = useMemo(() => new Date(), []);
  const [filters, setFilters] = useState<EventsAnalyticsFilters>({
    from: formatDateInput(addDays(today, -29)),
    to: formatDateInput(today),
    compare: "previous_period",
    event_type: "all",
    creator_id: "",
  });
  const [analytics, setAnalytics] = useState<EventsAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const compareEnabled = filters.compare === "previous_period";

  const hasInvalidRange = useMemo(() => {
    if (!filters.from || !filters.to) return false;
    return filters.from > filters.to;
  }, [filters.from, filters.to]);

  const loadAnalytics = useCallback(async (nextFilters: EventsAnalyticsFilters) => {
    const currentId = ++requestIdRef.current;

    const invalidRange =
      nextFilters.from !== "" && nextFilters.to !== "" && nextFilters.from > nextFilters.to;
    if (invalidRange) {
      setError("El rango temporal es inválido. Ajusta las fechas.");
      setLoading(false);
      setAnalytics(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await getAdminEventsAnalytics({
        from: nextFilters.from,
        to: nextFilters.to,
        compare: nextFilters.compare,
        event_type: nextFilters.event_type,
        creator_id: nextFilters.creator_id,
      });
      if (currentId !== requestIdRef.current) return;
      setAnalytics(response);
    } catch (err) {
      if (currentId !== requestIdRef.current) return;
      const message =
        err instanceof Error ? err.message : "No se pudieron cargar las analíticas de eventos.";
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

  const creatorOptions = useMemo(() => {
    const rows = analytics?.event_creation_by_resident || [];
    return rows.map((item) => ({ id: String(item.resident_id), name: item.resident_name }));
  }, [analytics?.event_creation_by_resident]);

  const topCreators = useMemo(
    () => (analytics?.event_creation_by_resident || []).slice(0, 10),
    [analytics?.event_creation_by_resident]
  );

  const topAttendees = useMemo(
    () => (analytics?.top_residents_by_attendance || []).slice(0, 10),
    [analytics?.top_residents_by_attendance]
  );

  const attendanceChartData = useMemo<AttendanceBarPoint[]>(() => {
    if (!analytics) return [];

    const totalEvents = analytics.attendance_overview.total_registered;
    const eventsWithParticipation = analytics.attendance_overview.total_attended;
    const withoutParticipation = Math.max(totalEvents - eventsWithParticipation, 0);

    return [
      { label: "Con participación", count: eventsWithParticipation, tone: "with" },
      { label: "Sin participación", count: withoutParticipation, tone: "without" },
    ];
  }, [analytics]);

  const hasAnyData = useMemo(() => {
    if (!analytics) return false;
    return (
      analytics.summary.total_events > 0 ||
      analytics.summary.total_event_creators > 0 ||
      analytics.summary.total_participants_or_attendees > 0
    );
  }, [analytics]);

  const exportAttendanceCsv = () => {
    if (!analytics) return;

    downloadCsv(
      "events_attendance_overview.csv",
      [
        "measurement_type",
        "total_registered",
        "total_attended",
        "attendance_rate",
        "compare_value",
        "delta",
        "delta_pct",
      ],
      [
        [
          analytics.attendance_overview.measurement_type,
          analytics.attendance_overview.total_registered,
          analytics.attendance_overview.total_attended,
          analytics.attendance_overview.attendance_rate,
          analytics.attendance_overview.compare_value,
          analytics.attendance_overview.delta,
          analytics.attendance_overview.delta_pct,
        ],
      ]
    );
  };

  const exportCreationCsv = () => {
    if (!analytics) return;

    downloadCsv(
      "events_creation_by_resident.csv",
      [
        "resident_id",
        "resident_name",
        "events_created_count",
        "pct_of_total",
        "compare_value",
        "delta",
        "delta_pct",
      ],
      analytics.event_creation_by_resident.map((item) => [
        item.resident_id,
        item.resident_name,
        item.events_created_count,
        item.pct_of_total,
        item.compare_value,
        item.delta,
        item.delta_pct,
      ])
    );
  };

  const exportAttendanceRankingCsv = () => {
    if (!analytics) return;

    downloadCsv(
      "top_residents_by_attendance.csv",
      [
        "resident_id",
        "resident_name",
        "attended_events_count",
        "registered_events_count",
        "attendance_rate",
        "compare_value",
        "delta",
        "delta_pct",
      ],
      analytics.top_residents_by_attendance.map((item) => [
        item.resident_id,
        item.resident_name,
        item.attended_events_count,
        item.registered_events_count,
        item.attendance_rate,
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
            Ajusta el rango, el tipo de evento y la comparación para actualizar el panel.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-6">
          <div className="space-y-1">
            <label htmlFor="events-analytics-from" className="text-xs font-medium text-gray-600">
              Desde
            </label>
            <Input
              id="events-analytics-from"
              type="date"
              className={analyticsDateInputClassName}
              value={filters.from}
              onChange={(event) =>
                setFilters((prev) => ({
                  ...prev,
                  from: event.target.value,
                }))
              }
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="events-analytics-to" className="text-xs font-medium text-gray-600">
              Hasta
            </label>
            <Input
              id="events-analytics-to"
              type="date"
              className={analyticsDateInputClassName}
              value={filters.to}
              onChange={(event) =>
                setFilters((prev) => ({
                  ...prev,
                  to: event.target.value,
                }))
              }
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="events-analytics-type" className="text-xs font-medium text-gray-600">
              Tipo de evento
            </label>
            <NativeSelect
              id="events-analytics-type"
              value={filters.event_type}
              onChange={(event) =>
                setFilters((prev) => ({
                  ...prev,
                  event_type: event.target.value as EventsAnalyticsEventType,
                  creator_id: "",
                }))
              }
            >
              <option value="all">Todos</option>
              <option value="official">Oficiales</option>
              <option value="resident">Residentes</option>
            </NativeSelect>
          </div>

          <div className="space-y-1">
            <label htmlFor="events-analytics-creator" className="text-xs font-medium text-gray-600">
              Creador
            </label>
            <NativeSelect
              id="events-analytics-creator"
              value={filters.creator_id}
              onChange={(event) =>
                setFilters((prev) => ({
                  ...prev,
                  creator_id: event.target.value,
                }))
              }
            >
              <option value="">Todos los creadores</option>
              {creatorOptions.map((creator) => (
                <option key={creator.id} value={creator.id}>
                  {creator.name}
                </option>
              ))}
            </NativeSelect>
          </div>

          <div className="space-y-1">
            <label htmlFor="events-analytics-compare" className="text-xs font-medium text-gray-600">
              Comparar
            </label>
            <NativeSelect
              id="events-analytics-compare"
              value={filters.compare}
              onChange={(event) =>
                setFilters((prev) => ({
                  ...prev,
                  compare: event.target.value as EventsAnalyticsCompare,
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
              className="h-9 w-full"
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
            Cargando analíticas de eventos...
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
                <CardDescription>Total de eventos del periodo</CardDescription>
                <CardTitle className="flex items-center gap-2 text-3xl font-semibold">
                  <Calendar className="h-5 w-5 text-violet-600" />
                  {analytics.summary.total_events}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {compareEnabled ? (
                  <Badge
                    className={`inline-flex items-center gap-1 ${getDeltaBadgeClass(
                      analytics.summary.delta_total_events
                    )}`}
                  >
                    {getTrendIcon(analytics.summary.delta_total_events)}
                    {formatDelta(analytics.summary.delta_total_events)} (
                    {formatDeltaPct(analytics.summary.delta_pct_total_events)})
                  </Badge>
                ) : (
                  <p className="text-xs text-gray-500">Comparación desactivada</p>
                )}
              </CardContent>
            </Card>

            <Card className="border-border/80 shadow-sm">
              <CardHeader className="pb-2">
                <CardDescription>Creadores activos del periodo</CardDescription>
                <CardTitle className="flex items-center gap-2 text-3xl font-semibold">
                  <Users className="h-5 w-5 text-blue-600" />
                  {analytics.summary.total_event_creators}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {compareEnabled ? (
                  <Badge
                    className={`inline-flex items-center gap-1 ${getDeltaBadgeClass(
                      analytics.summary.delta_total_event_creators
                    )}`}
                  >
                    {getTrendIcon(analytics.summary.delta_total_event_creators)}
                    {formatDelta(analytics.summary.delta_total_event_creators)} (
                    {formatDeltaPct(analytics.summary.delta_pct_total_event_creators)})
                  </Badge>
                ) : (
                  <p className="text-xs text-gray-500">Comparación desactivada</p>
                )}
              </CardContent>
            </Card>

            <Card className="border-border/80 shadow-sm">
              <CardHeader className="pb-2">
                <CardDescription>Participaciones registradas</CardDescription>
                <CardTitle className="flex items-center gap-2 text-3xl font-semibold">
                  <UserCheck className="h-5 w-5 text-emerald-600" />
                  {analytics.summary.total_participants_or_attendees}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {compareEnabled ? (
                  <Badge
                    className={`inline-flex items-center gap-1 ${getDeltaBadgeClass(
                      analytics.summary.delta_total_participants_or_attendees
                    )}`}
                  >
                    {getTrendIcon(analytics.summary.delta_total_participants_or_attendees)}
                    {formatDelta(analytics.summary.delta_total_participants_or_attendees)} (
                    {formatDeltaPct(
                      analytics.summary.delta_pct_total_participants_or_attendees
                    )}
                    )
                  </Badge>
                ) : (
                  <p className="text-xs text-gray-500">Comparación desactivada</p>
                )}
              </CardContent>
            </Card>

            <Card className="border-border/80 shadow-sm">
              <CardHeader className="pb-2">
                <CardDescription>Tasa global de asistencia</CardDescription>
                <CardTitle className="flex items-center gap-2 text-3xl font-semibold">
                  <Activity className="h-5 w-5 text-orange-600" />
                  {analytics.summary.attendance_rate.toFixed(2)}%
                </CardTitle>
              </CardHeader>
              <CardContent>
                {compareEnabled ? (
                  <Badge
                    className={`inline-flex items-center gap-1 ${getDeltaBadgeClass(
                      analytics.summary.delta_attendance_rate
                    )}`}
                  >
                    {getTrendIcon(analytics.summary.delta_attendance_rate)}
                    {formatDeltaPoints(analytics.summary.delta_attendance_rate)} (
                    {formatDeltaPct(analytics.summary.delta_pct_attendance_rate)})
                  </Badge>
                ) : (
                  <p className="text-xs text-gray-500">Comparación desactivada</p>
                )}
              </CardContent>
            </Card>
          </div>

          <p className="text-xs text-gray-500">
            Periodo: {formatShortDate(analytics.meta.from_value)} - {formatShortDate(analytics.meta.to_value)} ·
            Tipo: {formatEventTypeLabel(analytics.meta.event_type)}
            {compareEnabled && (
              <>
                {" "}· Comparado con {formatShortDate(analytics.meta.compare_from)} -{" "}
                {formatShortDate(analytics.meta.compare_to)}
              </>
            )}
          </p>

          {!hasAnyData ? (
            <Card className="border-border/80 shadow-sm">
              <CardContent className="py-12 text-center text-sm text-gray-500">
                No hay actividad de eventos para los filtros seleccionados.
              </CardContent>
            </Card>
          ) : (
            <>
              <Card className="border-border/80 shadow-sm">
                <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle className="text-lg">Tasa de asistencia a eventos</CardTitle>
                    <CardDescription>
                      {analytics.attendance_overview.measurement_type === "real_attendance"
                        ? "Medición basada en registros de asistencia real."
                        : "Medición proxy por participación: eventos con al menos una inscripción."}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="info">{formatMeasurementLabel(analytics.attendance_overview.measurement_type)}</Badge>
                    <Button type="button" variant="outline" size="sm" onClick={exportAttendanceCsv}>
                      <Download className="mr-2 h-4 w-4" />
                      Exportar CSV
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  <div className="space-y-3">
                    <p className="text-4xl font-semibold text-gray-900">
                      {analytics.attendance_overview.attendance_rate.toFixed(2)}%
                    </p>
                    <p className="text-sm text-gray-600">
                      {analytics.attendance_overview.total_attended} de {analytics.attendance_overview.total_registered} eventos
                      con participación.
                    </p>
                    {compareEnabled ? (
                      <Badge
                        className={`inline-flex items-center gap-1 ${getDeltaBadgeClass(
                          analytics.attendance_overview.delta
                        )}`}
                      >
                        {getTrendIcon(analytics.attendance_overview.delta)}
                        {formatDeltaPoints(analytics.attendance_overview.delta)} (
                        {formatDeltaPct(analytics.attendance_overview.delta_pct)})
                      </Badge>
                    ) : (
                      <p className="text-xs text-gray-500">Comparación desactivada</p>
                    )}
                  </div>

                  <div className="h-[260px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={attendanceChartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                        <Tooltip content={<AttendanceTooltip />} />
                        <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                          {attendanceChartData.map((item) => (
                            <Cell key={item.label} fill={item.tone === "with" ? "#0f766e" : "#94a3b8"} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/80 shadow-sm">
                <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle className="text-lg">Índice de creación de eventos por residente</CardTitle>
                    <CardDescription>
                      Ranking de residentes según volumen de eventos creados en el periodo.
                    </CardDescription>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={exportCreationCsv}>
                    <Download className="mr-2 h-4 w-4" />
                    Exportar CSV
                  </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="h-[360px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={topCreators}
                        layout="vertical"
                        margin={{ top: 4, right: 16, left: 6, bottom: 4 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                        <XAxis type="number" allowDecimals={false} />
                        <YAxis
                          type="category"
                          dataKey="resident_name"
                          width={180}
                          tick={{ fontSize: 12 }}
                          tickFormatter={(value: string) =>
                            value.length > 26 ? `${value.slice(0, 26)}…` : value
                          }
                        />
                        <Tooltip
                          formatter={(value: number) => [`${value}`, "Eventos creados"]}
                          labelFormatter={(value: string) => `Residente: ${value}`}
                        />
                        <Bar dataKey="events_created_count" radius={[0, 8, 8, 0]} fill="#2563eb" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b text-xs uppercase text-gray-500">
                          <th className="py-2 pr-3">Residente</th>
                          <th className="py-2 pr-3">Eventos</th>
                          <th className="py-2 pr-3">% del total</th>
                          <th className="py-2 pr-3">Comparación</th>
                        </tr>
                      </thead>
                      <tbody>
                        {topCreators.map((item: EventCreationByResidentItem) => (
                          <tr key={item.resident_id} className="border-b last:border-b-0">
                            <td className="py-2 pr-3 font-medium text-gray-900">{item.resident_name}</td>
                            <td className="py-2 pr-3">{item.events_created_count}</td>
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
                    <CardTitle className="text-lg">Residentes con mayor asistencia a eventos</CardTitle>
                    <CardDescription>
                      Ranking por participaciones registradas en eventos del periodo.
                    </CardDescription>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={exportAttendanceRankingCsv}>
                    <Download className="mr-2 h-4 w-4" />
                    Exportar CSV
                  </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="h-[360px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={topAttendees}
                        layout="vertical"
                        margin={{ top: 4, right: 16, left: 6, bottom: 4 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                        <XAxis type="number" allowDecimals={false} />
                        <YAxis
                          type="category"
                          dataKey="resident_name"
                          width={180}
                          tick={{ fontSize: 12 }}
                          tickFormatter={(value: string) =>
                            value.length > 26 ? `${value.slice(0, 26)}…` : value
                          }
                        />
                        <Tooltip
                          formatter={(value: number) => [`${value}`, "Participaciones"]}
                          labelFormatter={(value: string) => `Residente: ${value}`}
                        />
                        <Bar dataKey="attended_events_count" radius={[0, 8, 8, 0]} fill="#0f766e" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b text-xs uppercase text-gray-500">
                          <th className="py-2 pr-3">Residente</th>
                          <th className="py-2 pr-3">Participaciones</th>
                          <th className="py-2 pr-3">Inscripciones</th>
                          <th className="py-2 pr-3">Cobertura eventos</th>
                          <th className="py-2 pr-3">Comparación</th>
                        </tr>
                      </thead>
                      <tbody>
                        {topAttendees.map((item: TopResidentByAttendanceItem) => (
                          <tr key={item.resident_id} className="border-b last:border-b-0">
                            <td className="py-2 pr-3 font-medium text-gray-900">{item.resident_name}</td>
                            <td className="py-2 pr-3">{item.attended_events_count}</td>
                            <td className="py-2 pr-3">{item.registered_events_count}</td>
                            <td className="py-2 pr-3">{item.attendance_rate.toFixed(2)}%</td>
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
            </>
          )}
        </>
      )}
    </section>
  );
}
