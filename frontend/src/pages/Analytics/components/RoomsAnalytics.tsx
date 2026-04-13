import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  BedDouble,
  Building2,
  RefreshCw,
  Users,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../components/ui/card";
import {
  type BedroomAnalyticsResponse,
  type OccupationByBuilding,
  type OccupationByType,
  type OccupationByYear,
  getBedroomAnalytics,
} from "../../../services/bedrooms";

// ── Tooltip: occupation by building ──────────────────────────────────────────

function BuildingTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: OccupationByBuilding }>;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-md border bg-white p-2 shadow-sm text-xs">
      <p className="font-semibold mb-1">{d.edificio}</p>
      <p className="text-gray-700">Habitaciones: {d.total_rooms}</p>
      <p className="text-gray-700">Capacidad total: {d.total_capacity}</p>
      <p className="text-gray-700">Habitaciones ocupadas: {d.occupied_rooms}</p>
      <p className="text-gray-700">Ocupantes: {d.occupants}</p>
      <p className="font-medium text-indigo-700">Tasa: {d.occupation_rate}%</p>
    </div>
  );
}

// ── Tooltip: occupation by type ───────────────────────────────────────────────

function TypeTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: OccupationByType }>;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-md border bg-white p-2 shadow-sm text-xs">
      <p className="font-semibold mb-1">Tipo: {d.tipo}</p>
      <p className="text-gray-700">Habitaciones: {d.total_rooms}</p>
      <p className="text-gray-700">Capacidad total: {d.total_capacity}</p>
      <p className="text-gray-700">Ocupantes: {d.occupants}</p>
      <p className="font-medium text-teal-700">Tasa: {d.occupation_rate}%</p>
    </div>
  );
}

// ── Tooltip: occupation by year ───────────────────────────────────────────────

function YearTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: OccupationByYear }>;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-md border bg-white p-2 shadow-sm text-xs">
      <p className="font-semibold mb-1">Año {d.year}</p>
      <p className="text-gray-700">Asignaciones: {d.assignments}</p>
    </div>
  );
}

// ── Type color map ────────────────────────────────────────────────────────────

const TYPE_COLORS: Record<string, string> = {
  Individual: "#6366f1",
  Doble: "#0d9488",
  Triple: "#f59e0b",
};

function typeColor(tipo: string): string {
  return TYPE_COLORS[tipo] ?? "#94a3b8";
}

// ── Main component ────────────────────────────────────────────────────────────

