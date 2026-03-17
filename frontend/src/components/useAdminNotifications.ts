import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from "react";
import announcementService from "../services/announcement.service";
import { authService } from "../services/auth";
import type { AnnouncementList } from "../types/announcement.types";
import { API_URL, API_URL_INCIDENCES, fetchWithAuth } from "../utils/api";

export type AdminNotificationSource = "incidences" | "reservations" | "events" | "announcements";

export type AdminNotification = {
    id: string;
    source: AdminNotificationSource;
    title: string;
    message: string;
    timestamp: string;
};

type IncidenceNotificationItem = {
    id: string;
    title?: string;
    message?: string;
    created_at: string;
};

type ReservationNotificationItem = {
    id: number;
    title: string;
    message: string;
    created_at: string;
    end_time: string;
};

type ObjectReservationNotificationItem = {
    id: number;
    title: string;
    message: string;
    created_at: string;
    end_time: string;
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

type AnnouncementListResponse = AnnouncementList[] | { results?: AnnouncementList[] };

const ADMIN_NOTIFICATIONS_SEEN_IDS_KEY = "admin-notifications-seen-ids";
const ADMIN_INCIDENCES_DISMISSED_IDS_KEY = "admin-incidences-dismissed-ids";
const ADMIN_RESERVATIONS_DISMISSED_IDS_KEY = "admin-reservations-dismissed-ids";
const ADMIN_EVENTS_DISMISSED_IDS_KEY = "admin-events-dismissed-ids";
const NOTIFICATIONS_LIMIT = 12;
const POLL_MS_DEFAULT = 10000;
const POLL_MS_OPEN = 5000;

const getStoredIds = (key: string): string[] => {
    if (typeof window === "undefined") {
        return [];
    }

    const raw = window.localStorage.getItem(key);
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

const normalizeUserId = (raw: unknown): string | null => {
    if (typeof raw === "number" && Number.isFinite(raw)) {
        return String(raw);
    }
    if (typeof raw === "string" && raw.trim().length > 0) {
        return raw.trim();
    }
    return null;
};

const persistIds = (
    setter: Dispatch<SetStateAction<string[]>>,
    key: string,
    ids: string[]
) => {
    if (typeof window !== "undefined") {
        window.localStorage.setItem(key, JSON.stringify(ids));
    }
    setter(ids);
};

export function useAdminNotifications() {
    const [notifications, setNotifications] = useState<AdminNotification[]>([]);
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
    const [notificationsLoading, setNotificationsLoading] = useState(false);
    const [seenNotificationIds, setSeenNotificationIds] = useState<string[]>(() => getStoredIds(ADMIN_NOTIFICATIONS_SEEN_IDS_KEY));
    const [dismissedIncidenceIds, setDismissedIncidenceIds] = useState<string[]>(() => getStoredIds(ADMIN_INCIDENCES_DISMISSED_IDS_KEY));
    const [dismissedReservationIds, setDismissedReservationIds] = useState<string[]>(() => getStoredIds(ADMIN_RESERVATIONS_DISMISSED_IDS_KEY));
    const [dismissedEventIds, setDismissedEventIds] = useState<string[]>(() => getStoredIds(ADMIN_EVENTS_DISMISSED_IDS_KEY));
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);

    const unreadCount = notifications.filter((notification) => !seenNotificationIds.includes(notification.id)).length;
    const unreadIncidencesCount = notifications.filter(
        (notification) => notification.source === "incidences" && !seenNotificationIds.includes(notification.id)
    ).length;
    const unreadAnnouncementsCount = notifications.filter(
        (notification) => notification.source === "announcements" && !seenNotificationIds.includes(notification.id)
    ).length;
    const hasUnreadNotifications = unreadCount > 0;

    const appendSeenIds = (ids: string[]) => {
        if (ids.length === 0) return;
        const next = Array.from(new Set([...seenNotificationIds, ...ids]));
        persistIds(setSeenNotificationIds, ADMIN_NOTIFICATIONS_SEEN_IDS_KEY, next);
    };

    const appendDismissedIncidenceIds = (ids: string[]) => {
        if (ids.length === 0) return;
        const next = Array.from(new Set([...dismissedIncidenceIds, ...ids]));
        persistIds(setDismissedIncidenceIds, ADMIN_INCIDENCES_DISMISSED_IDS_KEY, next);
    };

    const appendDismissedReservationIds = (ids: string[]) => {
        if (ids.length === 0) return;
        const next = Array.from(new Set([...dismissedReservationIds, ...ids]));
        persistIds(setDismissedReservationIds, ADMIN_RESERVATIONS_DISMISSED_IDS_KEY, next);
    };

    const appendDismissedEventIds = (ids: string[]) => {
        if (ids.length === 0) return;
        const next = Array.from(new Set([...dismissedEventIds, ...ids]));
        persistIds(setDismissedEventIds, ADMIN_EVENTS_DISMISSED_IDS_KEY, next);
    };

    const getNotificationIdsBySource = (source: AdminNotificationSource) => (
        notifications
            .filter((item) => item.source === source)
            .map((item) => item.id)
    );

    const clearIncidenceNotifications = () => {
        const allIncidenceIds = getNotificationIdsBySource("incidences");

        appendSeenIds(allIncidenceIds);
        appendDismissedIncidenceIds(allIncidenceIds);
        setNotifications((previous) => previous.filter((item) => item.source !== "incidences"));
    };

    const markAnnouncementsAsSeen = () => {
        const allAnnouncementIds = getNotificationIdsBySource("announcements");
        appendSeenIds(allAnnouncementIds);
    };

    const loadAdminNotifications = useCallback(async (silent = false) => {
        try {
            if (!silent) {
                setNotificationsLoading(true);
            }

            const [announcementsResult, incidencesResult, reservationsResult, objectReservationsResult, eventsResult] = await Promise.allSettled([
                announcementService.getAnnouncements(),
                fetchWithAuth(`${API_URL_INCIDENCES}notifications/`),
                fetchWithAuth("/api/admin/spaces/notifications/"),
                fetchWithAuth("/api/admin/objects/notifications/"),
                fetchWithAuth(API_URL),
            ]);

            const merged: AdminNotification[] = [];

            if (incidencesResult.status === "fulfilled" && incidencesResult.value.ok) {
                const data = await incidencesResult.value.json();
                const incidenceItems = Array.isArray(data?.results) ? (data.results as IncidenceNotificationItem[]) : [];

                incidenceItems
                    .map((item) => ({
                        id: `incidences-${item.id}`,
                        source: "incidences" as const,
                        title: `[Incidencias] ${item.title || "Nueva incidencia"}`,
                        message: item.message || "Nueva incidencia registrada.",
                        timestamp: item.created_at,
                    }))
                    .filter((item) => !dismissedIncidenceIds.includes(item.id))
                    .forEach((item) => merged.push(item));
            }

            if (reservationsResult.status === "fulfilled" && reservationsResult.value.ok) {
                const data = await reservationsResult.value.json();
                const reservationItems = Array.isArray(data) ? (data as ReservationNotificationItem[]) : [];

                reservationItems
                    .map((item) => ({
                        id: `reservations-${item.id}`,
                        source: "reservations" as const,
                        title: `[Reservas] ${item.title}`,
                        message: item.message,
                        timestamp: item.created_at,
                    }))
                    .filter((item) => !dismissedReservationIds.includes(item.id))
                    .forEach((item) => merged.push(item));
            }

            if (objectReservationsResult.status === "fulfilled" && objectReservationsResult.value.ok) {
                const data = await objectReservationsResult.value.json();
                const reservationItems = Array.isArray(data) ? (data as ObjectReservationNotificationItem[]) : [];

                reservationItems
                    .map((item) => ({
                        id: `object-reservations-${item.id}`,
                        source: "reservations" as const,
                        title: `[Reservas] ${item.title}`,
                        message: item.message,
                        timestamp: item.created_at,
                    }))
                    .filter((item) => !dismissedReservationIds.includes(item.id))
                    .forEach((item) => merged.push(item));
            }

            if (eventsResult.status === "fulfilled" && eventsResult.value.ok) {
                const data = await eventsResult.value.json();
                const eventItems = Array.isArray(data) ? (data as EventItem[]) : [];
                const now = Date.now();

                eventItems
                    .filter((event) => Date.parse(event.end_time) > now)
                    .filter((event) => !(currentUserId !== null && String(event.host?.id) === currentUserId))
                    .forEach((event) => {
                        const createdAt = event.created_at || event.start_time;
                        const notification = {
                            id: `events-${event.id}`,
                            source: "events",
                            title: `[Eventos] ${event.title}`,
                            message: event.location ? `Lugar: ${event.location}` : "Nuevo evento disponible.",
                            timestamp: createdAt,
                        } as const;

                        if (!dismissedEventIds.includes(notification.id)) {
                            merged.push(notification);
                        }
                    });
            }

            if (announcementsResult.status === "fulfilled") {
                const response = announcementsResult.value as AnnouncementListResponse;
                const announcementItems = Array.isArray(response) ? response : (response.results || []);

                announcementItems
                    .filter((item) => !item.has_passed)
                    .filter((item) => currentUserId === null || String(item.user) !== currentUserId)
                    .forEach((item) => {
                        const createdAt = item.publication_date || `${item.announcement_date}T00:00:00`;
                        merged.push({
                            id: `announcements-${item.id}`,
                            source: "announcements",
                            title: `[Avisos] ${item.title}`,
                            message: item.description,
                            timestamp: createdAt,
                        });
                    });
            }

            const sortedNotifications = merged
                .sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp))
                .slice(0, NOTIFICATIONS_LIMIT);

            setNotifications(sortedNotifications);
        } catch (error) {
            console.error("Error cargando notificaciones admin:", error);
        } finally {
            if (!silent) {
                setNotificationsLoading(false);
            }
        }
    }, [currentUserId, dismissedIncidenceIds, dismissedReservationIds, dismissedEventIds]);

    const handleNotificationsOpenChange = (open: boolean) => {
        setIsNotificationsOpen(open);

        if (open) {
            loadAdminNotifications(true);
        }
    };

    const handleOpenNotification = (notification: AdminNotification): AdminNotificationSource => {
        appendSeenIds([notification.id]);

        if (notification.source === "incidences") {
            clearIncidenceNotifications();
        }

        if (notification.source === "reservations") {
            appendDismissedReservationIds([notification.id]);
            setNotifications((previous) => previous.filter((item) => item.id !== notification.id));
        }

        if (notification.source === "events") {
            const allEventIds = getNotificationIdsBySource("events");

            appendSeenIds(allEventIds);
            appendDismissedEventIds(allEventIds);
            setNotifications((previous) => previous.filter((item) => item.source !== "events"));
        }

        if (notification.source === "announcements") {
            markAnnouncementsAsSeen();
        }

        setIsNotificationsOpen(false);
        return notification.source;
    };

    const handleNavbarModuleAccess = (tab: string) => {
        if (tab === "incidences") {
            clearIncidenceNotifications();
        }
        if (tab === "announcements") {
            markAnnouncementsAsSeen();
        }
    };

    useEffect(() => {
        const loadSessionUser = async () => {
            try {
                const session = await authService.me();
                setCurrentUserId(normalizeUserId(session.user?.id));
            } catch {
                setCurrentUserId(null);
            }
        };

        loadSessionUser();
    }, []);

    useEffect(() => {
        loadAdminNotifications(false);
    }, [loadAdminNotifications]);

    useEffect(() => {
        const intervalMs = isNotificationsOpen ? POLL_MS_OPEN : POLL_MS_DEFAULT;
        const intervalId = window.setInterval(() => {
            loadAdminNotifications(true);
        }, intervalMs);

        return () => window.clearInterval(intervalId);
    }, [isNotificationsOpen, loadAdminNotifications]);

    return {
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
    };
}
