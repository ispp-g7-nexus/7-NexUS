import { AlertCircle, BedDouble, Bell, BookOpen, Briefcase, Calendar, Home, LayoutDashboard, LogOut, Menu, MessageSquare, Package, Palette, Shield, User, UserCheck, Users, Utensils, X } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { chatsService, type ChatRealtimeEvent } from "../services/chats";
import { authService, hasScreenPermission, type AuthMeUser } from "../services/auth";
import { Events } from "../pages/Social/Events/Events";
import { Residents } from "../pages/Residents/Residents";
import logo from "../assets/logo.png";
import { AdminChats } from "../pages/Chats/AdminChats";
import { AdminIncidences } from "../pages/Incidences/components/AdminIncidences";
import { AdminMenuView } from "../pages/Menu/AdminMenuView";
import RolesPage from "../pages/RolesPage";
import Rooms from "../pages/Rooms/Rooms";
import { Staff } from "../pages/Staff/Staff";
import { AdminGuestPassListPage } from "../pages/Visitors/AdminGuestPassList";
import { AdminGuestPassPolicyPage } from "../pages/Visitors/AdminGuestPassPolicy";
import { AdminAnnouncements } from "../pages/announcements/AdminAnnouncements";
import { listBedrooms } from "../services/bedrooms";
import { listAdminGuestPasses } from "../services/guestPasses";
import { IncidenceService } from "../services/incidences";
import { residentsService } from "../services/residents";
import { roleService } from "../services/roles";
import { staffService } from "../services/staff";
import { AdminProfile } from "./AdminProfile";
import { AdminReservations } from "./AdminReservations";
import { AdminPackages } from "../pages/Packages/AdminPackages";

import { StatCard } from "./statCard";
import { AdminBrandingPage } from "../pages/Branding/AdminBrandingPage";
import { brandingService, type ResidenceBranding } from "../services/branding";
import { Button } from "./ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "./ui/sheet";
import { useAdminNotifications, type AdminNotificationSource } from "./useAdminNotifications";

interface AdminViewProps {
    readonly onLogout: () => void;
    readonly currentUser: (AuthMeUser & { name: string; email: string }) | null;
}

type AdminTab = "dashboard" | "rooms" | "students" | "incidences" | "reservations" | "kitchen" | "analytics" | "staff" | "announcements" | "visitors" | "events" | "roles" | "profile" | "chats" | "packages" | "branding";

const ADMIN_TABS: AdminTab[] = [
    "dashboard",
    "rooms",
    "students",
    "incidences",
    "reservations",
    "kitchen",
    "analytics",
    "staff",
    "announcements",
    "visitors",
    "events",
    "roles",
    "profile",
    "chats",
    "packages",
    "branding",
];

const isAdminTab = (value: string): value is AdminTab => {
    return ADMIN_TABS.includes(value as AdminTab);
};

