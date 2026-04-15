import { useEffect, useState } from "react";
import { getMenuAnalytics } from "../../../services/analytics";
import { StatCard } from "../../../components/statCard";
import { InteractiveDatePicker } from "../../../components/ui/InteractiveDatePicker";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardAction,
} from "../../../components/ui/card";
import { ChartContainer } from "../../../components/ui/chart";
import MetricInfo from "../../../components/ui/MetricInfo";
import { BarChart, Bar, PieChart, Pie, Cell, Tooltip, XAxis, YAxis, CartesianGrid, Legend, LabelList } from "recharts";

interface SpecialRequester {
  user__first_name: string;
  user__last_name: string;
  user__email: string;
  request_count: number;
}

interface WeekdayStat {
  weekday: string;
  count: number;
}

interface TopMeal {
  name: string;
  count: number;
}
interface AnalyticsData {
  top_special_requesters: SpecialRequester[];
  special_requester_percentage: number;
  total_special_requests: number;
  special_requests_by_status: { pending: number; approved: number; rejected: number };
  special_requests_by_weekday: WeekdayStat[];
  average_requests_per_requester: number;
  published_menu_lead_days_avg: number | null;
  meal_type_distribution: { breakfast: number; lunch: number; dinner: number; snack: number };
  dietary_summary: { total_meals: number; vegetarian_percentage: number; vegan_percentage: number; gluten_free_percentage: number };
  top_meals: TopMeal[];
  total_residents: number;
}