export function RoomsAnalytics() {
  const [analytics, setAnalytics] = useState<BedroomAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const load = async () => {
    const currentId = ++requestIdRef.current;
    setLoading(true);
    setError(null);
    try {
      const data = await getBedroomAnalytics();
      if (currentId !== requestIdRef.current) return;
      setAnalytics(data);
    } catch (err) {
      if (currentId !== requestIdRef.current) return;
      const msg = err instanceof Error ? err.message : "No se pudieron cargar las analíticas de habitaciones.";
      setError(msg);
      setAnalytics(null);
      toast.error(msg);
    } finally {
      if (currentId === requestIdRef.current) setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  return (
    <section className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Analíticas de Habitaciones</h2>
          <p className="text-sm text-gray-500 mt-0.5">Ocupación actual por edificio, tipo e histórico anual.</p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-3 py-1.5 text-sm hover:bg-accent disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Actualizar
        </button>
      </div>

      {/* ── Loading state ── */}
      {loading && !analytics && (
        <Card className="border-border/80 shadow-sm">
          <CardContent className="flex items-center justify-center gap-2 py-12 text-sm text-gray-500">
            <RefreshCw className="h-4 w-4 animate-spin" />
            Cargando analíticas de habitaciones...
          </CardContent>
        </Card>
      )}

      {/* ── Error state ── */}
      {!loading && error && (
        <Card className="border-red-200 bg-red-50/30 shadow-sm">
          <CardContent className="flex flex-col gap-4 py-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-sm text-red-700">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
            <button
              type="button"
              onClick={() => void load()}
              className="rounded-md border border-input bg-background px-3 py-1.5 text-sm hover:bg-accent"
            >
              Reintentar
            </button>
          </CardContent>
        </Card>
      )}

      {/* ── Data ── */}
      {!error && analytics && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <Card className="border-border/80 shadow-sm">
              <CardHeader className="pb-2">
                <CardDescription>Total habitaciones</CardDescription>
                <CardTitle className="flex items-center gap-2 text-3xl font-semibold">
                  <BedDouble className="h-5 w-5 text-indigo-500" />
                  {analytics.summary.total_rooms}
                </CardTitle>
              </CardHeader>
            </Card>

            <Card className="border-border/80 shadow-sm">
              <CardHeader className="pb-2">
                <CardDescription>Capacidad total</CardDescription>
                <CardTitle className="flex items-center gap-2 text-3xl font-semibold">
                  <Users className="h-5 w-5 text-teal-500" />
                  {analytics.summary.total_capacity}
                </CardTitle>
              </CardHeader>
            </Card>

            <Card className="border-border/80 shadow-sm">
              <CardHeader className="pb-2">
                <CardDescription>Ocupantes actuales</CardDescription>
                <CardTitle className="flex items-center gap-2 text-3xl font-semibold">
                  <Users className="h-5 w-5 text-amber-500" />
                  {analytics.summary.total_occupants}
                </CardTitle>
              </CardHeader>
            </Card>

            <Card className="border-border/80 shadow-sm">
              <CardHeader className="pb-2">
                <CardDescription>Tasa de ocupación</CardDescription>
                <CardTitle className="flex items-center gap-2 text-3xl font-semibold">
                  <Building2 className="h-5 w-5 text-purple-500" />
                  {analytics.summary.overall_occupation_rate}%
                </CardTitle>
              </CardHeader>
            </Card>
          </div>

          {analytics.summary.total_rooms === 0 ? (
            <Card className="border-border/80 shadow-sm">
              <CardContent className="py-12 text-center text-sm text-gray-500">
                No hay habitaciones registradas en esta residencia.
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Chart 1 – Ocupación por edificio */}
              <Card className="border-border/80 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg">Ocupación por edificio</CardTitle>
                  <CardDescription>
                    Tasa de ocupación (%) para cada edificio. El tooltip muestra el detalle completo.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {analytics.occupation_by_building.length === 0 ? (
                    <p className="py-8 text-center text-sm text-gray-500">
                      No hay datos de edificios disponibles.
                    </p>
                  ) : (
                    <div className="h-[320px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={analytics.occupation_by_building}
                          layout="vertical"
                          margin={{ top: 4, right: 48, left: 8, bottom: 4 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                          <XAxis type="number" domain={[0, 100]} unit="%" tick={{ fontSize: 11 }} />
                          <YAxis
                            type="category"
                            dataKey="edificio"
                            width={130}
                            tick={{ fontSize: 12 }}
                            tickFormatter={(v: string) => (v.length > 20 ? `${v.slice(0, 20)}…` : v)}
                          />
                          <Tooltip content={<BuildingTooltip />} />
                          <Bar dataKey="occupation_rate" radius={[0, 6, 6, 0]} fill="#6366f1">
                            <LabelList dataKey="occupation_rate" position="right" formatter={(v: number) => `${v}%`} style={{ fontSize: 11, fill: "#374151" }} />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Chart 2 – Por tipo de habitación */}
              <Card className="border-border/80 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg">Ocupación por tipo de habitación</CardTitle>
                  <CardDescription>
                    Comparativa de ocupantes vs. capacidad total según el tipo de habitación.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {analytics.occupation_by_type.length === 0 ? (
                    <p className="py-8 text-center text-sm text-gray-500">
                      No hay datos de tipos disponibles.
                    </p>
                  ) : (
                    <div className="h-[280px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={analytics.occupation_by_type}
                          margin={{ top: 8, right: 16, left: 0, bottom: 4 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="tipo" tick={{ fontSize: 13 }} />
                          <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                          <Tooltip content={<TypeTooltip />} />
                          <Bar dataKey="total_capacity" name="Capacidad" radius={[6, 6, 0, 0]} fill="#e2e8f0">
                            {analytics.occupation_by_type.map((item) => (
                              <Cell key={item.tipo} fill="#e2e8f0" />
                            ))}
                          </Bar>
                          <Bar dataKey="occupants" name="Ocupantes" radius={[6, 6, 0, 0]}>
                            {analytics.occupation_by_type.map((item) => (
                              <Cell key={item.tipo} fill={typeColor(item.tipo)} />
                            ))}
                            <LabelList dataKey="occupation_rate" position="top" formatter={(v: number) => `${v}%`} style={{ fontSize: 11, fill: "#374151" }} />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                  <div className="mt-3 flex flex-wrap gap-3 text-xs text-gray-500">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="inline-block h-3 w-3 rounded-sm bg-slate-200" />
                      Capacidad total
                    </span>
                    {analytics.occupation_by_type.map((item) => (
                      <span key={item.tipo} className="inline-flex items-center gap-1.5">
                        <span className="inline-block h-3 w-3 rounded-sm" style={{ backgroundColor: typeColor(item.tipo) }} />
                        {item.tipo}: {item.occupants}/{item.total_capacity}
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Chart 3 – Índice de ocupación por años */}
              <Card className="border-border/80 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg">Índice de ocupación por años</CardTitle>
                  <CardDescription>
                    Número de asignaciones de estudiante a habitación registradas cada año.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {analytics.occupation_by_year.length === 0 ? (
                    <p className="py-8 text-center text-sm text-gray-500">
                      No hay datos históricos de asignaciones disponibles.
                    </p>
                  ) : (
                    <div className="h-[280px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={analytics.occupation_by_year}
                          margin={{ top: 8, right: 16, left: 0, bottom: 4 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="year" tick={{ fontSize: 12 }} />
                          <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                          <Tooltip content={<YearTooltip />} />
                          <Bar dataKey="assignments" name="Asignaciones" radius={[6, 6, 0, 0]} fill="#7c5cbf">
                            <LabelList dataKey="assignments" position="top" style={{ fontSize: 11, fill: "#374151" }} />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </>
      )}
    </section>
  );
}
