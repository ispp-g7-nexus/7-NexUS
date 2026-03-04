import {
    AlertCircle,
    BarChart3,
    BedDouble,
    Bell,
    BookOpen,
    Briefcase,
    Calendar,
    Home,
    Layout,
    LayoutDashboard, LogOut, Menu,
    Shield, User,
    UserCheck,
    Users,
    Utensils
} from "lucide-react";
import { useState } from "react";
import logo from "../assets/logo.png";
import { Events } from "../pages/Events/Events";
import { AdminIncidences } from "../pages/Incidences/components/AdminIncidences";
import { Residents } from "../pages/Residents/Residents";
import RolesPage from "../pages/RolesPage";
import Rooms from "../pages/Rooms/Rooms";
import { Staff } from "../pages/Staff/Staff";
import { AdminAnnouncements } from "../pages/announcements/AdminAnnouncements";
import { AdminProfile } from "./AdminProfile";
import { AdminReservations } from "./AdminReservations";
import { StatCard } from './statCard';
import { Button } from "./ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "./ui/sheet";

interface AdminViewProps {
    onLogout: () => void;
}

type AdminTab = "dashboard" | "rooms" | "students" | "incidences" | "reservations" | "kitchen" | "analytics" | "staff" | "announcements" | "visitors" | "events" | "roles" | "profile";

