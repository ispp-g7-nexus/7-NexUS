import { AlertCircle, BarChart3, BedDouble, Bell, BookOpen, Briefcase, Calendar, Home, Layout, LayoutDashboard, LogOut, Menu, MessageSquare, Shield, User, UserCheck, Users, Utensils } from "lucide-react";
import { useState } from "react";
import { Events } from "../pages/Social/Events/Events";
import { Residents } from "../pages/Residents/Residents";
import logo from "../assets/logo.png";
import { AdminIncidences } from "../pages/Incidences/components/AdminIncidences";
import RolesPage from "../pages/RolesPage";
import Rooms from "../pages/Rooms/Rooms";
import { Staff } from "../pages/Staff/Staff";
import { AdminAnnouncements } from "../pages/announcements/AdminAnnouncements";
import { AdminProfile } from "./AdminProfile";
import { AdminReservations } from "./AdminReservations";
import { AdminChats } from "../pages/Chats/AdminChats";
import { AdminMenuView } from "../pages/Menu/AdminMenuView";
import { StatCard } from "./statCard";
import { Button } from "./ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "./ui/sheet";
import { useAdminNotifications, type AdminNotificationSource } from "./useAdminNotifications";

interface AdminViewProps {
    onLogout: () => void;
    currentUser: { name: string; email: string } | null;
}

type AdminTab = "dashboard" | "rooms" | "students" | "incidences" | "reservations" | "kitchen" | "analytics" | "staff" | "announcements" | "visitors" | "events" | "roles" | "profile" | "chats";

const formatRelativeTime = (isoDate: string) => {
    const parsedTime = Date.parse(isoDate);
    if (Number.isNaN(parsedTime)) {
        return "Ahora";
    }

    const diffInMinutes = Math.max(0, Math.floor((Date.now() - parsedTime) / 60000));

    if (diffInMinutes < 1) return "Ahora";
    if (diffInMinutes < 60) return `Hace ${diffInMinutes} min`;

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `Hace ${diffInHours} h`;

    const diffInDays = Math.floor(diffInHours / 24);
    return `Hace ${diffInDays} d`;
};

const getCardClassesBySource = (source: AdminNotificationSource) => {
    if (source === "incidences") return "bg-red-50 border-red-200";
    if (source === "announcements") return "bg-blue-50 border-blue-200";
    if (source === "events") return "bg-yellow-50 border-yellow-200";
    return "bg-green-50 border-green-200";
};

const getTabByNotificationSource = (source: AdminNotificationSource): AdminTab => {
    if (source === "incidences") return "incidences";
    if (source === "announcements") return "announcements";
    if (source === "events") return "events";
    return "reservations";
};

