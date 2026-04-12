import { useState, useRef, useEffect, useCallback, ReactNode } from "react";
import { Bell } from "lucide-react";
import { Button } from "./ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { fetchWithAuth, API_URL_INCIDENCES, API_URL } from "../utils/api";
import announcementService from "../services/announcement.service";
import { packagesService } from "../services/packages";
import { objectsService } from "../services/objects";

export type StudentTab = "home" | "incidences" | "reservations" | "community" | "events" | "matches" | "announcements" | "menu" | "packages" | "visitors";
type NotificationType = "urgent" | "admin" | "event" | "info" | "success" | "warning";

type HomeNotification = {
    id: string;
    title: string;
    description: string;
    time: string;
    type: NotificationType;
    source: StudentTab;
    createdAt: string;
};

interface NotificationCardProps {
    icon: ReactNode;
    title: string;
    description: string;
    time: string;
    type: NotificationType;
    onOpenSource: () => void;
}

function NotificationCard({ icon, title, description, time, type, onOpenSource }: NotificationCardProps) {
    const bgColors: Record<NotificationType, string> = {
        urgent: "bg-orange-50 border-orange-200",
        admin: "bg-blue-50 border-blue-200",
        event: "bg-yellow-50 border-yellow-200",
        info: "bg-gray-50 border-gray-200",
        success: "bg-primary/5 border-primary/20",
        warning: "bg-red-50 border-red-200",
    };

    return (
        <button
            className={`w-full p-4 rounded-xl border ${bgColors[type] || bgColors.info} transition-colors hover:shadow-sm text-left`}
            onClick={onOpenSource}
            type="button"
        >
            <div className="flex gap-3">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm">
                    {icon}
                </div>
                <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-gray-900 text-sm mb-1">{title}</h4>
                    <p className="text-xs text-gray-600 mb-2">{description}</p>
                    <p className="text-xs text-gray-400">{time}</p>
                </div>
            </div>
        </button>
    );
}

const HOME_NOTIFICATIONS_SEEN_IDS_KEY = "home-notifications-seen-ids";
const HOME_INCIDENCES_DISMISSED_IDS_KEY = "home-incidences-dismissed-ids";
const NOTIFICATIONS_POLL = 15000;
const NOTIFICATIONS_LIMIT = 12;

const parseSeenIds = (raw: string | null): string[] => {
    if (!raw) return [];
    try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
};

const getInitialSeenIds = (): string[] => typeof window !== "undefined" ? parseSeenIds(globalThis.localStorage.getItem(HOME_NOTIFICATIONS_SEEN_IDS_KEY)) : [];
const getInitialDismissedIncidenceIds = (): string[] => typeof window !== "undefined" ? parseSeenIds(globalThis.localStorage.getItem(HOME_INCIDENCES_DISMISSED_IDS_KEY)) : [];

