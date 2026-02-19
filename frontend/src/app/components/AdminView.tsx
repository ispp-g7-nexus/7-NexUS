import { useState } from "react";
import {
  LayoutDashboard,
  Building2,
  Users,
  AlertCircle,
  UtensilsCrossed,
  BarChart3,
  Briefcase,
  Menu,
  Bell,
  LogOut,
  MessageSquare,
  Calendar,
  UserCheck,
  CalendarDays,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./ui/popover";
import { AdminDashboard } from "./admin/AdminDashboard";
import { AdminRooms } from "./admin/AdminRooms";
import { AdminStudents } from "./admin/AdminStudents";
import { AdminIncidences } from "./admin/AdminIncidences";
import { AdminKitchen } from "./admin/AdminKitchen";
import { AdminAnalytics } from "./admin/AdminAnalytics";
import { AdminStaff } from "./admin/AdminStaff";
import { AdminAnnouncements } from "./admin/AdminAnnouncements";
import { AdminReservations } from "./admin/AdminReservations";
import { AdminVisitors } from "./admin/AdminVisitors";
import { AdminEvents } from "./admin/AdminEvents";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetDescription,
} from "./ui/sheet";
import { Button } from "./ui/button";
import {
  Avatar,
  AvatarFallback,
} from "./ui/avatar";
import logo from "../../assets/568c60154d65da3b07cabfc4ed599e47f97b560a.png";

interface AdminViewProps {
  onLogout: () => void;
}

type AdminTab =
  | "dashboard"
  | "rooms"
  | "students"
  | "incidences"
  | "reservations"
  | "kitchen"
  | "analytics"
  | "staff"
  | "announcements"
  | "visitors"
  | "events";

