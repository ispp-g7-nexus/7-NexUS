import { useEffect, useState } from "react";
import { getMembershipAnalytics } from "../../../services/analytics";
import { StatCard } from "../../../components/statCard";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardAction,
} from "../../../components/ui/card";
import {
  ChartContainer,
} from "../../../components/ui/chart";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Pie, PieChart, Cell, Tooltip, Legend, LabelList, LineChart, Line } from "recharts";
import MetricInfo from "../../../components/ui/MetricInfo";

export function PeopleAnalytics() {
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const data = await getMembershipAnalytics();
        setAnalytics(data);
      } catch (error) {
        console.error("Error fetching analytics data:", error);
        setAnalytics(null);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);


  // Small inline icons for stat cards
  const HomeIcon = ({ size = 20 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3 10.5L12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1V10.5z" stroke="#1f2937" strokeWidth="1.2" fill="#fef3c7" />
    </svg>
  );

  const ClockIcon = ({ size = 20 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="9" stroke="#1f2937" strokeWidth="1.2" fill="#ecfdf5" />
      <path d="M12 7v6l4 2" stroke="#1f2937" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );

  const StaffIcon = ({ size = 20 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" stroke="#1f2937" strokeWidth="1.2" fill="#ede9fe" />
      <path d="M4 20a6 6 0 0 1 16 0" stroke="#1f2937" strokeWidth="1.2" fill="none" />
    </svg>
  );

  if (loading) {
    return (
      <div className="container mx-auto p-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-semibold">Analíticas de Membresías</h1>
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

  const residentsWithoutRoom = analytics?.residents_without_room ?? 0;
  const avgResidents = analytics?.average_stay?.residents ?? 0;
  const avgStaff = analytics?.average_stay?.staff ?? 0;
  const activeByRole = analytics?.active_members_by_role ?? [];
  const evolution = analytics?.membership_evolution ?? [];
  const staffCapacity = analytics?.staff_capacity ?? {};



  const COLORS = ["#0088FE", "#FF8042"];

  // Transform data into chart-friendly formats with safe fallbacks
  const activeByRoleData = (activeByRole || []).map((item: any) => ({
    label:
      item['role__name'] || item.role || item.role_name || (item.role && item.role.name) || 'Sin rol',
    count: Number(item.count || item.value || 0),
  })).sort((a: any, b: any) => b.count - a.count);

  const evolutionData = (evolution || []).map((item: any) => ({
    month: item.month,
    residents: Number(item.residents || 0),
    staff: Number(item.staff || 0),
  })).sort((a: any, b: any) => new Date(a.month).getTime() - new Date(b.month).getTime());

  return (
    <div className="container mx-auto p-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Analíticas de Membresías</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setLoading(true);
              getMembershipAnalytics()
                .then((d) => setAnalytics(d))
                .catch((e) => {
                  console.error(e);
                  setAnalytics(null);
                })
                .finally(() => setLoading(false));
            }}
            className="px-3 py-2 bg-primary text-white rounded-md"
          >
            Refrescar
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <StatCard
            title="Residentes sin Habitación"
            value={residentsWithoutRoom}
            theme="red"
            icon={HomeIcon}
            info={{ title: 'Residentes sin Habitación', description: 'Número de residentes activos que actualmente no tienen una habitación asignada. Útil para medir necesidades de alojamiento.' }}
          />
        </div>

        <div>
          <StatCard
            title="Estancia Media Residentes (días)"
            value={avgResidents}
            theme="green"
            icon={ClockIcon}
            info={{ title: 'Estancia Media Residentes (días)', description: 'Promedio de días que permanecen los residentes desde su alta hasta la fecha actual o su baja. Indica rotación/residencia media.' }}
          />
        </div>

        <div>
          <StatCard
            title="Estancia Media Staff (días)"
            value={avgStaff}
            theme="purple"
            icon={StaffIcon}
            info={{ title: 'Estancia Media Staff (días)', description: 'Promedio de días que el personal ha permanecido activo (desde su alta). Ayuda a entender la estabilidad del staff.' }}
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Miembros Activos por Rol</CardTitle>
            <CardAction>
              <MetricInfo
                title="Miembros Activos por Rol"
                description="Distribución de miembros activos agrupados por rol. Muestra qué roles tienen mayor número de usuarios activos en el periodo seleccionado."
              />
            </CardAction>
          </CardHeader>
          <CardContent>
            {activeByRoleData.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">No hay datos para el rango seleccionado.</div>
            ) : (
              <ChartContainer config={{}} className="h-56 w-full">
                <BarChart data={activeByRoleData} margin={{ right: 16, left: 8 }}>
                  <defs>
                    <linearGradient id="gradRole" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="#4f46e5" stopOpacity={0.95} />
                      <stop offset="100%" stopColor="#06b6d4" stopOpacity={0.7} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="label" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="count" fill="url(#gradRole)" radius={6}>
                    <LabelList dataKey="count" position="top" />
                  </Bar>
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Staff: De Vacaciones vs. Activos</CardTitle>
            <CardAction>
              <MetricInfo
                title="Staff - Vacaciones"
                description="Comparativa entre miembros del staff que están de vacaciones y los que no lo están (estado 'Vacaciones' en su perfil)."
              />
            </CardAction>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{}} className="h-56 w-full">
              {(!analytics?.staff_vacation) ? (
                <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">No hay datos disponibles.</div>
              ) : (
                (() => {
                  const sv = analytics.staff_vacation;
                  const pieData = [
                    { name: 'De Vacaciones', value: sv.on_vacation || 0 },
                    { name: 'No de Vacaciones', value: sv.not_on_vacation || 0 },
                  ];
                  return (
                    <PieChart>
                      <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={80} label>
                        {pieData.map((_entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  );
                })()
              )}
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Evolución de Membresías</CardTitle>
            <CardAction>
              <MetricInfo
                title="Evolución de Membresías"
                description="Número de nuevas membresías por mes en el rango seleccionado. Permite identificar tendencias y picos de altas."
              />
            </CardAction>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{}} className="h-56 w-full">
              {evolutionData.length === 0 ? (
                <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">No hay datos para el rango seleccionado.</div>
              ) : (
                <LineChart data={evolutionData} margin={{ right: 12, left: 4 }}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="month" tickFormatter={(value) => new Date(value).toLocaleDateString('es-ES', { month: 'short' })} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="residents" name="Residentes" stroke="#2e7d32" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="staff" name="Staff" stroke="#4f46e5" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              )}
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="md:col-span-2 lg:col-span-3">
          <CardHeader>
            <CardTitle>Capacidad Operativa del Staff</CardTitle>
            <CardAction>
              <MetricInfo
                title="Capacidad Operativa del Staff"
                description="Representa la cantidad de miembros del staff que pueden acceder a cada pantalla o módulo según su rol. No incluye al administrador general; cada entrada indica cuántos miembros tienen permiso para esa pantalla específica."
              />
            </CardAction>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {Object.entries(staffCapacity).map(([perm, count]) => (
                <StatCard key={perm} title={perm} value={count as number} />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