export function AdminView({ onLogout }: AdminViewProps) {
    const [activeTab, setActiveTab] = useState<AdminTab>("dashboard");
    const [notifications] = useState([{ id: 1, title: "Nueva reserva", message: "Sala reservada", time: "Hace 5 min", read: false }]);

    //navegación 
    const allNavItems = [
        { id: "dashboard", label: "Panel de Control", icon: <LayoutDashboard className="w-5 h-5" /> },
        { id: "profile", label: "Mi Perfil", icon: <User className="w-5 h-5" /> },
        { id: "rooms", label: "Habitaciones", icon: <Home className="w-5 h-5" /> },
        { id: "students", label: "Residentes", icon: <Users className="w-5 h-5" /> },
        { id: "staff", label: "Personal", icon: <Briefcase className="w-5 h-5" /> },
        { id: "incidences", label: "Incidencias", icon: <AlertCircle className="w-5 h-5" /> },
        { id: "events", label: "Eventos & Comunidad", icon: <Calendar className="w-5 h-5" /> }, 
        { id: "reservations", label: "Recursos & Reservas", icon: <BookOpen  className="w-5 h-5" /> }, 
        { id: "roles", label: "Roles", icon: <Shield className="w-5 h-5" /> },
        { id: "announcements", label: "Avisos", icon: <Bell className="w-5 h-5" /> },
    ];

    //  métricas hardcodeado 
    const metricsData = [
        { label: 'Residentes', value: '156', trend: '+8%', icon: Users, theme: 'blue', onClick: () => setActiveTab('students') },
        { label: 'Habitaciones', value: '92%', trend: '+3%', icon: BedDouble, theme: 'green', onClick: () => console.log('Rooms') },
        { label: 'Incidencias', value: '12', trend: '-15%', icon: AlertCircle, theme: 'red', onClick: () => setActiveTab('incidences') },
        { label: 'Visitantes', value: '23', trend: '+12%', icon: UserCheck, theme: 'purple', onClick: () => console.log('Visitors') },
        { label: 'Espacios Comunes', value: '8', trend: '+2', icon: Layout, theme: 'orange', onClick: () => console.log('Spaces') },
        { label: 'Menú Comedor', value: 'Ver', trend: 'Hoy', icon: Utensils, theme: 'blue', onClick: () => console.log('Menu') },
        { label: 'Estadísticas', value: 'Análisis', trend: '+5%', icon: BarChart3, theme: 'green', onClick: () => setActiveTab('analytics') },
        { label: 'Personal', value: '42', trend: 'Estable', icon: Briefcase, theme: 'purple', onClick: () => console.log('Staff') },
    ]as const;

    const today = new Date().toLocaleDateString('es-ES', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    });
    const todayCapitalized = today.charAt(0).toUpperCase() + today.slice(1);

    const currentTab = allNavItems.find((item) => item.id === activeTab) || allNavItems[0];

    const renderContent = () => {
        switch (activeTab) {
            case "roles":
                return <RolesPage />;

            case "profile":
                return <AdminProfile />;

            case "announcements":
                return (
                    <div className="p-4">
                        <AdminAnnouncements />
                    </div>
                );

            case "events":
                return (
                    <div className="p-4">
                        <Events />
                    </div>
                );

            case "reservations":
                return (
                    <div className="p-4">
                        <AdminReservations />
                    </div>
                );

            case "students":
                return (
                    <div className="p-4">
                        <Residents />
                    </div>
                );

            case "rooms":
                return (
                    <div className="p-4">
                        <Rooms />
                    </div>
                );
            case "staff":
                return (
                    <div className="p-4">
                        <Staff />
                    </div>
                );
            case "incidences":
                return (
                    <div className="p-4">
                        <AdminIncidences />
                    </div>
                );

            default:
                return (
                    <div className="p-4">
                        <div className="bg-white p-6 rounded-xl text-center text-gray-500 shadow-sm">
                            Vista de {currentTab?.label} en construcción
                        </div>
                    </div>
                );
        }
    };

    return (
        <div className="min-h-screen flex flex-col w-full bg-[#f7f4ef] relative font-sans">
            <div className="fixed inset-0 pointer-events-none z-0 opacity-50" 
                 style={{ background: `radial-gradient(circle at 20% 20%, rgba(47,168,122,0.07) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(59,125,216,0.07) 0%, transparent 50%)` }} 
            />

            <header className="bg-white/80 backdrop-blur-md border-b border-border px-4 py-3 sticky top-0 z-20">
                <div className="flex items-center justify-between max-w-7xl mx-auto w-full">
                    <div className="flex items-center gap-3">
                        <button onClick={() => setActiveTab("dashboard")} className="w-9 h-9 flex items-center justify-center">
                            <img src={logo} alt="NexUS Logo" className="w-full h-full object-contain" />
                        </button>
                        <div>
                            <h1 className="font-semibold text-gray-900 leading-none">{currentTab?.label}</h1>
                            <p className="text-[10px] uppercase tracking-wider text-gray-500 mt-1 font-bold">Panel Admin</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="ghost" size="icon" className="text-gray-500 w-9 h-9 relative">
                                    <Bell className="w-5 h-5" />
                                    <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-white" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-80 p-4">Centro de notificaciones</PopoverContent>
                        </Popover>

                        <Sheet>
                            <SheetTrigger asChild>
                                <Button variant="ghost" size="icon" className="text-gray-500 w-9 h-9">
                                    <Menu className="w-5 h-5" />
                                </Button>
                            </SheetTrigger>
                            <SheetContent side="right" className="w-72 flex flex-col">
                                <SheetHeader>
                                    <SheetTitle>Menú</SheetTitle>
                                    <SheetDescription className="sr-only">Navegación</SheetDescription>
                                </SheetHeader>
                                <div className="mt-6 space-y-2 flex-1">
                                    {allNavItems.map((item) => (
                                        <SheetTrigger key={item.id} asChild>
                                            <button
                                                onClick={() => setActiveTab(item.id as AdminTab)}
                                                className={`w-full flex items-center gap-3 px-4 py-3 text-sm rounded-xl transition-colors ${activeTab === item.id
                                                    ? 'bg-green-50 text-green-700 font-medium'
                                                    : 'text-gray-600 hover:bg-gray-50'
                                                    }`}
                                            >
                                                {item.icon} {item.label}
                                            </button>
                                        </SheetTrigger>
                                    ))}
                                </div>
                                <div className="pt-6 border-t mt-auto">
                                    <Button variant="outline" className="w-full justify-start text-red-600 border-red-100 hover:bg-red-50" onClick={onLogout}>
                                        <LogOut className="w-4 h-4 mr-2" /> Cerrar Sesión
                                    </Button>
                                </div>
                            </SheetContent>
                        </Sheet>
                    </div>
                </div>
            </header>

            <main className="flex-1 relative z-10 overflow-y-auto">
                <div className="max-w-7xl mx-auto p-6">
                    {activeTab === "dashboard" && (
                        <section className="animate-in fade-in duration-500">
                            {/* Intro Section */}
                            <div className="mb-8">
                                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-[1px] mb-1">
                                    {todayCapitalized}
                                </p>
                                <h2 className="text-3xl md:text-4xl font-serif text-gray-900">
                                    Buenos días, <em className="text-green-600 not-italic">Administrador</em>
                                </h2>
                            </div>

                            {/* Grid de StatCards */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                                {metricsData.map((metric, index) => (
                                    <StatCard key={index} {...metric} />
                                ))}
                            </div>
                        </section>
                    )}

                    {activeTab === "events" && <Events />}

                    {activeTab !== "dashboard" && activeTab !== "events" && (
                        <div className="bg-white/50 backdrop-blur-sm border border-dashed border-gray-300 p-12 rounded-3xl text-center text-gray-500">
                            <div className="max-w-xs mx-auto space-y-4">
                                <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto">
                                    {currentTab.icon}
                                </div>
                                <h3 className="text-lg font-medium text-gray-900">Vista de {currentTab.label}</h3>
                                <p className="text-sm">Estamos trabajando en esta sección para traerte la mejor experiencia de gestión.</p>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}