const getAdminTabFromPath = (pathname: string): AdminTab => {
    const [, dashboardSegment, maybeTab] = pathname.split("/");
    if (dashboardSegment !== "dashboard") {
        return "dashboard";
    }
    if (!maybeTab) {
        return "dashboard";
    }
    return isAdminTab(maybeTab) ? maybeTab : "dashboard";
};

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
    const navigate = useNavigate();
    const location = useLocation();
    const [activeTab, setActiveTab] = useState<AdminTab>(() => getAdminTabFromPath(location.pathname));

    const [fullUser, setFullUser] = useState<AuthMeUser | null>(null);

    const [totalChats, setTotalChats] = useState<number>(0);
    const [currentUserEmail, setCurrentUserEmail] = useState<string>("");
    const [unreadChatKeys, setUnreadChatKeys] = useState<Set<string>>(new Set());
    const [chatRealtimeTick, setChatRealtimeTick] = useState<number>(0);
    const [chatRealtimeEvent, setChatRealtimeEvent] = useState<ChatRealtimeEvent | null>(null);
    const [tenantLogoUrl, setTenantLogoUrl] = useState<string>("");
    const processedGroupMessageEventKeysRef = useRef<Set<string>>(new Set());

    const applyTenantTheme = (branding: ResidenceBranding) => {
        if (branding.logo_url) {
            setTenantLogoUrl(branding.logo_url);
        }
        import("../hooks/useTenantBranding").then((m) => m.applyGlobalBranding(branding));
    };

    const unreadChatsCount = unreadChatKeys.size;

    const isGroupLifecycleEvent = (evt: ChatRealtimeEvent): boolean =>
        evt.event === "group_created" || evt.event === "group_updated" || evt.event === "group_deleted";

    const isIncomingMessageEvent = (evt: ChatRealtimeEvent): boolean =>
        evt.event === "group_message_created" || evt.event === "private_message_created";

    const shouldSkipRepeatedGroupMessageEvent = (evt: ChatRealtimeEvent): boolean => {
        if (evt.event !== "group_message_created") {
            return false;
        }

        const eventKey = buildGroupMessageEventKey(evt);
        if (!eventKey) {
            return false;
        }

        if (processedGroupMessageEventKeysRef.current.has(eventKey)) {
            return true;
        }

        processedGroupMessageEventKeysRef.current.add(eventKey);
        if (processedGroupMessageEventKeysRef.current.size > 1000) {
            const keys = Array.from(processedGroupMessageEventKeysRef.current);
            processedGroupMessageEventKeysRef.current = new Set(keys.slice(-500));
        }

        return false;
    };

    const getSenderEmailFromEvent = (evt: ChatRealtimeEvent): string =>
        typeof evt.payload?.sender_email === "string" ? evt.payload.sender_email.trim().toLowerCase() : "";

    const buildUnreadChatKey = (evt: ChatRealtimeEvent): string | null => {
        if (evt.event === "group_message_created") {
            const groupId = Number(evt.payload?.group_id ?? -1);
            return Number.isFinite(groupId) && groupId > 0 ? `group:${groupId}` : null;
        }

        const conversationId = Number(evt.payload?.conversation_id ?? -1);
        return Number.isFinite(conversationId) && conversationId > 0 ? `private:${conversationId}` : null;
    };

    const persistUnreadGroupMessage = (groupId: number) => {
        if (!currentUserEmail || !Number.isFinite(groupId) || groupId <= 0) return;

        const storageKey = `admin-chat-unread:${currentUserEmail.trim().toLowerCase()}`;

        try {
            const raw = localStorage.getItem(storageKey);
            const parsed = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
            const previousCount = Number(parsed[String(groupId)] ?? 0);
            const nextCount = Number.isFinite(previousCount) && previousCount > 0 ? previousCount + 1 : 1;
            parsed[String(groupId)] = nextCount;
            localStorage.setItem(storageKey, JSON.stringify(parsed));
        } catch { /* empty */ }
    };

    const buildGroupMessageEventKey = (evt: ChatRealtimeEvent): string | null => {
        const groupId = Number(evt.payload?.group_id ?? -1);
        if (!Number.isFinite(groupId) || groupId <= 0) return null;

        const messagePayload = evt.payload?.message as { id?: number } | undefined;
        const messageId = Number(messagePayload?.id ?? evt.payload?.message_id ?? -1);
        if (Number.isFinite(messageId) && messageId > 0) {
            return `${groupId}:${messageId}`;
        }

        return null;
    };

    const [totalActiveGuests, setTotalActiveGuests] = useState<number>(0);

    useEffect(() => {
        listAdminGuestPasses("active")
            .then((data) => setTotalActiveGuests(data.length))
            .catch(() => setTotalActiveGuests(0));
    }, []);

    const loadChatsCount = async () => {
        try {
            const groups = await chatsService.listGroups();
            setTotalChats(groups.length);
        } catch (error) {
            console.error('Error loading chats count:', error);
            setTotalChats(0);
        }
    };

    const goToTab = (tab: AdminTab) => {
        setActiveTab(tab);
        navigate(tab === "dashboard" ? "/dashboard" : `/dashboard/${tab}`);
    };

    useEffect(() => {
        loadChatsCount();
    }, []);

    useEffect(() => {
        let mounted = true;

        const loadBranding = async () => {
            try {
                const branding = await brandingService.get();
                if (!mounted) return;
                applyTenantTheme(branding);
            } catch {
                // Branding is optional for admin view.
            }
        };

        loadBranding();

        const handleBrandingUpdate = (event: Event) => {
            const customEvent = event as CustomEvent<ResidenceBranding>;
            if (customEvent.detail) {
                applyTenantTheme(customEvent.detail);
            }
        };

        globalThis.addEventListener("tenant-branding-updated", handleBrandingUpdate as EventListener);

        return () => {
            mounted = false;
            globalThis.removeEventListener("tenant-branding-updated", handleBrandingUpdate as EventListener);
        };
    }, []);

    useEffect(() => {
        authService.me().then((session) => {
            if (session.user) {
                setFullUser(session.user);
                if (session.user.email) {
                    setCurrentUserEmail(session.user.email);
                }
            }
        }).catch(() => { });
    }, []);

    useEffect(() => {
        const normalizedCurrentUserEmail = currentUserEmail.trim().toLowerCase();

        const source = chatsService.subscribeToEvents((evt) => {
            if (evt.event === "branding_updated" && evt.payload) {
                import("../hooks/useTenantBranding").then((m) => m.applyGlobalBranding(evt.payload as unknown as ResidenceBranding));
                return;
            }

            if (isGroupLifecycleEvent(evt)) {
                setChatRealtimeEvent(evt);
                setChatRealtimeTick((prev) => prev + 1);
                loadChatsCount().catch(() => { });
                return;
            }

            if (!isIncomingMessageEvent(evt)) {
                return;
            }

            if (shouldSkipRepeatedGroupMessageEvent(evt)) {
                return;
            }

            setChatRealtimeEvent(evt);
            setChatRealtimeTick((prev) => prev + 1);

            const senderEmail = getSenderEmailFromEvent(evt);
            if (!senderEmail || senderEmail === normalizedCurrentUserEmail) {
                return;
            }

            if (activeTab === "chats") {
                return;
            }

            const chatKey = buildUnreadChatKey(evt);
            if (!chatKey) {
                return;
            }

            setUnreadChatKeys((prev) => {
                if (prev.has(chatKey)) return prev;
                const next = new Set(prev);
                next.add(chatKey);
                return next;
            });

            if (evt.event === "group_message_created") {
                const groupId = Number(evt.payload?.group_id ?? -1);
                persistUnreadGroupMessage(groupId);
            }
        });

        source.onopen = () => {
            console.info("[chat-sse][admin] connected");
        };

        source.onerror = () => {
            console.warn("[chat-sse][admin] connection error; browser will retry");
        };

        return () => {
            source.close();
        };
    }, [activeTab, currentUserEmail]);

    useEffect(() => {
        if (activeTab === "chats") {
            setUnreadChatKeys(new Set());
        }
    }, [activeTab]);

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
        handleDismissNotification,
        handleNavbarModuleAccess,
    } = useAdminNotifications();

    const [totalResidents, setTotalResidents] = useState<number>(0);
    const [occupiedRoomsPercent, setOccupiedRoomsPercent] = useState<string>('—');
    const [totalStaff, setTotalStaff] = useState<number>(0);
    const [pendingIncidences, setPendingIncidences] = useState<number>(0);
    const [totalRoles, setTotalRoles] = useState<number>(0);


    const activeUser = fullUser || currentUser;

    useEffect(() => {
        if (activeTab !== "dashboard") return;

        if (hasScreenPermission(activeUser, 'students')) {
            residentsService.list().then((d) => setTotalResidents(d.length)).catch(() => setTotalResidents(0));
        }

        if (hasScreenPermission(activeUser, 'rooms')) {
            listBedrooms().then((d) => {
                const totalPlazas = d.reduce((sum, r) => sum + r.capacidad_maxima, 0);
                const plazasOcupadas = d.reduce((sum, r) => sum + r.ocupantes_actuales, 0);
                const pct = totalPlazas > 0 ? Math.round((plazasOcupadas / totalPlazas) * 100) : 0;
                setOccupiedRoomsPercent(`${pct}%`);
            }).catch(() => setOccupiedRoomsPercent('—'));
        }

        if (hasScreenPermission(activeUser, 'staff')) {
            staffService.list().then((d) => setTotalStaff(d.length)).catch(() => setTotalStaff(0));
        }

        if (hasScreenPermission(activeUser, 'guests')) {
            listAdminGuestPasses("active").then((d) => setTotalActiveGuests(d.length)).catch(() => setTotalActiveGuests(0));
        }

        if (hasScreenPermission(activeUser, 'incidences')) {
            IncidenceService.getAll().then((d) => setPendingIncidences(d.filter(i => i.status === 'pending').length)).catch(() => setPendingIncidences(0));
        }

        if (hasScreenPermission(activeUser, 'roles')) {
            roleService.getRoles().then((d) => setTotalRoles(d.length)).catch(() => setTotalRoles(0));
        }

        if (hasScreenPermission(activeUser, 'chats')) {
            loadChatsCount();
        }
    }, [activeTab, activeUser]);

    const rawNavItems = [
        { id: "dashboard", label: "Panel de Control", icon: <LayoutDashboard className="w-5 h-5" /> },
        { id: "profile", label: "Mi Perfil", icon: <User className="w-5 h-5" /> },
        { id: "rooms", label: "Habitaciones", icon: <Home className="w-5 h-5" />, permission: "rooms" },
        { id: "students", label: "Residentes", icon: <Users className="w-5 h-5" />, permission: "students" },
        { id: "staff", label: "Personal", icon: <Briefcase className="w-5 h-5" />, permission: "staff" },
        { id: "packages", label: "Paquetería", icon: <Package className="w-5 h-5" />, permission: "packages" },
        { id: "incidences", label: "Incidencias", icon: <AlertCircle className="w-5 h-5" />, permission: "incidences" },
        { id: "kitchen", label: "Menú Comedor", icon: <Utensils className="w-5 h-5" />, permission: "kitchen" },
        { id: "events", label: "Eventos & Comunidad", icon: <Calendar className="w-5 h-5" />, permission: "events" },
        { id: "reservations", label: "Recursos & Reservas", icon: <BookOpen className="w-5 h-5" />, permission: "reservations" },
        { id: "roles", label: "Roles", icon: <Shield className="w-5 h-5" />, permission: "roles" },
        { id: "branding", label: "Personalización", icon: <Palette className="w-5 h-5" /> },
        { id: "announcements", label: "Avisos", icon: <Bell className="w-5 h-5" />, permission: "announcements" },
        { id: "visitors", label: "Visitantes", icon: <UserCheck className="w-5 h-5" />, permission: "guests" },
        { id: "chats", label: "Chats", icon: <MessageSquare className="w-5 h-5" />, permission: "chats" },
    ];


    const allNavItems = rawNavItems.filter(item => {
        if (!item.permission) return true;
        return hasScreenPermission(activeUser, item.permission);
    });

    const rawMetricsData = [
        { id: 'students', label: 'Residentes', value: totalResidents, icon: Users, theme: 'blue' as const, onClick: () => goToTab('students') },
        { id: 'rooms', label: 'Habitaciones', value: occupiedRoomsPercent, icon: BedDouble, theme: 'green' as const, onClick: () => goToTab('rooms') },
        { id: 'staff', label: 'Personal', value: totalStaff, icon: Briefcase, theme: 'purple' as const, onClick: () => goToTab('staff') },
        { id: 'guests', label: 'Visitantes', value: totalActiveGuests, icon: UserCheck, theme: 'purple' as const, onClick: () => goToTab('visitors') },
        { id: 'incidences', label: 'Incidencias', value: pendingIncidences, icon: AlertCircle, theme: 'red' as const, onClick: () => goToTab('incidences') },
        { id: 'events', label: 'Eventos', value: 'Ver', icon: Calendar, theme: 'orange' as const, onClick: () => goToTab('events') },
        { id: 'roles', label: 'Roles', value: totalRoles, icon: Shield, theme: 'purple' as const, onClick: () => goToTab('roles') },
        {
            id: 'chats', label: 'Chats', value: totalChats, icon: MessageSquare, theme: 'blue' as const,
            topBadgeText: unreadChatsCount > 0 ? '¡Tienes mensajes sin leer!' : undefined,
            onClick: () => goToTab('chats')
        },
        { id: 'packages', label: 'Paquetería', value: 'Ver', icon: Package, theme: 'orange' as const, onClick: () => goToTab('packages') },
        { id: 'kitchen', label: 'Menú Comedor', value: 'Ver', icon: Utensils, theme: 'blue' as const, onClick: () => goToTab('kitchen') },
        { id: 'reservations', label: 'Recursos & Reservas', value: 'Ver', icon: BookOpen, theme: 'green' as const, onClick: () => goToTab('reservations') },
    ];

    const metricsData = rawMetricsData.filter(metric => {
        return hasScreenPermission(activeUser, metric.id);
    });

    const today = new Date().toLocaleDateString('es-ES', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    });
    const todayCapitalized = today.charAt(0).toUpperCase() + today.slice(1);

    const currentTab = allNavItems.find((item) => item.id === activeTab) || allNavItems[0];

    const renderContent = () => {
        const alwaysAllowed = ["dashboard", "profile", "branding"];
        const isAllowed = alwaysAllowed.includes(activeTab) || allNavItems.some(item => item.id === activeTab);

        if (!isAllowed) {
            return (
                <div className="flex items-center justify-center h-full min-h-[60vh]">
                    <div className="bg-red-50 border border-red-100 p-8 rounded-2xl text-center max-w-md shadow-sm">
                        <Shield className="w-16 h-16 mx-auto mb-4 text-red-400" />
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">Acceso Denegado</h2>
                        <p className="text-gray-600 mb-6">No tienes los permisos necesarios para visualizar el módulo de <b>{activeTab}</b>.</p>
                        <Button variant="outline" onClick={() => goToTab("dashboard")}>
                            Volver al Panel de Control
                        </Button>
                    </div>
                </div>
            );
        }

        switch (activeTab) {
            case "dashboard":
                return (
                    <div className="p-6">
                        <div className="mb-8">
                            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-[1px] mb-1">
                                {todayCapitalized}
                            </p>
                            <h2 className="text-2xl font-medium text-gray-900">
                                Bienvenido/a, <span className="text-primary font-medium">{currentUser?.name ? currentUser.name : "Administrador"}</span>
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

            case "branding":
                return <AdminBrandingPage />;

            case "profile":
                return <AdminProfile />;

            case "announcements":
                return (
                    <div className="p-4">
                        <AdminAnnouncements />
                    </div>
                );
            case "visitors":
                return (
                    <div className="p-4 space-y-8">
                        <AdminGuestPassListPage />
                        <AdminGuestPassPolicyPage />
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

            case "packages":
                return (
                    <div className="p-4">
                        <AdminPackages />
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
                        <AdminChats onChatsCountChange={setTotalChats} enableRealtimeStream={false} realtimeTick={chatRealtimeTick} realtimeEvent={chatRealtimeEvent} />
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
                        <button onClick={() => goToTab("dashboard")} className="w-9 h-9 flex items-center justify-center">
                            <img src={tenantLogoUrl || logo} alt="Logo residencia" className="w-full h-full object-contain" />
                        </button>
                        <div>
                            <h1 className="tenant-admin-title font-semibold text-gray-900">{currentTab?.label}</h1>
                            <p className="tenant-admin-subtitle text-xs text-gray-500">Panel de Administración</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Popover open={isNotificationsOpen} onOpenChange={handleNotificationsOpenChange}>
                            <PopoverTrigger asChild>
                                <Button variant="ghost" size="icon" className="text-gray-500 w-9 h-9 relative hover:text-primary hover:bg-primary/10 rounded-lg transition-all">
                                    <Bell className="w-5 h-5" />
                                    {hasUnreadNotifications && <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-white" />}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent align="end" className="w-80 p-0">
                                <div className="max-h-[70vh] overflow-y-auto rounded-md bg-white p-4">
                                    <div className="mb-3 flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                            <Bell className="h-5 w-5 text-green-500" />
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
                                                    <div
                                                        key={notification.id}
                                                        className={`relative w-full rounded-lg border transition-colors hover:shadow-sm ${getCardClassesBySource(notification.source)}`}
                                                    >
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const source = handleOpenNotification(notification);
                                                                if (source === "reservations") setReservationsSubTab(notification.id.startsWith("object-reservations-") ? "objetos" : "espacios");
                                                                goToTab(getTabByNotificationSource(source));
                                                            }}
                                                            className="w-full p-3 pr-10 text-left"
                                                        >
                                                            <div className="mb-1 flex items-start justify-between gap-2">
                                                                <p className="text-sm font-semibold text-gray-900">{notification.title}</p>
                                                                {!isSeen && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-red-500" />}
                                                            </div>
                                                            <p className="line-clamp-2 text-xs text-gray-600">{notification.message}</p>
                                                            <p className="mt-2 text-[11px] text-gray-400">{formatRelativeTime(notification.timestamp)}</p>
                                                        </button>

                                                        <button
                                                            type="button"
                                                            onClick={(event) => {
                                                                event.stopPropagation();
                                                                handleDismissNotification(notification);
                                                            }}
                                                            className="absolute right-2 top-2 inline-flex h-6 w-6 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-black/5 hover:text-gray-700"
                                                            aria-label="Descartar notificación"
                                                            title="Descartar notificación"
                                                        >
                                                            <X className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>
                            </PopoverContent>
                        </Popover>

                        <Button
                            size="icon"
                            variant="ghost"
                            className="text-gray-500 w-9 h-9 hover:text-primary hover:bg-primary/10 rounded-lg transition-all"
                            onClick={() => goToTab("dashboard")}
                            title="Panel de Control"
                        >
                            <LayoutDashboard className="w-5 h-5" />
                        </Button>

                        <Button
                            size="icon"
                            variant="ghost"
                            className="text-gray-500 w-9 h-9 hover:text-primary hover:bg-primary/10 rounded-lg transition-all"
                            onClick={() => goToTab("profile")}
                            title="Mi Perfil"
                        >
                            <User className="w-5 h-5" />
                        </Button>

                        <Button
                            size="icon"
                            variant="ghost"
                            className="text-gray-500 w-9 h-9 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                            onClick={onLogout}
                            title="Cerrar Sesión"
                        >
                            <LogOut className="w-5 h-5" />
                        </Button>

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
                                                    goToTab(nextTab);
                                                }}
                                                className={`w-full flex items-center justify-between gap-3 px-4 py-3 text-sm rounded-xl transition-colors ${activeTab === item.id
                                                    ? 'bg-primary/10 text-primary font-medium'
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
                                            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                                <User className="w-5 h-5 text-primary" />
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