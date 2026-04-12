import {
    Bell,
    Check,
    Copy,
    Calendar,
    LogOut,
    Megaphone,
    MessageSquare,
    Package,
    AlertCircle,
    QrCode,
    User,
    Users,
    Utensils,
    X,
    Wifi
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { authService } from "../services/auth";
import announcementService from "../services/announcement.service";
import { packagesService } from "../services/packages";
import { objectsService } from "../services/objects";
import { fetchWithAuth, API_URL, API_URL_INCIDENCES } from "../utils/api";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import QRCode from "react-qr-code";

export type StudentTab = "home" | "incidences" | "reservations" | "community" | "events" | "matches" | "announcements" | "menu" | "packages" | "visitors";

interface StudentHomeProps {
    onNavigate: (view: StudentTab) => void;
    onLogout?: () => void;
}

const HOME_NOTIFICATIONS_SEEN_IDS_KEY = "home-notifications-seen-ids";
const HOME_NOTIFICATIONS_DISMISSED_IDS_KEY = "home-notifications-dismissed-ids";
const HOME_INCIDENCES_DISMISSED_IDS_KEY = "home-incidences-dismissed-ids";
const HOME_INCIDENCES_SEEN_AT_KEY = "home-incidences-seen-at";
const HOME_ANNOUNCEMENTS_SEEN_AT_KEY = "home-announcements-seen-at";
const VISIT_URGENT_NOTIFICATION_KEY_BASE = "visit-urgent-shared-notifications";
const NOTIFICATIONS_POLL = 15000;
const NOTIFICATIONS_LIMIT = 12;

type VisitUrgentSharedNotification = {
    id: string;
    title: string;
    message: string;
    created_at: string;
    expires_at: string;
    source: "visitors";
};

const parseSeenIds = (raw: string | null): string[] => {
    if (!raw) {
        return [];
    }

    try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
};

const formatRelativeTime = (isoDate: string) => {
    const date = new Date(isoDate);
    const diffInMinutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000));

    if (diffInMinutes < 1) return "Ahora";
    if (diffInMinutes < 60) return `Hace ${diffInMinutes} min`;

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `Hace ${diffInHours} h`;

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `Hace ${diffInDays} d`;

    return date.toLocaleDateString();
};

const formatRelativeFuture = (isoDate: string) => {
    const date = new Date(isoDate);
    const diffInMinutes = Math.floor((date.getTime() - Date.now()) / 60000);

    if (diffInMinutes <= 0) return "Ahora";
    if (diffInMinutes < 60) return `En ${diffInMinutes} min`;

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `En ${diffInHours} h`;

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `En ${diffInDays} d`;

    return date.toLocaleDateString();
};

const getInitialSeenIds = (): string[] => {
    if (typeof window === "undefined") {
        return [];
    }

    return parseSeenIds(globalThis.localStorage.getItem(HOME_NOTIFICATIONS_SEEN_IDS_KEY));
};

const getInitialDismissedNotificationIds = (): string[] => {
    if (typeof window === "undefined") {
        return [];
    }

    return parseSeenIds(globalThis.localStorage.getItem(HOME_NOTIFICATIONS_DISMISSED_IDS_KEY));
};

const getInitialDismissedIncidenceIds = (): string[] => {
    if (typeof window === "undefined") {
        return [];
    }

    return parseSeenIds(globalThis.localStorage.getItem(HOME_INCIDENCES_DISMISSED_IDS_KEY));
};

const saveStoredIds = (key: string, ids: string[]) => {
    if (typeof window !== "undefined") {
        globalThis.localStorage.setItem(key, JSON.stringify(ids));
    }
};

const getAnnouncementsSeenAtMs = (): number => {
    if (typeof window === "undefined") {
        return 0;
    }

    const raw = globalThis.localStorage.getItem(HOME_ANNOUNCEMENTS_SEEN_AT_KEY);
    if (!raw) {
        return 0;
    }

    const parsedMs = Date.parse(raw);
    return Number.isFinite(parsedMs) ? parsedMs : 0;
};

const getIncidencesSeenAtMs = (): number => {
    if (typeof window === "undefined") {
        return 0;
    }

    const raw = globalThis.localStorage.getItem(HOME_INCIDENCES_SEEN_AT_KEY);
    if (!raw) {
        return 0;
    }

    const parsedMs = Date.parse(raw);
    return Number.isFinite(parsedMs) ? parsedMs : 0;
};

