import {
  Users,
  Building2,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  UserCheck,
  Calendar,
  UtensilsCrossed,
  BarChart3,
  Briefcase,
  MessageSquare,
  CalendarDays,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../ui/card";

interface AdminDashboardProps {
  onNavigate?: (tab: string) => void;
}

export function AdminDashboard({ onNavigate }: AdminDashboardProps) {
  return (
    <div className="space-y-4 pb-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          icon={<Users className="w-5 h-5 text-blue-600" />}
          label="Residentes"
          value="156"
          change="+8%"
          trend="up"
          bgIcon="bg-blue-50"
          onClick={() => onNavigate?.("students")}
        />
        <StatCard
          icon={<Building2 className="w-5 h-5 text-[#35C759]" />}
          label="Habitaciones"
          value="92%"
          change="+3%"
          trend="up"
          bgIcon="bg-[#35C759]/10"
          onClick={() => onNavigate?.("rooms")}
        />
        <StatCard
          icon={<AlertCircle className="w-5 h-5 text-orange-600" />}
          label="Incidencias"
          value="12"
          change="-15%"
          trend="down"
          bgIcon="bg-orange-50"
          onClick={() => onNavigate?.("incidences")}
        />
        <StatCard
          icon={<UserCheck className="w-5 h-5 text-indigo-600" />}
          label="Visitantes"
          value="23"
          change="+12%"
          trend="up"
          bgIcon="bg-indigo-50"
          onClick={() => onNavigate?.("visitors")}
        />
        <StatCard
          icon={<Calendar className="w-5 h-5 text-purple-600" />}
          label="Reservas"
          value="8"
          change="+2"
          trend="up"
          bgIcon="bg-purple-50"
          onClick={() => onNavigate?.("reservations")}
        />
        <StatCard
          icon={<UtensilsCrossed className="w-5 h-5 text-amber-600" />}
          label="Comedor"
          value="Menu Hoy"
          change="Pasta"
          trend="up"
          bgIcon="bg-amber-50"
          onClick={() => onNavigate?.("kitchen")}
        />
        <StatCard
          icon={<BarChart3 className="w-5 h-5 text-emerald-600" />}
          label="Analítica"
          value="Ver"
          change="Métricas"
          trend="up"
          bgIcon="bg-emerald-50"
          onClick={() => onNavigate?.("analytics")}
        />
        <StatCard
          icon={<Briefcase className="w-5 h-5 text-slate-600" />}
          label="Personal"
          value="14"
          change="Activos"
          trend="up"
          bgIcon="bg-slate-50"
          onClick={() => onNavigate?.("staff")}
        />
        <StatCard
          icon={<CalendarDays className="w-5 h-5 text-pink-600" />}
          label="Eventos"
          value="3"
          change="Activos"
          trend="up"
          bgIcon="bg-pink-50"
          onClick={() => onNavigate?.("events")}
        />
        <StatCard
          icon={<MessageSquare className="w-5 h-5 text-[#FDB462]" />}
          label="Avisos"
          value="3"
          change="Nuevos"
          trend="up"
          bgIcon="bg-[#FDB462]/10"
          onClick={() => onNavigate?.("announcements")}
        />
      </div>

      {/* Activity Section */}
      <Card className="border border-gray-100 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-gray-900">
            Actividad Reciente
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <ActivityItem
            title="Check-in completado"
            desc="Carlos Ruiz - Hab 305"
            time="Hace 2 min"
            initials="CR"
          />
          <ActivityItem
            title="Nueva incidencia"
            desc="Fuga de agua - Baño P2"
            time="Hace 15 min"
            initials="INC"
            type="warning"
          />
          <ActivityItem
            title="Check-out completado"
            desc="Laura M. - Hab 208"
            time="Hace 1 hora"
            initials="LM"
          />
          <ActivityItem
            title="Reserva confirmada"
            desc="Sala de estudio - María S."
            time="Hace 2 horas"
            initials="MS"
          />
        </CardContent>
      </Card>

      {/* Occupancy Section */}
      <Card className="border border-gray-100 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-gray-900">
            Ocupación por Edificio
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <OccupancyBar
            building="Edificio A"
            occupied={45}
            total={50}
          />
          <OccupancyBar
            building="Edificio B"
            occupied={38}
            total={40}
          />
          <OccupancyBar
            building="Edificio C"
            occupied={20}
            total={30}
          />
        </CardContent>
      </Card>
    </div>
  );
}

// Sub-components
function StatCard({
  icon,
  label,
  value,
  change,
  trend,
  bgIcon,
  onClick,
}: any) {
  return (
    <Card
      className="border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-pointer hover:scale-[1.02]"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className={`p-2 rounded-lg ${bgIcon}`}>
            {icon}
          </div>
          <span
            className={`text-[10px] font-medium px-2 py-1 rounded-full flex items-center gap-0.5 ${
              trend === "up"
                ? "bg-green-50 text-green-700"
                : "bg-red-50 text-red-700"
            }`}
          >
            {trend === "up" ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {change}
          </span>
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-0.5">
          {value}
        </h3>
        <p className="text-xs text-gray-500">{label}</p>
      </CardContent>
    </Card>
  );
}

function ActivityItem({
  title,
  desc,
  time,
  initials,
  type,
}: any) {
  return (
    <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors">
      <div
        className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold ${
          type === "warning"
            ? "bg-orange-100 text-orange-700"
            : "bg-[#35C759]/10 text-[#35C759]"
        }`}
      >
        {initials}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">
          {title}
        </p>
        <p className="text-xs text-gray-500 truncate">{desc}</p>
      </div>
      <span className="text-[10px] text-gray-400 whitespace-nowrap">{time}</span>
    </div>
  );
}

function OccupancyBar({ building, occupied, total }: any) {
  const percentage = (occupied / total) * 100;
  return (
    <div>
      <div className="flex justify-between mb-2 text-sm">
        <span className="font-medium text-gray-700">
          {building}
        </span>
        <span className="text-gray-500 text-xs">
          {occupied}/{total}
        </span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-[#7BD14F] to-[#35C759] rounded-full transition-all duration-1000"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}