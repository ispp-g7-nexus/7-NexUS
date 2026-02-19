import {
  TrendingUp,
  Download,
  AlertCircle,
  FileText,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Users,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { toast } from "sonner";
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Cell, 
  Pie,
  AreaChart,
  Area
} from "recharts";

export function AdminAnalytics() {
  // Paleta NexUS
  const COLORS = ["#1B5E20", "#35C759", "#7BD14F", "#F5A623", "#94A3B8"];

  // Datos simulados para gráficas
  const occupancyData = [
    { name: "Sep", rate: 85 },
    { name: "Oct", rate: 88 },
    { name: "Nov", rate: 92 },
    { name: "Dic", rate: 90 },
    { name: "Ene", rate: 94 },
    { name: "Feb", rate: 96 },
  ];

  const buildingDistribution = [
    { name: "Torre A", value: 120 },
    { name: "Torre B", value: 95 },
    { name: "Torre C", value: 85 },
  ];

  const handleExportData = () => {
    toast.success("Datos exportados correctamente", {
      description: "El reporte detallado se ha descargado en formato PDF",
    });
  };

  return (
    <div className="space-y-6">
      {/* Banner Premium Enhaced */}
      <div className="bg-gradient-to-br from-[#1B5E20] via-[#35C759] to-[#7BD14F] text-white rounded-3xl shadow-xl p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/5 rounded-full -ml-24 -mb-24 blur-2xl"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge className="bg-white/20 hover:bg-white/30 text-white border-none px-3">PREMIUM ANALYTICS</Badge>
              <span className="text-xs text-white/70 flex items-center gap-1">
                <Activity className="w-3 h-3" /> Actualizado hoy, 09:45
              </span>
            </div>
            <h2 className="text-3xl font-bold mb-2 tracking-tight">
              Panel de Control Estratégico
            </h2>
            <p className="text-white/80 max-w-md text-sm leading-relaxed">
              Visualiza el rendimiento operativo de NexUS con métricas avanzadas e inteligencia de datos.
            </p>
          </div>
          <div className="flex gap-3 shrink-0">
            <Button
              variant="outline"
              className="bg-white/10 border-white/20 text-white hover:bg-white/20 rounded-xl"
              onClick={handleExportData}
            >
              <Download className="w-4 h-4 mr-2" /> Reporte PDF
            </Button>
            <Button
              className="bg-white text-[#1B5E20] hover:bg-gray-100 rounded-xl font-bold shadow-lg"
              onClick={() => toast.info("Generando reporte Excel...")}
            >
              <FileText className="w-4 h-4 mr-2" /> Exportar XLS
            </Button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <KpiCard 
          title="Ocupación Total" 
          value="96.2%" 
          trend="+2.4%" 
          isPositive={true} 
          icon={<Users className="w-5 h-5" />} 
          color="bg-green-50 text-green-700"
        />
        <KpiCard 
          title="Incidencias Abiertas" 
          value="14" 
          trend="-5" 
          isPositive={true} 
          icon={<AlertCircle className="w-5 h-5" />} 
          color="bg-orange-50 text-orange-700"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Occupancy Trend */}
        <Card className="lg:col-span-2 border-gray-100 shadow-sm rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-lg">Tendencia de Ocupación</CardTitle>
              <CardDescription>Evolución porcentual últimos 6 meses</CardDescription>
            </div>
            <div className="flex items-center gap-1 text-[#35C759] font-bold text-sm">
              <TrendingUp className="w-4 h-4" />
              <span>Creciendo</span>
            </div>
          </CardHeader>
          <CardContent className="pt-4 h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={occupancyData}>
                <defs>
                  <linearGradient id="colorRate" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#35C759" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#35C759" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} />
                <YAxis hide domain={[0, 100]} />
                <Tooltip 
                  contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}}
                  formatter={(value) => [`${value}%`, 'Ocupación']}
                />
                <Area 
                  type="monotone" 
                  dataKey="rate" 
                  stroke="#1B5E20" 
                  strokeWidth={3} 
                  fillOpacity={1} 
                  fill="url(#colorRate)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Building Distribution */}
        <Card className="border-gray-100 shadow-sm rounded-2xl">
          <CardHeader>
            <CardTitle className="text-lg">Distribución por Edificio</CardTitle>
            <CardDescription>Capacidad por torres</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px] flex flex-col items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={buildingDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {buildingDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-1 gap-2 w-full mt-2">
              {buildingDistribution.map((entry, index) => (
                <div key={entry.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                    <span className="text-gray-600 font-medium">{entry.name}</span>
                  </div>
                  <span className="font-bold text-gray-900">{entry.value} hab.</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function KpiCard({ title, value, trend, isPositive, icon, color }: any) {
  return (
    <Card className="border-none shadow-sm rounded-2xl overflow-hidden">
      <CardContent className="p-5">
        <div className="flex justify-between items-start mb-4">
          <div className={`p-2 rounded-xl ${color}`}>
            {icon}
          </div>
          <div className={`flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full ${
            isPositive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
          }`}>
            {isPositive ? <ArrowUpRight className="w-3 h-3 mr-0.5" /> : <ArrowDownRight className="w-3 h-3 mr-0.5" />}
            {trend}
          </div>
        </div>
        <p className="text-xs text-gray-500 font-medium mb-1 uppercase tracking-wider">{title}</p>
        <p className="text-2xl font-bold text-gray-900 tracking-tight">{value}</p>
      </CardContent>
    </Card>
  );
}