const buildVisitUrgentNotificationStorageKey = (email: string): string | null => {
    const normalized = email.trim().toLowerCase();
    if (!normalized) {
        return null;
    }
    return `${VISIT_URGENT_NOTIFICATION_KEY_BASE}:${normalized}`;
};

const getActiveVisitUrgentNotifications = (storageKey: string | null): VisitUrgentSharedNotification[] => {
    if (globalThis.window === undefined || !storageKey) {
        return [];
    }

    const raw = globalThis.localStorage.getItem(storageKey);
    if (!raw) {
        return [];
    }

    try {
        const parsed = JSON.parse(raw) as VisitUrgentSharedNotification | VisitUrgentSharedNotification[];
        const items = Array.isArray(parsed) ? parsed : [parsed];
        const nowMs = Date.now();

        const active = items.filter((item) => {
            const expiresAtMs = Date.parse(item.expires_at);
            return Number.isFinite(expiresAtMs) && expiresAtMs > nowMs;
        });

        if (active.length !== items.length) {
            if (active.length === 0) {
                globalThis.localStorage.removeItem(storageKey);
            } else {
                globalThis.localStorage.setItem(storageKey, JSON.stringify(active));
            }
        }

        return active.sort((a, b) => Date.parse(a.expires_at) - Date.parse(b.expires_at));
    } catch {
        globalThis.localStorage.removeItem(storageKey);
        return [];
    }
};

type HomeNotification = {
    id: string;
    title: string;
    description: string;
    time: string;
    type: NotificationType;
    source: StudentTab;
    createdAt: string;
};

type AnnouncementItem = {
    id: number;
    title: string;
    description: string;
    announcement_date: string;
    publication_date?: string;
    has_passed: boolean;
};

type IncidenceNotificationItem = {
    id: string;
    title?: string;
    message?: string;
    created_at: string;
};

type EventItem = {
    id: number;
    title: string;
    location?: string;
    created_at?: string;
    start_time: string;
    end_time: string;
    host?: { id?: number };
};

