import { useState, useRef, useEffect, useCallback, ReactNode } from "react";
import { Bell, X, Package, Megaphone, AlertCircle, Calendar } from "lucide-react";
import { Button } from "./ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { fetchWithAuth, API_URL_INCIDENCES, API_URL } from "../utils/api";
import announcementService from "../services/announcement.service";
import type { AnnouncementList } from "../types/announcement.types";
import { packagesService } from "../services/packages";
import { objectsService } from "../services/objects";
import { listMyReservationReminders, type ReservationReminderNotification } from "../services/reservations";

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

type ReservationNotificationItem = ReservationReminderNotification;

interface IncidenceItem {
    id: string;
    created_at: string;
    title?: string;
    message?: string;
}

interface EventItem {
    id: number;
    end_time: string;
    start_time: string;
    created_at?: string;
    title: string;
    location?: string;
    host?: {
        id?: number;
    };
}

interface NotificationCardProps {
    readonly icon: ReactNode;
    readonly title: string;
    readonly description: string;
    readonly time: string;
    readonly type: NotificationType;
    readonly source: StudentTab;
    readonly dismissible?: boolean;
    readonly onDismiss: () => void;
    readonly onOpenSource: () => void;
}

function NotificationCard(props: Readonly<NotificationCardProps>) {
    const { icon, title, description, time, type, source, dismissible = true, onDismiss, onOpenSource } = props;
    const sourceStyles: Partial<Record<StudentTab, {
        container: string;
        accent: string;
        badge: string;
        badgeText: string;
        iconWrap: string;
        time: string;
    }>> = {
        announcements: {
            container: "border-blue-200 bg-gradient-to-br from-blue-50 via-white to-slate-50 shadow-[0_4px_14px_rgba(59,130,246,0.08)]",
            accent: "bg-gradient-to-b from-blue-400 to-blue-600",
            badge: "bg-blue-100 text-blue-700",
            badgeText: "Aviso",
            iconWrap: "bg-blue-100 ring-1 ring-blue-200",
            time: "text-blue-700",
        },
        incidences: {
            container: "border-red-200 bg-gradient-to-br from-red-50 via-white to-rose-50 shadow-[0_4px_14px_rgba(239,68,68,0.09)]",
            accent: "bg-gradient-to-b from-red-400 to-rose-600",
            badge: "bg-red-100 text-red-700",
            badgeText: "Incidencia",
            iconWrap: "bg-red-100 ring-1 ring-red-200",
            time: "text-red-700",
        },
        events: {
            container: "border-amber-200 bg-gradient-to-br from-amber-50 via-white to-yellow-50 shadow-[0_4px_14px_rgba(245,158,11,0.1)]",
            accent: "bg-gradient-to-b from-amber-400 to-yellow-500",
            badge: "bg-amber-100 text-amber-700",
            badgeText: "Evento",
            iconWrap: "bg-amber-100 ring-1 ring-amber-200",
            time: "text-amber-700",
        },
        packages: {
            container: "border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-green-50 shadow-[0_4px_14px_rgba(16,185,129,0.1)]",
            accent: "bg-gradient-to-b from-emerald-400 to-green-600",
            badge: "bg-emerald-100 text-emerald-700",
            badgeText: "Paquete",
            iconWrap: "bg-emerald-100 ring-1 ring-emerald-200",
            time: "text-emerald-700",
        },
        reservations: {
            container: "border-teal-200 bg-gradient-to-br from-teal-50 via-white to-cyan-50 shadow-[0_4px_14px_rgba(13,148,136,0.1)]",
            accent: "bg-gradient-to-b from-teal-400 to-cyan-600",
            badge: "bg-teal-100 text-teal-700",
            badgeText: "Recordatorio",
            iconWrap: "bg-teal-100 ring-1 ring-teal-200",
            time: "text-teal-700",
        },
    };

    const fallbackByType: Record<NotificationType, {
        container: string;
        accent: string;
        badge: string;
        badgeText: string;
        iconWrap: string;
        time: string;
    }> = {
        urgent: {
            container: "border-amber-300 bg-gradient-to-br from-amber-50 via-white to-orange-50 shadow-[0_8px_24px_rgba(245,158,11,0.18)]",
            accent: "bg-gradient-to-b from-amber-400 to-orange-600",
            badge: "bg-amber-100 text-amber-700",
            badgeText: "Urgente",
            iconWrap: "bg-amber-100 ring-1 ring-amber-200",
            time: "text-amber-700",
        },
        admin: {
            container: "border-blue-200 bg-gradient-to-br from-blue-50 via-white to-slate-50",
            accent: "bg-gradient-to-b from-blue-400 to-blue-600",
            badge: "bg-blue-100 text-blue-700",
            badgeText: "Admin",
            iconWrap: "bg-blue-100 ring-1 ring-blue-200",
            time: "text-blue-700",
        },
        event: {
            container: "border-amber-200 bg-gradient-to-br from-amber-50 via-white to-yellow-50",
            accent: "bg-gradient-to-b from-amber-400 to-yellow-500",
            badge: "bg-amber-100 text-amber-700",
            badgeText: "Evento",
            iconWrap: "bg-amber-100 ring-1 ring-amber-200",
            time: "text-amber-700",
        },
        info: {
            container: "border-slate-200 bg-gradient-to-br from-slate-50 via-white to-slate-100",
            accent: "bg-gradient-to-b from-slate-400 to-slate-600",
            badge: "bg-slate-100 text-slate-700",
            badgeText: "Info",
            iconWrap: "bg-slate-100 ring-1 ring-slate-200",
            time: "text-slate-600",
        },
        success: {
            container: "border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-green-50",
            accent: "bg-gradient-to-b from-emerald-400 to-green-600",
            badge: "bg-emerald-100 text-emerald-700",
            badgeText: "OK",
            iconWrap: "bg-emerald-100 ring-1 ring-emerald-200",
            time: "text-emerald-700",
        },
        warning: {
            container: "border-rose-200 bg-gradient-to-br from-rose-50 via-white to-red-50",
            accent: "bg-gradient-to-b from-rose-400 to-red-600",
            badge: "bg-rose-100 text-rose-700",
            badgeText: "Alerta",
            iconWrap: "bg-rose-100 ring-1 ring-rose-200",
            time: "text-rose-700",
        },
    };

    const isReservationReminder = source === "reservations";
    const style = sourceStyles[source] || fallbackByType[type] || fallbackByType.info;

    return (
        <div className={`relative w-full overflow-hidden rounded-xl border ${style.container} transition-all hover:-translate-y-0.5 hover:shadow-md`}>
            <span className={`absolute left-0 top-0 h-full ${isReservationReminder ? "w-1.5" : "w-1"} ${style.accent}`} />
            <button
                className={`w-full py-2.5 pl-3 text-left ${dismissible ? "pr-9" : "pr-3"}`}
                onClick={onOpenSource}
                type="button"
            >
                <div className="flex gap-2.5">
                    <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full shadow-sm ${style.iconWrap}`}>
                        {icon}
                    </div>
                    <div className="flex-1 min-w-0">
                        <span className={`mb-0.5 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${style.badge}`}>
                            {style.badgeText}
                        </span>
                        <h4 className="mb-0.5 text-sm font-bold text-gray-900 leading-tight">{title}</h4>
                        <p className="mb-0.5 text-xs text-gray-600 leading-tight line-clamp-2">{description}</p>
                        <p className={`text-xs ${isReservationReminder ? "font-semibold" : "font-medium"} ${style.time}`}>{time}</p>
                    </div>
                </div>
            </button>
            {dismissible ? (
                <Button
                    aria-label={`Descartar notificación ${title}`}
                    className="absolute right-1.5 top-1.5 h-8 w-8 rounded-lg text-gray-500 transition-all hover:bg-red-50 hover:text-red-600"
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

const HOME_NOTIFICATIONS_SEEN_IDS_KEY = "home-notifications-seen-ids";
const HOME_NOTIFICATIONS_DISMISSED_IDS_KEY = "home-notifications-dismissed-ids";
const HOME_INCIDENCES_DISMISSED_IDS_KEY = "home-incidences-dismissed-ids";
const HOME_INCIDENCES_SEEN_AT_KEY = "home-incidences-seen-at";
const HOME_ANNOUNCEMENTS_SEEN_AT_KEY = "home-announcements-seen-at";
const HOME_RESERVATIONS_SEEN_AT_KEY = "home-reservations-seen-at";
const HOME_NOTIFICATIONS_CACHE_KEY = "home-notifications-cache";
const VISIT_URGENT_NOTIFICATION_KEY_BASE = "visit-urgent-shared-notifications";
const NOTIFICATIONS_POLL = 5000;
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
    if (!raw) return [];
    try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
};

const getInitialSeenIds = (): string[] => {
    if (globalThis.window === undefined) {
        return [];
    }

    return parseSeenIds(globalThis.localStorage.getItem(HOME_NOTIFICATIONS_SEEN_IDS_KEY));
};

const getInitialDismissedNotificationIds = (): string[] => {
    if (globalThis.window === undefined) {
        return [];
    }

    return parseSeenIds(globalThis.localStorage.getItem(HOME_NOTIFICATIONS_DISMISSED_IDS_KEY));
};

const getInitialDismissedIncidenceIds = (): string[] => {
    if (globalThis.window === undefined) {
        return [];
    }

    return parseSeenIds(globalThis.localStorage.getItem(HOME_INCIDENCES_DISMISSED_IDS_KEY));
};

const getIncidencesSeenAtMs = (): number => {
    if (globalThis.window === undefined) return 0;
    const raw = globalThis.localStorage.getItem(HOME_INCIDENCES_SEEN_AT_KEY);
    if (!raw) return 0;
    const parsedMs = Date.parse(raw);
    return Number.isFinite(parsedMs) ? parsedMs : 0;
};

const getAnnouncementsSeenAtMs = (): number => {
    if (globalThis.window === undefined) return 0;
    const raw = globalThis.localStorage.getItem(HOME_ANNOUNCEMENTS_SEEN_AT_KEY);
    if (!raw) return 0;
    const parsedMs = Date.parse(raw);
    return Number.isFinite(parsedMs) ? parsedMs : 0;
};

const getReservationsSeenAtMs = (): number => {
    if (globalThis.window === undefined) return 0;
    const raw = globalThis.localStorage.getItem(HOME_RESERVATIONS_SEEN_AT_KEY);
    if (!raw) return 0;
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

const getCachedNotifications = (): HomeNotification[] => {
    if (globalThis.window === undefined) {
        return [];
    }

    const raw = globalThis.localStorage.getItem(HOME_NOTIFICATIONS_CACHE_KEY);
    if (!raw) {
        return [];
    }

    try {
        const parsed = JSON.parse(raw) as HomeNotification[];
        if (!Array.isArray(parsed)) {
            return [];
        }

        const dismissedNotificationIds = parseSeenIds(globalThis.localStorage.getItem(HOME_NOTIFICATIONS_DISMISSED_IDS_KEY));
        const dismissedIncidenceIds = parseSeenIds(globalThis.localStorage.getItem(HOME_INCIDENCES_DISMISSED_IDS_KEY));
        const announcementsSeenAtMs = getAnnouncementsSeenAtMs();
        const incidencesSeenAtMs = getIncidencesSeenAtMs();

        return parsed.filter((notification) => {
            if (notification.source === "announcements") {
                return Date.parse(notification.createdAt) > announcementsSeenAtMs;
            }

            if (notification.source === "incidences") {
                return !dismissedIncidenceIds.includes(notification.id) && Date.parse(notification.createdAt) > incidencesSeenAtMs;
            }

            if (notification.source === "visitors") {
                return true;
            }

            return !dismissedNotificationIds.includes(notification.id);
        });
    } catch {
        return [];
    }
};

const saveCachedNotifications = (notifications: HomeNotification[]) => {
    if (globalThis.window === undefined) {
        return;
    }

    globalThis.localStorage.setItem(HOME_NOTIFICATIONS_CACHE_KEY, JSON.stringify(notifications));
};

const saveStoredIds = (key: string, ids: string[]) => {
    if (globalThis.window === undefined) {
        return;
    }

    globalThis.localStorage.setItem(key, JSON.stringify(ids));
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

const getNotificationPriority = (notification: HomeNotification): number => {
    if (notification.source === "visitors") {
        return 2;
    }

    if (notification.source === "reservations") {
        return 1;
    }

    return 0;
};

const isNotificationDismissible = (notification: HomeNotification): boolean => {
    return notification.source !== "visitors";
};

const withTimeout = <T,>(promise: Promise<T>, fallback: T, ms = 7000): Promise<T> => {
    const timeoutPromise = new Promise<T>((resolve) => {
        globalThis.setTimeout(() => resolve(fallback), ms);
    });
    return Promise.race([
        promise.catch(() => fallback),
        timeoutPromise,
    ]);
};

interface CentralNotificationBellProps {
    readonly onNavigate: (view: StudentTab) => void;
    readonly currentUserId: number | null;
    readonly currentUserEmail?: string;
    readonly isSessionUserResolved: boolean;
}

export function CentralNotificationBell(props: Readonly<CentralNotificationBellProps>) {
    const { onNavigate, currentUserId, currentUserEmail = "", isSessionUserResolved } = props;
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
    const initialCachedNotificationsRef = useRef<HomeNotification[]>(getCachedNotifications());
    const initialCachedNotifications = initialCachedNotificationsRef.current;
    const [notifications, setNotifications] = useState<HomeNotification[]>(initialCachedNotifications);
    const [isNotificationsLoading, setIsNotificationsLoading] = useState(initialCachedNotifications.length === 0);
    const [seenNotificationIds, setSeenNotificationIds] = useState<string[]>(getInitialSeenIds);
    const dismissedNotificationIdsRef = useRef<string[]>(getInitialDismissedNotificationIds());
    const dismissedIncidenceIdsRef = useRef<string[]>(getInitialDismissedIncidenceIds());
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
        const nextIds = Array.from(new Set([...dismissedIncidenceIdsRef.current, ...notificationIds]));
        dismissedIncidenceIdsRef.current = nextIds;
        saveStoredIds(HOME_INCIDENCES_DISMISSED_IDS_KEY, nextIds);
    };

    const appendDismissedNotificationIds = (notificationIds: string[]) => {
        const nextIds = Array.from(new Set([...dismissedNotificationIdsRef.current, ...notificationIds]));
        dismissedNotificationIdsRef.current = nextIds;
        saveStoredIds(HOME_NOTIFICATIONS_DISMISSED_IDS_KEY, nextIds);
    };

    const handleNotificationCardDismiss = useCallback((notification: HomeNotification) => {
        if (!isNotificationDismissible(notification)) {
            return;
        }
        appendSeenNotificationIds([notification.id]);
        appendDismissedNotificationIds([notification.id]);
        if (notification.source === "incidences") {
            appendDismissedIncidenceIds([notification.id]);
        }
        setNotifications((previous) => {
            const next = previous.filter((item) => item.id !== notification.id);
            saveCachedNotifications(next);
            return next;
        });
    }, []);

    const handleNotificationCardOpenSource = useCallback((notification: HomeNotification) => {
        if (notification.source === "incidences") {
            const incidenceIds = notifications
                .filter((item) => item.source === "incidences")
                .map((item) => item.id);
            appendDismissedNotificationIds(incidenceIds);
            appendDismissedIncidenceIds(incidenceIds);
            setNotifications((previous) => {
                const next = previous.filter((item) => item.source !== "incidences");
                saveCachedNotifications(next);
                return next;
            });
        }
        setIsNotificationsOpen(false);
        onNavigate(notification.source);
    }, [notifications, onNavigate]);

    const buildAnnouncementItems = useCallback((announcements: AnnouncementList[]): HomeNotification[] => {
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
                    type: "admin" as const, // Same as original
                    source: "announcements" as const,
                    createdAt,
                };
            })
            .filter((announcement) => Date.parse(announcement.createdAt) > announcementsSeenAtMs);
    }, []);

    const buildIncidenceItems = useCallback((incidenceItems: IncidenceItem[]): HomeNotification[] => {
        const incidencesSeenAtMs = getIncidencesSeenAtMs();
        return incidenceItems
            .filter((item) => !dismissedIncidenceIdsRef.current.includes(item.id))
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
    }, []);

    const buildEventItems = useCallback((events: EventItem[]): HomeNotification[] => {
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

    const buildObjectStockAlertItems = useCallback((items: Awaited<ReturnType<typeof objectsService.getUserObjectNotifications>>): HomeNotification[] => {
        return items.map((item) => ({
            id: item.id,
            title: `[Reservas] ${item.title}`,
            description: item.message,
            time: formatRelativeTime(item.created_at),
            type: "warning" as const,
            source: "reservations" as const,
            createdAt: item.created_at,
        }));
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

    const buildReservationReminderItems = useCallback((items: ReservationNotificationItem[]): HomeNotification[] => {
        const reservationsSeenAtMs = getReservationsSeenAtMs();

        return items
            .filter((item) => {
                const createdAtMs = Date.parse(item.created_at);
                return Number.isFinite(createdAtMs) && createdAtMs > reservationsSeenAtMs;
            })
            .map((item) => ({
                id: item.id,
                title: item.title,
                description: item.message,
                time: formatRelativeFuture(item.start_time),
                type: "warning" as const,
                source: "reservations" as const,
                createdAt: item.created_at,
            }));
    }, []);

    const loadNotifications = useCallback(async (silent = false) => {
        const requestId = ++notificationsRequestIdRef.current;
        const shouldShowLoadingState = !silent;
        if (!silent) setIsNotificationsLoading(true);

        try {
            const [
                announcementsRes,
                unviewedRes,
                incidencesRes,
                eventsRes,
                packagesRes,
                objectRemindersRes,
                objectStockAlertsRes,
                spaceReservationsRes,
                objectReservationsRes
            ] = await Promise.all([
                withTimeout(announcementService.getAnnouncements(), [] as AnnouncementList[]),
                withTimeout(announcementService.getUnviewedCount(), { count: 0 } as { count: number }),
                withTimeout(fetchWithAuth(`${API_URL_INCIDENCES}notifications/`), null as Response | null),
                withTimeout(fetchWithAuth(API_URL), null as Response | null),
                withTimeout(packagesService.getPendingCount(), 0),
                withTimeout(objectsService.getPendingRemindersCount(), 0),
                withTimeout(objectsService.getUserObjectNotifications(), [] as Awaited<ReturnType<typeof objectsService.getUserObjectNotifications>>),
                withTimeout(listMyReservationReminders(), [] as ReservationNotificationItem[]),
                withTimeout(objectsService.getUserObjectReservationReminders(), [] as ReservationNotificationItem[]),
            ]);

            if (requestId !== notificationsRequestIdRef.current) return;

            const mergedNotifications: HomeNotification[] = [
                ...buildAnnouncementItems(announcementsRes || []),
                ...buildPackageItems(packagesRes || 0),
                ...buildObjectReminderItems(objectRemindersRes || 0),
                ...buildObjectStockAlertItems(objectStockAlertsRes || []),
                ...buildVisitUrgentItems(),
                ...buildReservationReminderItems(spaceReservationsRes || []),
                ...buildReservationReminderItems(objectReservationsRes || []),
            ];

            if (incidencesRes?.ok) {
                const data = await incidencesRes.json();
                mergedNotifications.push(...buildIncidenceItems(data.results || []));
            }

            if (eventsRes?.ok) {
                const eventsData = await eventsRes.json();
                mergedNotifications.push(...buildEventItems(Array.isArray(eventsData) ? eventsData : []));
            }

            setUnviewedAnnouncements(unviewedRes.count || 0);

            const visibleNotifications = mergedNotifications.filter(
                (notification) => !dismissedNotificationIdsRef.current.includes(notification.id)
            );

            const sortedNotifications = [...visibleNotifications].sort((a, b) => {
                const priorityDiff = getNotificationPriority(b) - getNotificationPriority(a);
                if (priorityDiff !== 0) {
                    return priorityDiff;
                }

                if (a.source === "reservations" && b.source === "reservations") {
                    return Date.parse(a.createdAt) - Date.parse(b.createdAt);
                }

                return Date.parse(b.createdAt) - Date.parse(a.createdAt);
            });

            const sorted = sortedNotifications.slice(0, NOTIFICATIONS_LIMIT);

            setNotifications(sorted);
            saveCachedNotifications(sorted);

        } catch (error) {
            console.error("Error cargando notificaciones:", error);
        } finally {
            if (shouldShowLoadingState) {
                setIsNotificationsLoading(false);
            }
        }
    }, [buildAnnouncementItems, buildIncidenceItems, buildEventItems, buildPackageItems, buildObjectReminderItems, buildObjectStockAlertItems, buildVisitUrgentItems, buildReservationReminderItems]);

    useEffect(() => {
        loadNotifications(initialCachedNotifications.length > 0);
        const intervalId = globalThis.setInterval(() => loadNotifications(true), NOTIFICATIONS_POLL);
        return () => globalThis.clearInterval(intervalId);
    }, [initialCachedNotifications.length, loadNotifications]);

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
            case "visitors": return <AlertCircle className="w-5 h-5 text-red-600" />;
            case "reservations": return <Calendar className="w-5 h-5 text-teal-700" />;
            default: return <Calendar className="w-5 h-5 text-purple-600" />;
        }
    };

    const renderNotificationsContent = () => {
        if (isNotificationsLoading && notifications.length === 0) {
            return <p className="py-4 text-sm text-gray-500 text-center">Cargando notificaciones...</p>;
        }

        if (notifications.length === 0) {
            return <p className="py-4 text-sm text-gray-500 text-center">No tienes notificaciones pendientes.</p>;
        }

        return notifications.map((notification) => (
            <NotificationCard
                key={notification.id}
                icon={getNotificationIcon(notification.source)}
                title={notification.title}
                description={notification.description}
                time={notification.time}
                type={notification.type}
                source={notification.source}
                dismissible={isNotificationDismissible(notification)}
                onDismiss={() => handleNotificationCardDismiss(notification)}
                onOpenSource={() => handleNotificationCardOpenSource(notification)}
            />
        ));
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
                    <div className="space-y-3">
                        {renderNotificationsContent()}
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}