export function AdminView({ onLogout }: AdminViewProps) {
  const [activeTab, setActiveTab] = useState<AdminTab>("dashboard");
  const [notifications, setNotifications] = useState([
    { id: 1, title: "Nueva reserva", message: "Sala de estudio reservada por Carlos R.", time: "Hace 5 min", read: false },
    { id: 2, title: "Incidencia crítica", message: "Fuga de agua en baño 204", time: "Hace 20 min", read: false },
    { id: 3, title: "Pago recibido", message: "Mensualidad recibida de Laura M.", time: "Hace 1 hora", read: true },
  ]);

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return <AdminDashboard onNavigate={(tab) => setActiveTab(tab as AdminTab)} />;
      case "rooms":
        return <AdminRooms />;
      case "students":
        return <AdminStudents />;
      case "incidences":
        return <AdminIncidences />;
      case "reservations":
        return <AdminReservations />;
      case "kitchen":
        return <AdminKitchen />;
      case "analytics":
        return <AdminAnalytics />;
      case "staff":
        return <AdminStaff />;
      case "announcements":
        return <AdminAnnouncements />;
      case "visitors":
        return <AdminVisitors />;
      case "events":
        return <AdminEvents />;
      default:
        return <AdminDashboard onNavigate={(tab) => setActiveTab(tab as AdminTab)} />;
    }
  };

  const allNavItems = [
    {
      id: "dashboard",
      label: "Panel de Control",
      icon: <LayoutDashboard className="w-5 h-5" />,
    },
    {
      id: "students",
      label: "Residentes",
      icon: <Users className="w-5 h-5" />,
    },
    {
      id: "rooms",
      label: "Habitaciones",
      icon: <Building2 className="w-5 h-5" />,
    },
    {
      id: "incidences",
      label: "Incidencias",
      icon: <AlertCircle className="w-5 h-5" />,
    },
    {
      id: "visitors",
      label: "Visitantes",
      icon: <UserCheck className="w-5 h-5" />,
    },
    {
      id: "reservations",
      label: "Reservas",
      icon: <CalendarDays className="w-5 h-5" />,
    },
    {
      id: "kitchen",
      label: "Comedor",
      icon: <UtensilsCrossed className="w-5 h-5" />,
    },
    {
      id: "analytics",
      label: "Analítica",
      icon: <BarChart3 className="w-5 h-5" />,
    },
    {
      id: "staff",
      label: "Personal",
      icon: <Briefcase className="w-5 h-5" />,
    },
    {
      id: "announcements",
      label: "Avisos",
      icon: <MessageSquare className="w-5 h-5" />,
    },
    {
      id: "events",
      label: "Eventos",
      icon: <Calendar className="w-5 h-5" />,
    },
  ];

  const currentTab = allNavItems.find((item) => item.id === activeTab);

  return (
    <div className="min-h-screen flex flex-col max-w-md mx-auto bg-[#F5F5F5]">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-100 px-4 py-3 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setActiveTab("dashboard")}
              className="w-9 h-9 flex items-center justify-center hover:opacity-80 transition-opacity cursor-pointer"
              aria-label="Volver al panel de control"
            >
              <img 
                src={logo} 
                alt="NexUS Logo" 
                className="w-full h-full object-contain"
              />
            </button>
            <div>
              <h1 className="font-semibold text-gray-900">{currentTab?.label}</h1>
              <p className="text-xs text-gray-500">Panel de Administración</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-gray-500 w-9 h-9 relative"
                >
                  <Bell className="w-5 h-5" />
                  {notifications.some(n => !n.read) && (
                    <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-white" />
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-0" align="end">
                <div className="p-4 border-b border-gray-100">
                  <h4 className="font-semibold text-gray-900">Notificaciones</h4>
                </div>
                <div className="max-h-[300px] overflow-y-auto">
                  {notifications.length > 0 ? (
                    notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={`p-4 border-b border-gray-50 hover:bg-gray-50 transition-colors ${
                          !notification.read ? "bg-blue-50/30" : ""
                        }`}
                        onClick={() => {
                          setNotifications(prev => 
                            prev.map(n => n.id === notification.id ? {...n, read: true} : n)
                          );
                        }}
                      >
                        <div className="flex justify-between items-start mb-1">
                          <h5 className={`text-sm ${!notification.read ? "font-semibold text-gray-900" : "font-medium text-gray-700"}`}>
                            {notification.title}
                          </h5>
                          <span className="text-xs text-gray-400 whitespace-nowrap ml-2">
                            {notification.time}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 line-clamp-2">
                          {notification.message}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center text-gray-500 text-sm">
                      No tienes notificaciones
                    </div>
                  )}
                </div>
                <div className="p-2 border-t border-gray-100 bg-gray-50">
                  <Button 
                    variant="ghost" 
                    className="w-full text-xs h-8 text-[#1B5E20] hover:text-[#35C759]"
                    onClick={() => setNotifications(prev => prev.map(n => ({...n, read: true})))}
                  >
                    Marcar todas como leídas
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
            <Sheet>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-gray-500 w-9 h-9"
                >
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72 flex flex-col">
                <SheetHeader>
                  <SheetTitle className="text-left">Menú</SheetTitle>
                  <SheetDescription className="sr-only">
                    Menú de navegación del panel de administración
                  </SheetDescription>
                </SheetHeader>
                <div className="mt-6 space-y-2 flex-1 overflow-y-auto pr-2">
                  {allNavItems.map((item) => (
                    <SheetTrigger key={item.id} asChild>
                      <button
                        onClick={() => setActiveTab(item.id as AdminTab)}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                          activeTab === item.id
                            ? "bg-[#35C759]/10 text-[#1B5E20]"
                            : "text-gray-600 hover:bg-gray-50"
                        }`}
                      >
                        {item.icon}
                        {item.label}
                      </button>
                    </SheetTrigger>
                  ))}
                </div>
                <div className="pt-6 pb-6 border-t border-gray-100 mt-auto">
                  <div className="bg-gray-50 rounded-xl p-4 mb-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 border border-gray-200">
                        <AvatarFallback className="bg-[#1B5E20] text-white">
                          AD
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          Administrador
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          admin@nexus.com
                        </p>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 border-red-100"
                    onClick={onLogout}
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Cerrar Sesión
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {renderContent()}
      </div>
    </div>
  );
}