const parseUserId = (raw: unknown) => {
    if (typeof raw === "number" && Number.isFinite(raw)) {
        return raw;
    }
    if (typeof raw === "string") {
        const parsed = Number(raw);
        return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
};

export function StudentHome({ onNavigate, onLogout }: StudentHomeProps) {
    // --- ESTADOS DE LA VISTA ---
    const [isWifiDialogOpen, setIsWifiDialogOpen] = useState(false);
    const [isQrDialogOpen, setIsQrDialogOpen] = useState(false);
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
    const [copied, setCopied] = useState(false);

    // Estado para los datos reales del usuario
    const [userData, setUserData] = useState({
        name: "Cargando...",
        initials: "--",
        room: "Obteniendo datos...",
        status: "Cargando"
    });

    const [notifications, setNotifications] = useState<HomeNotification[]>([]);
    const [isNotificationsLoading, setIsNotificationsLoading] = useState(false);
    const [seenNotificationIds, setSeenNotificationIds] = useState<string[]>(getInitialSeenIds);
    const [dismissedIncidenceIds, setDismissedIncidenceIds] = useState<string[]>(getInitialDismissedIncidenceIds);
    const [pendingPackages, setPendingPackages] = useState<number>(0);
    const [currentUserId, setCurrentUserId] = useState<number | null>(null);
    const [currentUserEmail, setCurrentUserEmail] = useState("");
    const [isSessionUserResolved, setIsSessionUserResolved] = useState(false);
    const notificationsRequestIdRef = useRef(0);
    const dismissedNotificationIdsRef = useRef<string[]>(getInitialDismissedNotificationIds());

    const wifiPassword = "NexUS2026@Residence";
    const unreadCount = notifications.filter((notification) => !seenNotificationIds.includes(notification.id)).length;
    const hasUnreadNotifications = unreadCount > 0;

    // --- CARGA DE DATOS REALES ---
    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const session = await authService.me();
                setCurrentUserId(parseUserId(session.user?.id));
                setCurrentUserEmail((session.user?.email || "").trim().toLowerCase());
                if (session.user) {
                    // Usar el nombre real si está disponible
                    const firstName = session.user.first_name?.trim() || '';
                    const lastName = session.user.last_name?.trim() || '';
                    let displayName = '';
                    if (firstName || lastName) {
                        displayName = `${firstName} ${lastName}`.trim();
                    } else {
                        // Fallback a username/email si no hay nombre real
                        const rawName = session.user.username || session.user.email || "Estudiante";
                        displayName = rawName.split('@')[0].replace(/[._-]/g, ' ');
                        displayName = displayName.charAt(0).toUpperCase() + displayName.slice(1);
                    }

                    // Iniciales para el avatar
                    let initials = '';
                    if (firstName || lastName) {
                        initials = ((firstName.charAt(0) || '') + (lastName.charAt(0) || '')).toUpperCase();
                    } else {
                        const cleanName = displayName.replace(/ /g, '');
                        initials = cleanName.substring(0, 2).toUpperCase();
                    }

                    setUserData({
                        name: displayName,
                        initials: initials,
                        // Nota: Si en el futuro tu backend envía la habitación en el me(), cámbialo aquí.
                        // Por ahora ponemos un texto dinámico o genérico.
                        room: "Residente",
                        status: "Activo"
                    });
                }
            } catch (error) {
                console.error("Error cargando perfil del estudiante", error);
                setCurrentUserId(null);
                setCurrentUserEmail("");
                setUserData(prev => ({ ...prev, name: "Estudiante", room: "Error de conexión" }));
            } finally {
                setIsSessionUserResolved(true);
            }
        };

        fetchUserData();
    }, []);

    const appendSeenNotificationIds = (notificationIds: string[]) => {
        setSeenNotificationIds((previousIds) => {
            const nextIds = Array.from(new Set([...previousIds, ...notificationIds]));
            saveStoredIds(HOME_NOTIFICATIONS_SEEN_IDS_KEY, nextIds);
            return nextIds;
        });
    };

    const appendDismissedNotificationIds = (notificationIds: string[]) => {
        const nextIds = Array.from(new Set([...dismissedNotificationIdsRef.current, ...notificationIds]));
        dismissedNotificationIdsRef.current = nextIds;
        saveStoredIds(HOME_NOTIFICATIONS_DISMISSED_IDS_KEY, nextIds);
    };

    const appendDismissedIncidenceIds = (notificationIds: string[]) => {
        setDismissedIncidenceIds((previousIds) => {
            const nextIds = Array.from(new Set([...previousIds, ...notificationIds]));
            saveStoredIds(HOME_INCIDENCES_DISMISSED_IDS_KEY, nextIds);
            return nextIds;
        });
    };

    const buildAnnouncementItems = useCallback((announcements: AnnouncementItem[]): HomeNotification[] => {
        const announcementsSeenAtMs = getAnnouncementsSeenAtMs();

        return announcements
            .filter((announcement) => !announcement.has_passed)
            .map((announcement) => {
                const createdAt = announcement.publication_date || `${announcement.announcement_date}T00:00:00`;
                return {
                    id: `announcement-${announcement.id}`,
                    title: `[Avisos] ${announcement.title}`,
                    description: announcement.description,
                    time: formatRelativeTime(createdAt),
                    type: "admin" as const,
                    source: "announcements" as const,
                    createdAt,
                };
            })
            .filter((announcement) => Date.parse(announcement.createdAt) > announcementsSeenAtMs);
    }, []);

    const buildIncidenceItems = useCallback((incidenceItems: IncidenceNotificationItem[]): HomeNotification[] => {
        const incidencesSeenAtMs = getIncidencesSeenAtMs();

        return incidenceItems
            .filter((item) => !dismissedIncidenceIds.includes(item.id))
            .filter((item) => Date.parse(item.created_at) > incidencesSeenAtMs)
            .map((item) => ({
                id: item.id,
                title: `[Incidencias] ${item.title || "Nueva incidencia"}`,
                description: item.message || "Tienes una actualización de incidencias.",
                time: formatRelativeTime(item.created_at),
                type: "warning" as const,
                source: "incidences" as const,
                createdAt: item.created_at,
            }));
    }, [dismissedIncidenceIds]);

    const buildEventItems = useCallback((events: EventItem[]): HomeNotification[] => {
        if (!isSessionUserResolved) {
            return [];
        }

        const now = Date.now();
        return events
            .filter((event) => Date.parse(event.end_time) > now)
            .filter((event) => !(currentUserId !== null && event.host?.id === currentUserId))
            .map((event) => {
                const createdAt = event.created_at || event.start_time;
                const timeLabel = event.created_at
                    ? formatRelativeTime(event.created_at)
                    : formatRelativeFuture(event.start_time);
                return {
                    id: `event-${event.id}`,
                    title: `[Eventos] ${event.title}`,
                    description: event.location ? `Lugar: ${event.location}` : "Evento disponible en tu residencia.",
                    time: timeLabel,
                    type: "event" as const,
                    source: "events" as const,
                    createdAt,
                };
            });
    }, [currentUserId, isSessionUserResolved]);

    const buildPackageItems = useCallback((count: number): HomeNotification[] => {
        if (count <= 0) return [];
        return [{
            id: "packages-unread",
            title: "[Paquetes] Tienes paquetes pendientes",
            description: `Tienes ${count} paquete${count === 1 ? "" : "s"} esperándote en recepción.`,
            time: "Ahora",
            type: "info" as const,
            source: "packages" as const,
            createdAt: new Date().toISOString(),
        }];
    }, []);

    const buildObjectReminderItems = useCallback((count: number): HomeNotification[] => {
        if (count <= 0) return [];
        return [{
            id: "objects-reminder-unread",
            title: "[Reservas] Recordatorio de devolución",
            description: `Tienes ${count} objeto${count === 1 ? "" : "s"} cuya reserva finalizará en breve.`,
            time: "Ahora",
            type: "warning" as const,
            source: "reservations" as const,
            createdAt: new Date().toISOString(),
        }];
    }, []);
    const buildVisitUrgentItems = useCallback((): HomeNotification[] => {
        const storageKey = buildVisitUrgentNotificationStorageKey(currentUserEmail);
        const items = getActiveVisitUrgentNotifications(storageKey);
        return items.map((item) => ({
            id: item.id,
            title: item.title,
            description: item.message,
            time: formatRelativeTime(item.created_at),
            type: "urgent" as const,
            source: "visitors" as const,
            createdAt: item.created_at,
        }));
    }, [currentUserEmail]);

    const loadHomeNotifications = useCallback(async (silent = false) => {
        const requestId = ++notificationsRequestIdRef.current;
        
        // 1. Gestión de estado inicial
        if (!silent) setIsNotificationsLoading(true);

        try {
            // 2. Ejecución paralela de peticiones
            const [
                announcementsRes, 
                incidencesRes, 
                eventsRes, 
                packagesRes,
                objectRemindersRes
            ] = await Promise.allSettled([
                announcementService.getAnnouncements(),
                fetchWithAuth(`${API_URL_INCIDENCES}notifications/`),
                fetchWithAuth(`${API_URL}events/`),
                packagesService.getPendingCount(),
                objectsService.getPendingRemindersCount(),
            ]);

            // Evitar actualizaciones si el componente cambió de estado o hubo una petición nueva
            if (requestId !== notificationsRequestIdRef.current) return;

            // 3. Procesamiento individual (Funciones puras de mapeo)
            const mergedNotifications: HomeNotification[] = [
                ...(announcementsRes.status === "fulfilled" ? buildAnnouncementItems(announcementsRes.value) : []),
                ...(packagesRes.status === "fulfilled" ? buildPackageItems(packagesRes.value || 0) : []),
                ...(objectRemindersRes.status === "fulfilled" ? buildObjectReminderItems(objectRemindersRes.value || 0) : []),
                ...buildVisitUrgentItems(),
            ];

            // 4. Procesamiento de respuestas tipo Fetch (Incidencias y Eventos)
            if (incidencesRes.status === "fulfilled" && incidencesRes.value.ok) {
                const data = await incidencesRes.value.json();
                mergedNotifications.push(...buildIncidenceItems(data.results || []));
            }

            if (eventsRes.status === "fulfilled" && eventsRes.value.ok) {
                const eventsData = await eventsRes.value.json();
                mergedNotifications.push(...buildEventItems(Array.isArray(eventsData) ? eventsData : []));
            }

            const visibleNotifications = mergedNotifications.filter((notification) => (
                notification.source === "visitors" || !dismissedNotificationIdsRef.current.includes(notification.id)
            ));

            // 5. Ordenación y Límite
            const sortedNotifications = [...visibleNotifications].sort((a, b) => {
                const aPinned = a.source === "visitors" ? 1 : 0;
                const bPinned = b.source === "visitors" ? 1 : 0;
                if (aPinned !== bPinned) {
                    return bPinned - aPinned;
                }
                return Date.parse(b.createdAt) - Date.parse(a.createdAt);
            });

            const sorted = sortedNotifications.slice(0, NOTIFICATIONS_LIMIT);

            setNotifications(sorted);

        } catch (error) {
            console.error("Error cargando notificaciones:", error);
        } finally {
            if (requestId === notificationsRequestIdRef.current && !silent) {
                setIsNotificationsLoading(false);
            }
        }
    }, [buildAnnouncementItems, buildIncidenceItems, buildEventItems, buildPackageItems, buildObjectReminderItems, buildVisitUrgentItems]);
    useEffect(() => {
        loadHomeNotifications();
        const intervalId = globalThis.setInterval(() => loadHomeNotifications(true), NOTIFICATIONS_POLL);

        return () => globalThis.clearInterval(intervalId);
    }, [loadHomeNotifications]);

    // Paquetes: contador pendientes de recoger
    useEffect(() => {
        let mounted = true;
        const loadPending = async () => {
            try {
                const data = await packagesService.getPendingCount();
                if (mounted) setPendingPackages(data || 0);
            } catch (err) {
                console.error("Error al cargar los paquetes pendientes:", err);
                if (mounted) setPendingPackages(0);
            }
        };

        loadPending();
        const pid = globalThis.setInterval(loadPending, NOTIFICATIONS_POLL);
        return () => {
            mounted = false;
            globalThis.clearInterval(pid);
        };
    }, []);



    // --- FUNCIONES INTERNAS ---
    const handleNotificationsOpenChange = (open: boolean) => {
        setIsNotificationsOpen(open);

        if (open) {
            appendSeenNotificationIds(notifications.map((notification) => notification.id));
            loadHomeNotifications(true);
        }
    };

    const handleDismissNotification = (notification: HomeNotification) => {
        if (notification.source === "visitors") {
            return;
        }

        appendSeenNotificationIds([notification.id]);
        appendDismissedNotificationIds([notification.id]);

        if (notification.source === "incidences") {
            appendDismissedIncidenceIds([notification.id]);
        }

        setNotifications((previous) => previous.filter((item) => item.id !== notification.id));
    };

    const handleCopyPassword = () => {
        const textarea = document.createElement('textarea');
        textarea.value = wifiPassword;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();

        try {
            document.execCommand('copy');
            setCopied(true);
            toast.success("Contraseña copiada", { description: "La contraseña WiFi se ha copiado al portapapeles" });
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            toast.error("Error al copiar");
        } finally {
            document.body.removeChild(textarea);
        }
    };

    const getNotificationIcon = (source: string) => {
        switch (source) {
            case "announcements": return <Megaphone className="w-5 h-5 text-blue-600" />;
            case "incidences": return <AlertCircle className="w-5 h-5 text-orange-600" />;
            case "packages": return <Package className="w-5 h-5 text-green-600" />;
            case "visitors": return <Users className="w-5 h-5 text-red-600" />;
            default: return <Calendar className="w-5 h-5 text-purple-600" />;
        }
    };

    return (
        <div className="bg-[#F5F5F5] min-h-full">
            <div className="bg-primary pt-12 pb-24 px-6 rounded-b-[2.5rem] relative">
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-3">
                        <Avatar className="border-2 border-primary-foreground/30 w-12 h-12">
                            <AvatarFallback className="bg-primary-foreground/20 text-primary-foreground font-bold">
                                {userData.initials}
                            </AvatarFallback>
                        </Avatar>
                        <div>
                            <p className="text-primary-foreground/80 text-sm">Bienvenido/a,</p>
                            <h1 className="text-primary-foreground text-2xl font-bold truncate max-w-[180px]">
                                {userData.name}
                            </h1>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Popover open={isNotificationsOpen} onOpenChange={handleNotificationsOpenChange}>
                            <PopoverTrigger asChild>
                                <Button size="icon" variant="ghost" className="text-primary-foreground hover:bg-primary-foreground/20 hover:scale-110 rounded-full transition-all relative">
                                    <Bell className="w-5 h-5" />
                                    {hasUnreadNotifications && (
                                        <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-destructive rounded-full border-2 border-primary" />
                                    )}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent align="end" sideOffset={10} className="w-[min(26rem,calc(100vw-2rem))] p-0">
                                <div className="max-h-[70vh] overflow-y-auto rounded-md bg-white p-4">
                                    <div className="mb-3 flex items-center gap-2">
                                        <Bell className="h-5 w-5 text-primary" />
                                        <h3 className="font-semibold text-gray-900">Notificaciones</h3>
                                    </div>

                                    <div className="space-y-3">
                                        {isNotificationsLoading ? (
                                            <p className="py-4 text-sm text-gray-500">Cargando notificaciones...</p>
                                        ) : notifications.length === 0 ? (
                                            <p className="py-4 text-sm text-gray-500">No tienes notificaciones pendientes.</p>
                                        ) : (
                                            notifications.map((notification) => (
                                                <NotificationCard
                                                    key={notification.id}
                                                    icon={getNotificationIcon(notification.source)}
                                                    title={notification.title}
                                                    description={notification.description}
                                                    time={notification.time}
                                                    type={notification.type}
                                                    dismissible={notification.source !== "visitors"}
                                                    onDismiss={() => handleDismissNotification(notification)}
                                                    onOpenSource={() => {
                                                        if (notification.source === "incidences") {
                                                            const incidenceIds = notifications
                                                                .filter((item) => item.source === "incidences")
                                                                .map((item) => item.id);
                                                            appendDismissedIncidenceIds(incidenceIds);
                                                            setNotifications((previous) => previous.filter((item) => item.source !== "incidences"));
                                                        }
                                                        setIsNotificationsOpen(false);
                                                        onNavigate(notification.source);
                                                    }}
                                                />
                                            ))
                                        )}
                                    </div>
                                </div>
                            </PopoverContent>
                        </Popover>
                        <Button
                            size="icon"
                            variant="ghost"
                            className="text-primary-foreground hover:bg-primary-foreground/20 hover:scale-110 rounded-full transition-all"
                            onClick={() => onNavigate("community")}
                            aria-label="Ir al perfil"
                        >
                            <User className="w-5 h-5" />
                        </Button>
                        {onLogout && (
                            <Button size="icon" variant="ghost" className="text-primary-foreground hover:bg-primary-foreground/20 hover:scale-110 rounded-full transition-all" onClick={onLogout}>
                                <LogOut className="w-5 h-5" />
                            </Button>
                        )}
                    </div>
                </div>

                {/* Digital ID Card con Datos Reales */}
                <div className="absolute left-6 right-6 -bottom-16">
                    <Card className="bg-card shadow-xl shadow-primary/10 border-none rounded-2xl overflow-hidden">
                        <CardContent className="p-0 flex h-32">
                            <button className="w-24 bg-gray-900 flex flex-col items-center justify-center text-white p-2 text-center hover:bg-gray-800 transition-colors cursor-pointer" onClick={() => setIsQrDialogOpen(true)}>
                                <QrCode className="w-10 h-10 mb-2 opacity-80" />
                                <span className="text-[10px] uppercase tracking-wider">Acceso</span>
                            </button>
                            <div className="flex-1 p-4 flex flex-col justify-center">
                                <p className="text-xs text-gray-400 uppercase font-bold tracking-wider">Membresía</p>
                                <p className="text-lg font-bold text-gray-900">{userData.room}</p>
                                <div className="mt-2 flex items-center gap-2">
                                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                                        {userData.status}
                                    </Badge>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            <div className="h-20" />

            {/* Accesos Rápidos */}
            <div className="px-6 pb-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Servicios Rápidos</h2>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                    <QuickAction icon={<MessageSquare className="w-6 h-6" />} label="Avisos" color="bg-primary text-primary-foreground" onClick={() => onNavigate("announcements")} />
                    <QuickAction icon={<Utensils className="w-6 h-6" />} label="Menú" color="bg-primary text-primary-foreground" onClick={() => onNavigate("menu")} />
                    <QuickAction icon={<Wifi className="w-6 h-6" />} label="WiFi" color="bg-primary text-primary-foreground" onClick={() => setIsWifiDialogOpen(true)} />
                    <QuickAction icon={<Package className="w-6 h-6" />} label="Paquetes" color="bg-primary text-primary-foreground" onClick={() => onNavigate("packages")} badge={pendingPackages > 0 ? pendingPackages : undefined} />
                    <QuickAction icon={<Users className="w-6 h-6" />} label="Invitados" color="bg-primary text-primary-foreground" onClick={() => onNavigate("visitors")} />
                </div>
            </div>

            {/* --- DIALOGS (WIFI, QR Y NOTIFICACIONES) --- */}
            <Dialog open={isWifiDialogOpen} onOpenChange={setIsWifiDialogOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Acceso WiFi</DialogTitle>
                        <DialogDescription>Aquí tienes la contraseña para conectarte a la red WiFi de la residencia.</DialogDescription>
                    </DialogHeader>
                    <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-gray-900">{wifiPassword}</p>
                        <Button size="icon" variant="ghost" className="text-gray-500 hover:text-gray-900" onClick={handleCopyPassword}>
                            {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={isQrDialogOpen} onOpenChange={setIsQrDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Código QR de Acceso</DialogTitle>
                        <DialogDescription>Muestra este código para acceder a las instalaciones</DialogDescription>
                    </DialogHeader>
                    <div className="flex flex-col items-center py-6 space-y-6">
                        <div className="w-64 h-64 bg-white border-4 border-gray-200 rounded-2xl flex items-center justify-center shadow-lg">
                            <div className="w-56 h-56 bg-gray-900 rounded-xl flex items-center justify-center">
                                <QrCode className="w-48 h-48 text-white" strokeWidth={1.5} />
                            </div>
                        </div>
                        <div className="text-center space-y-2">
                            <p className="font-bold text-gray-900 text-lg">{userData.name}</p>
                            <p className="text-sm text-gray-600">{userData.room}</p>
                            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 mt-2">{userData.status}</Badge>
                        </div>
                        <p className="text-xs text-gray-400 text-center px-4">Este código QR es personal e intransferible. Úsalo para acceder a la residencia y registrar tu entrada/salida.</p>
                    </div>
                </DialogContent>
            </Dialog>

        </div>
    );
}

import { ReactNode } from "react";

type NotificationType = "urgent" | "admin" | "event" | "info" | "success" | "warning";

interface NotificationCardProps {
    icon: ReactNode;
    title: string;
    description: string;
    time: string;
    type: NotificationType;
    onDismiss: () => void;
    onOpenSource: () => void;
    dismissible?: boolean;
}

interface QuickActionProps {
    icon: ReactNode;
    label: string;
    color: string;
    badge?: string | number;
    onClick: () => void;
}

function NotificationCard({ icon, title, description, time, type, onDismiss, onOpenSource, dismissible = true }: Readonly<NotificationCardProps>) {
    const bgColors: Record<NotificationType, string> = {
        urgent: "border-amber-300 bg-gradient-to-r from-amber-50 to-orange-50 shadow-[0_6px_18px_rgba(245,158,11,0.18)]",
        admin: "bg-blue-50 border-blue-200",
        event: "bg-yellow-50 border-yellow-200",
        info: "bg-gray-50 border-gray-200",
        success: "bg-primary/5 border-primary/20",
        warning: "bg-red-50 border-red-200",
    };

    return (
        <div className={`relative w-full rounded-xl border ${bgColors[type] || bgColors.info} transition-colors hover:shadow-sm`}>
            <button
                className="w-full p-3 pr-10 text-left"
                onClick={onOpenSource}
                type="button"
            >
                <div className="flex gap-3">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm">
                        {icon}
                    </div>
                    <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-gray-900 text-sm mb-0.5">{title}</h4>
                        <p className="text-xs text-gray-600 mb-1">{description}</p>
                        <p className="text-xs text-gray-400">{time}</p>
                    </div>
                </div>
            </button>
            {dismissible ? (
                <Button
                    aria-label={`Descartar notificación ${title}`}
                    className="absolute right-2 top-2 w-9 h-9 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                    onClick={onDismiss}
                    size="icon"
                    type="button"
                    variant="ghost"
                >
                    <X className="h-5 w-5" />
                </Button>
            ) : null}
        </div>
    );
}

function QuickAction({ icon, label, color, badge, onClick }: QuickActionProps) {
    return (
        <button className="flex flex-col items-center gap-2 group" onClick={onClick}>
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-transform group-active:scale-95 relative ${color}`}>
                {icon}
                {badge && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full border-2 border-white">
                        {badge}
                    </span>
                )}
            </div>
            <span className="text-xs font-medium text-gray-600">{label}</span>
        </button>
    );
}