export function DiningAnalytics() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const data = await getMenuAnalytics();
        setAnalytics(data);
      } catch (error) {
        console.error("Error fetching menu analytics:", error);
        setAnalytics(null);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const refresh = async (s?: string, e?: string) => {
    setLoading(true);
    try {
      const data = await getMenuAnalytics(s, e);
      setAnalytics(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const applyWindow = async () => {
    // If only start provided, treat as single-day window
    const s = startDate || undefined;
    const e = endDate || startDate || undefined;
    await refresh(s, e);
  };

  const resetWindow = async () => {
    setStartDate("");
    setEndDate("");
    await refresh();
  };

  if (loading) {
    return (
      <div className="container mx-auto p-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-semibold">Analíticas de Comedor</h1>
          <div className="flex items-center gap-3">
            <button className="px-3 py-2 bg-primary text-white rounded-md">Refrescar</button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="p-6 bg-white rounded-xl shadow-sm animate-pulse h-28" />
          <div className="p-6 bg-white rounded-xl shadow-sm animate-pulse h-28" />
          <div className="p-6 bg-white rounded-xl shadow-sm animate-pulse h-28" />
        </div>
      </div>
    );
  }

  if (!analytics) {
    return <div className="text-center p-8 bg-red-100 text-red-700 rounded-lg">Error al cargar los datos. Por favor, inténtalo de nuevo más tarde.</div>;
  }

  const COLORS = ["#4f46e5", "#06b6d4", "#f59e0b", "#ef4444", "#10b981"];

  const statusData = [
    { name: 'Pendientes', value: analytics.special_requests_by_status.pending || 0 },
    { name: 'Aprobadas', value: analytics.special_requests_by_status.approved || 0 },
    { name: 'Rechazadas', value: analytics.special_requests_by_status.rejected || 0 },
  ];

  const weekdayData = (analytics.special_requests_by_weekday || []).map((w) => ({ weekday: w.weekday, count: w.count }));

  const mealTypeData = [
    { name: 'Desayuno', value: analytics.meal_type_distribution.breakfast || 0 },
    { name: 'Comida', value: analytics.meal_type_distribution.lunch || 0 },
    { name: 'Cena', value: analytics.meal_type_distribution.dinner || 0 },
    { name: 'Merienda', value: analytics.meal_type_distribution.snack || 0 },
  ];

  const mealTypeTotal = mealTypeData.reduce((s, it) => s + (it.value || 0), 0);

  return (
    <div className="container mx-auto p-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Analíticas de Comedor</h1>
        <div className="flex items-center gap-3">
          <button onClick={() => void refresh()} className="px-3 py-2 bg-primary text-white rounded-md">Refrescar</button>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <InteractiveDatePicker value={startDate} onChange={setStartDate} id="menu-analytics-start" allowPastDates={true} />
          <span className="text-sm text-gray-500">a</span>
          <InteractiveDatePicker value={endDate} onChange={setEndDate} id="menu-analytics-end" allowPastDates={true} />
          <button onClick={applyWindow} className="px-3 py-2 bg-primary text-white rounded-md">Aplicar</button>
          <button onClick={resetWindow} className="px-3 py-2 border border-input rounded-md">Restablecer</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
        <StatCard
          title="Peticiones Especiales"
          value={analytics.total_special_requests}
          theme="blue"
          info={{ title: 'Peticiones Especiales', description: 'Total de peticiones especiales recibidas en la ventana seleccionada (o ventana por defecto si no seleccionas).'}}
        />

        <StatCard
          title="% Residentes que piden"
          value={`${analytics.special_requester_percentage}%`}
          theme="green"
          info={{ title: '% Residentes que piden', description: 'Porcentaje de residentes que han hecho al menos una petición especial en la ventana seleccionada.' }}
        />

        <StatCard
          title="Media peticiones por residente"
          value={analytics.average_requests_per_requester}
          theme="purple"
          info={{ title: 'Media por residente', description: 'Número medio de peticiones por residente que solicita especiales.' }}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Estado de Peticiones</CardTitle>
            <CardAction>
              <MetricInfo title="Estado de Peticiones" description="Distribución por estado: pendientes, aprobadas o rechazadas." />
            </CardAction>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{}} className="h-56 w-full">
              <PieChart>
                <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label>
                  {statusData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Distribución por Día</CardTitle>
            <CardAction>
              <MetricInfo title="Distribución por Día" description="Número de peticiones especiales agrupadas por día de la semana." />
            </CardAction>
          </CardHeader>
          <CardContent>
            {weekdayData.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">No hay peticiones registradas.</div>
            ) : (
              <ChartContainer config={{}} className="h-56 w-full">
                <BarChart data={weekdayData} margin={{ right: 12, left: 4 }}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="weekday" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#4f46e5" radius={6}>
                    <LabelList dataKey="count" position="top" />
                  </Bar>
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tipos de Comida (ventana seleccionada)</CardTitle>
            <CardAction>
              <MetricInfo
                title="Tipos de Comida"
                description="Distribución por tipo (Desayuno, Comida, Cena, Merienda) dentro de la ventana seleccionada. Filtra por la fecha del día del menú. Si no seleccionas ventana, se usa la ventana por defecto (8 semanas)."
              />
            </CardAction>
          </CardHeader>
          <CardContent>
            {mealTypeTotal === 0 ? (
              <div className="flex items-center justify-center h-56 text-sm text-muted-foreground">No hay datos para la ventana seleccionada.</div>
            ) : (
              <ChartContainer config={{}} className="h-56 w-full">
                <PieChart>
                  <Pie data={mealTypeData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={30} outerRadius={70} label>
                    {mealTypeData.map((_, index) => (
                      <Cell key={`cell-m-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ChartContainer>
            )}
            <div className="mt-3">
              <div className="flex flex-wrap gap-3">
                {mealTypeData.map((m, i) => {
                  const pct = mealTypeTotal > 0 ? Math.round((m.value / mealTypeTotal) * 100) : 0;
                  return (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span className="text-gray-700">{m.name}</span>
                      <span className="text-gray-500">— {m.value} ({pct}%)</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Resumen Dietético</CardTitle>
            <CardAction>
              <MetricInfo title="Resumen Dietético" description="Porcentajes de platos vegetarianos, veganos y sin gluten en la ventana analizada." />
            </CardAction>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <StatCard title="Platos (ventana)" value={analytics.dietary_summary.total_meals} theme="blue" />
              <StatCard title="% Vegetariano" value={`${analytics.dietary_summary.vegetarian_percentage}%`} theme="green" />
              <StatCard title="% Vegano" value={`${analytics.dietary_summary.vegan_percentage}%`} theme="purple" />
            </div>
            <div className="mt-4 text-sm text-gray-500">% Sin gluten: {analytics.dietary_summary.gluten_free_percentage}%</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top 10 - Peticionarios</CardTitle>
            <CardAction>
              <MetricInfo title="Top Peticionarios" description="Lista de usuarios que más peticiones especiales han realizado." />
            </CardAction>
          </CardHeader>
          <CardContent>
            {(!analytics.top_special_requesters || analytics.top_special_requesters.length === 0) ? (
              <div className="p-6 text-center text-sm text-gray-600">Aún no ha habido ninguna petición especial.</div>
            ) : (
              <ul className="space-y-2">
                {analytics.top_special_requesters.map((r, i) => (
                  <li key={i} className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{r.user__first_name} {r.user__last_name}</div>
                      <div className="text-xs text-gray-500">{r.user__email}</div>
                    </div>
                    <div className="text-sm font-semibold">{r.request_count}</div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top platos</CardTitle>
          </CardHeader>
          <div className="px-4 pt-0 text-xs text-gray-500">Calculado sobre la ventana seleccionada.</div>
          <CardContent>
            {(!analytics.top_meals || analytics.top_meals.length === 0) ? (
              <div className="p-6 text-center text-sm text-gray-600">No hay platos suficientes para mostrar un ranking.</div>
            ) : (
              <ul className="space-y-2">
                {analytics.top_meals.map((m, i) => (
                  <li key={i} className="flex items-center justify-between text-sm">
                    <div className="truncate">{m.name}</div>
                    <div className="font-semibold">{m.count}</div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