export function AdminView({ onLogout, currentUser }: AdminViewProps) {
    const [activeTab, setActiveTab] = useState<AdminTab>("dashboard");
    const [reservationsSubTab, setReservationsSubTab] = useState("espacios");
    const {
        notifications,
        isNotificationsOpen,
        notificationsLoading,
        seenNotificationIds,
        unreadCount,
        unreadIncidencesCount,
        unreadAnnouncementsCount,
        hasUnreadNotifications,
        handleNotificationsOpenChange,
        handleOpenNotification,
        handleNavbarModuleAccess,
    } = useAdminNotifications();

    const allNavItems = [
        { id: "dashboard", label: "Panel de Control", icon: <LayoutDashboard className="w-5 h-5" /> },
        { id: "profile", label: "Mi Perfil", icon: <User className="w-5 h-5" /> },
        { id: "rooms", label: "Habitaciones", icon: <Home className="w-5 h-5" /> },
        { id: "students", label: "Residentes", icon: <Users className="w-5 h-5" /> },
        { id: "staff", label: "Personal", icon: <Briefcase className="w-5 h-5" /> },
        { id: "incidences", label: "Incidencias", icon: <AlertCircle className="w-5 h-5" /> },
        { id: "kitchen", label: "Menú Comedor", icon: <Utensils className="w-5 h-5" /> },
        { id: "events", label: "Eventos & Comunidad", icon: <Calendar className="w-5 h-5" /> },
        { id: "reservations", label: "Recursos & Reservas", icon: <BookOpen className="w-5 h-5" /> },
        { id: "roles", label: "Roles", icon: <Shield className="w-5 h-5" /> },
        { id: "announcements", label: "Avisos", icon: <Bell className="w-5 h-5" /> },
    ];

    const metricsData = [
        { label: 'Residentes',      value: '156', trend: '+8%',    icon: Users,      theme: 'blue'   as const, onClick: () => setActiveTab('students')     },
        { label: 'Habitaciones',    value: '92%', trend: '+3%',    icon: BedDouble,  theme: 'green'  as const, onClick: () => setActiveTab('rooms')        },
        { label: 'Incidencias',     value: '12',  trend: '-15%',   icon: AlertCircle,theme: 'red'    as const, onClick: () => setActiveTab('incidences')   },
        { label: 'Visitantes',      value: '23',  trend: '+12%',   icon: UserCheck,  theme: 'purple' as const, onClick: () => setActiveTab('visitors')     },
        { label: 'Espacios Comunes',value: '8',   trend: '+2',     icon: Layout,     theme: 'orange' as const, onClick: () => setActiveTab('reservations') },
        { label: 'Chats',           value: '2',   trend: '', icon: MessageSquare, theme: 'blue' as const, onClick: () => setActiveTab('chats')        },
        { label: 'Menú Comedor',    value: 'Ver', trend: 'Hoy',    icon: Utensils,   theme: 'blue'   as const, onClick: () => setActiveTab('kitchen')      },
        { label: 'Estadísticas',    value: 'Ver', trend: '+5%',    icon: BarChart3,  theme: 'green'  as const, onClick: () => setActiveTab('analytics')    },
        { label: 'Personal',        value: '42',  trend: 'Estable',icon: Briefcase,  theme: 'purple' as const, onClick: () => setActiveTab('staff')        },
    ];

    const today = new Date().toLocaleDateString('es-ES', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    });
    const todayCapitalized = today.charAt(0).toUpperCase() + today.slice(1);

    const currentTab = allNavItems.find((item) => item.id === activeTab) || allNavItems[0];

    const renderContent = () => {
        switch (activeTab) {
            case "dashboard":
                return (
                    <div className="p-6">
                        <div className="mb-8">
                            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-[1px] mb-1">
                                {todayCapitalized}
                            </p>
                            <h2 className="text-3xl font-serif text-gray-900">
                                Buenos días, <em className="text-green-600 not-italic">Administrador</em>
                            </h2>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            {metricsData.map((metric, index) => (
                                <StatCard key={index} {...metric} />
                            ))}
                        </div>
                    </div>
                );

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
                        <AdminReservations key={reservationsSubTab} defaultTab={reservationsSubTab} />
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

            case "chats":
                return (
                    <div className="p-4">
                        <AdminChats />
                    </div>
                );
            case "kitchen":
                return <AdminMenuView />;

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
        <div className="min-h-screen flex flex-col w-full bg-background relative">
            <header className="bg-card border-b border-border px-4 py-3 sticky top-0 z-10">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button onClick={() => setActiveTab("dashboard")} className="w-9 h-9 flex items-center justify-center">
                            <img src={logo} alt="NexUS Logo" className="w-full h-full object-contain" />
                        </button>
                        <div>
                            <h1 className="font-semibold text-gray-900">{currentTab?.label}</h1>
                            <p className="text-xs text-gray-500">Panel de Administración</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Popover open={isNotificationsOpen} onOpenChange={handleNotificationsOpenChange}>
                            <PopoverTrigger asChild>
                                <Button variant="ghost" size="icon" className="text-gray-500 w-9 h-9 relative">
                                    <Bell className="w-5 h-5" />
                                    {hasUnreadNotifications && <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-white" />}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent align="end" className="w-80 p-0">
                                <div className="max-h-[70vh] overflow-y-auto rounded-md bg-white p-4">
                                    <div className="mb-3 flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                            <Bell className="h-5 w-5 text-[#35C759]" />
                                            <h3 className="font-semibold text-gray-900">Notificaciones</h3>
                                        </div>
                                        {unreadCount > 0 && (
                                            <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                                                {unreadCount} nuevas
                                            </span>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        {notificationsLoading && notifications.length === 0 ? (
                                            <p className="py-4 text-sm text-gray-500">Cargando notificaciones...</p>
                                        ) : notifications.length === 0 ? (
                                            <p className="py-4 text-sm text-gray-500">No hay notificaciones pendientes.</p>
                                        ) : (
                                            notifications.map((notification) => {
                                                const isSeen = seenNotificationIds.includes(notification.id);

                                                return (
                                                    <button
                                                        key={notification.id}
                                                        type="button"
                                                        onClick={() => {
                                                            const source = handleOpenNotification(notification);
                                                            if (source === "reservations") setReservationsSubTab(notification.id.startsWith("object-reservations-") ? "objetos" : "espacios");
                                                            setActiveTab(getTabByNotificationSource(source));
                                                        }}
                                                        className={`w-full rounded-lg border p-3 text-left transition-colors hover:shadow-sm ${getCardClassesBySource(notification.source)}`}
                                                    >
                                                        <div className="mb-1 flex items-start justify-between gap-2">
                                                            <p className="text-sm font-semibold text-gray-900">{notification.title}</p>
                                                            {!isSeen && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-red-500" />}
                                                        </div>
                                                        <p className="line-clamp-2 text-xs text-gray-600">{notification.message}</p>
                                                        <p className="mt-2 text-[11px] text-gray-400">{formatRelativeTime(notification.timestamp)}</p>
                                                    </button>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>
                            </PopoverContent>
                        </Popover>

                        <Sheet>
                            <SheetTrigger asChild>
                                <Button variant="ghost" size="icon" className="text-gray-500 w-9 h-9">
                                    <Menu className="w-5 h-5" />
                                </Button>
                            </SheetTrigger>
                            <SheetContent side="right" className="w-72 flex flex-col overflow-hidden">
                                <SheetHeader>
                                    <SheetTitle>Menú</SheetTitle>
                                    <SheetDescription className="sr-only">Navegación</SheetDescription>
                                </SheetHeader>
                                <div className="mt-6 space-y-2 flex-1 overflow-y-auto pr-1">
                                    {allNavItems.map((item) => (
                                        <SheetTrigger key={item.id} asChild>
                                            <button
                                                onClick={() => {
                                                    const nextTab = item.id as AdminTab;
                                                    handleNavbarModuleAccess(nextTab);
                                                    setActiveTab(nextTab);
                                                }}
                                                className={`w-full flex items-center justify-between gap-3 px-4 py-3 text-sm rounded-xl transition-colors ${
                                                    activeTab === item.id
                                                        ? 'bg-green-50 text-green-700 font-medium'
                                                        : 'text-gray-600 hover:bg-gray-50'
                                                }`}
                                            >
                                                <span className="flex items-center gap-3">
                                                    {item.icon} {item.label}
                                                </span>
                                                {item.id === "incidences" && unreadIncidencesCount > 0 && (
                                                    <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-semibold text-white">
                                                        {unreadIncidencesCount > 9 ? "9+" : unreadIncidencesCount}
                                                    </span>
                                                )}
                                                {item.id === "announcements" && unreadAnnouncementsCount > 0 && (
                                                    <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-500 px-1.5 text-[10px] font-semibold text-white">
                                                        {unreadAnnouncementsCount > 9 ? "9+" : unreadAnnouncementsCount}
                                                    </span>
                                                )}
                                            </button>
                                        </SheetTrigger>
                                    ))}
                                </div>
                                <div className="pt-6 border-t mt-auto shrink-0">
                                    {currentUser && (
                                        <div className="mb-4 flex items-center gap-3 px-1">
                                            <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                                                <User className="w-5 h-5 text-green-700" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium text-gray-900 truncate">{currentUser.name}</p>
                                                <p className="text-xs text-gray-500 truncate">{currentUser.email}</p>
                                            </div>
                                        </div>
                                    )}
                                    <Button variant="outline" className="w-full justify-start text-red-600" onClick={onLogout}>
                                        <LogOut className="w-4 h-4 mr-2" /> Cerrar Sesión
                                    </Button>
                                </div>
                            </SheetContent>
                        </Sheet>
                    </div>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto">
                {renderContent()}
            </div>
        </div>
    );
}