const saveStoredIds = (key: string, ids: string[]) => {
    if (typeof window !== "undefined") {
        globalThis.localStorage.setItem(key, JSON.stringify(ids));
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

import { Package, MapPin, CalendarDays, KeyIcon, Info, Megaphone, AlertCircle, Calendar } from "lucide-react";

interface CentralNotificationBellProps {
    onNavigate: (view: StudentTab) => void;
    currentUserId: number | null;
    isSessionUserResolved: boolean;
}

export function CentralNotificationBell({ onNavigate, currentUserId, isSessionUserResolved }: CentralNotificationBellProps) {
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
    const [notifications, setNotifications] = useState<HomeNotification[]>([]);
    const [isNotificationsLoading, setIsNotificationsLoading] = useState(false);
    const [seenNotificationIds, setSeenNotificationIds] = useState<string[]>(getInitialSeenIds);
    const [dismissedIncidenceIds, setDismissedIncidenceIds] = useState<string[]>(getInitialDismissedIncidenceIds);
    const [unviewedAnnouncements, setUnviewedAnnouncements] = useState(0);
    const notificationsRequestIdRef = useRef(0);

    const unreadCount = notifications.filter((notification) => !seenNotificationIds.includes(notification.id)).length;
    const hasUnreadNotifications = unreadCount > 0 || unviewedAnnouncements > 0;

    const appendSeenNotificationIds = (notificationIds: string[]) => {
        setSeenNotificationIds((previousIds) => {
            const nextIds = Array.from(new Set([...previousIds, ...notificationIds]));
            saveStoredIds(HOME_NOTIFICATIONS_SEEN_IDS_KEY, nextIds);
            return nextIds;
        });
    };

    const appendDismissedIncidenceIds = (notificationIds: string[]) => {
        setDismissedIncidenceIds((previousIds) => {
            const nextIds = Array.from(new Set([...previousIds, ...notificationIds]));
            saveStoredIds(HOME_INCIDENCES_DISMISSED_IDS_KEY, nextIds);
            return nextIds;
        });
    };

    const buildAnnouncementItems = useCallback((announcements: any[]): HomeNotification[] => {
        return announcements
            .filter((announcement) => !announcement.has_passed)
            .map((announcement) => {
                const createdAt = announcement.publication_date || `${announcement.announcement_date}T00:00:00`;
                return {
                    id: `announcement-${announcement.id}`,
                    title: `[Avisos] ${announcement.title}`,
                    description: announcement.description,
                    time: formatRelativeTime(createdAt),
                    type: "admin" as const, // Same as original
                    source: "announcements" as const,
                    createdAt,
                };
            });
    }, []);

    const buildIncidenceItems = useCallback((incidenceItems: any[]): HomeNotification[] => {
        return incidenceItems
            .filter((item) => !dismissedIncidenceIds.includes(item.id))
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

    const buildEventItems = useCallback((events: any[]): HomeNotification[] => {
        if (!isSessionUserResolved) return [];
        const now = Date.now();
        return events
            .filter((event) => Date.parse(event.end_time) > now)
            .filter((event) => !(currentUserId !== null && event.host?.id === currentUserId))
            .map((event) => {
                const createdAt = event.created_at || event.start_time;
                const timeLabel = event.created_at ? formatRelativeTime(event.created_at) : formatRelativeFuture(event.start_time);
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

    const loadNotifications = useCallback(async (silent = false) => {
        const requestId = ++notificationsRequestIdRef.current;
        if (!silent) setIsNotificationsLoading(true);

        try {
            const [
                announcementsRes, 
                unviewedRes, 
                incidencesRes, 
                eventsRes, 
                packagesRes,
                objectRemindersRes
            ] = await Promise.allSettled([
                announcementService.getAnnouncements(),
                announcementService.getUnviewedCount(),
                fetchWithAuth(`${API_URL_INCIDENCES}notifications/`),
                fetchWithAuth(`${API_URL}events/`),
                packagesService.getPendingCount(),
                objectsService.getPendingRemindersCount(),
            ]);

            if (requestId !== notificationsRequestIdRef.current) return;

            const mergedNotifications: HomeNotification[] = [
                ...(announcementsRes.status === "fulfilled" ? buildAnnouncementItems(announcementsRes.value) : []),
                ...(packagesRes.status === "fulfilled" ? buildPackageItems(packagesRes.value || 0) : []),
                ...(objectRemindersRes.status === "fulfilled" ? buildObjectReminderItems(objectRemindersRes.value || 0) : []),
            ];

            if (incidencesRes.status === "fulfilled" && incidencesRes.value.ok) {
                const data = await incidencesRes.value.json();
                mergedNotifications.push(...buildIncidenceItems(data.results || []));
            }

            if (eventsRes.status === "fulfilled" && eventsRes.value.ok) {
                const eventsData = await eventsRes.value.json();
                mergedNotifications.push(...buildEventItems(Array.isArray(eventsData) ? eventsData : []));
            }

            if (unviewedRes.status === "fulfilled") {
                setUnviewedAnnouncements(unviewedRes.value.count);
            }

            const sorted = mergedNotifications
                .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
                .slice(0, NOTIFICATIONS_LIMIT);

            setNotifications(sorted);

        } catch (error) {
            console.error("Error cargando notificaciones:", error);
        } finally {
            if (requestId === notificationsRequestIdRef.current && !silent) {
                setIsNotificationsLoading(false);
            }
        }
    }, [buildAnnouncementItems, buildIncidenceItems, buildEventItems, buildPackageItems, buildObjectReminderItems]);

    useEffect(() => {
        loadNotifications();
        const intervalId = globalThis.setInterval(() => loadNotifications(true), NOTIFICATIONS_POLL);
        return () => globalThis.clearInterval(intervalId);
    }, [loadNotifications]);

    const handleNotificationsOpenChange = (open: boolean) => {
        setIsNotificationsOpen(open);
        if (open) {
            appendSeenNotificationIds(notifications.map((notification) => notification.id));
            loadNotifications(true);
        }
    };

    const getNotificationIcon = (source: string) => {
        switch (source) {
            case "announcements": return <Megaphone className="w-5 h-5 text-blue-600" />;
            case "incidences": return <AlertCircle className="w-5 h-5 text-orange-600" />;
            case "packages": return <Package className="w-5 h-5 text-green-600" />;
            default: return <Calendar className="w-5 h-5 text-purple-600" />;
        }
    };

    return (
        <Popover open={isNotificationsOpen} onOpenChange={handleNotificationsOpenChange}>
            <PopoverTrigger asChild>
                <Button
                    size="icon"
                    variant="ghost"
                    className="text-primary-foreground hover:bg-primary-foreground/20 hover:scale-110 rounded-full transition-all relative"
                    aria-label="Ver notificaciones"
                >
                    <Bell className="w-6 h-6" />
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
                    <div className="space-y-2">
                        {isNotificationsLoading && notifications.length === 0 ? (
                            <p className="py-4 text-sm text-gray-500 text-center">Cargando notificaciones...</p>
                        ) : notifications.length === 0 ? (
                            <p className="py-4 text-sm text-gray-500 text-center">No tienes notificaciones pendientes.</p>
                        ) : (
                            notifications.map((notification) => {
                                return (
                                    <NotificationCard
                                        key={notification.id}
                                        icon={getNotificationIcon(notification.source)}
                                        title={notification.title}
                                        description={notification.description}
                                        time={notification.time}
                                        type={notification.type}
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
                                );
                            })
                        )}
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}
