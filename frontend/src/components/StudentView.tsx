import React, { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { AlertCircle, AlertTriangle, Calendar, Home, MessageSquare, User } from "lucide-react";
import { toast } from "sonner";

// Importamos la página de inicio y el tipo de las pestañas
import { StudentHome, StudentTab } from "./StudentHome";
import { PackagesPage } from "../pages/Packages/Packages";

// Páginas / Servicios
import { SocialHub } from "../pages/Social/SocialHub.tsx";
import { StudentAnnouncements } from "../pages/announcements/StudentAnnouncements";
import StudentIncidences from "../pages/Incidences/components/StudentIncidences";
import { MyMatchesPage } from "../pages/Matching/MyMatchesPage";
import { ResidentMenuView } from "../pages/Menu/ResidentMenuView";
import announcementService from "../services/announcement.service";
import { StudentReservations } from "./StudentReservations";
import { chatsService, type ChatRealtimeEvent } from "../services/chats";
import { authService } from "../services/auth";
import { ActiveGuestPassesPage } from "../pages/Visitors/ActiveGuestPasses";
import type { ResidenceBranding } from "../services/branding";
import {
    getMyGuestPassPolicy,
    listMyActiveGuestPasses,
    listMyUpcomingGuestPasses,
} from "../services/guestPasses";

interface StudentViewProps {
    onLogout: () => void;
}

const HOME_ANNOUNCEMENTS_SEEN_AT_KEY = "home-announcements-seen-at";
const VISIT_URGENT_WARNING_WINDOW_MS = 10 * 60 * 1000;
const VISIT_URGENT_CHECK_INTERVAL_MS = 30 * 1000;
const VISIT_STATE_CHANGED_EVENT = "visit-state-changed";
const VISIT_URGENT_NOTIFICATION_KEY = "visit-urgent-shared-notifications";
const VISIT_URGENT_NOTIFICATION_EVENT = "visit-urgent-notification-changed";

type VisitUrgentSharedNotification = {
    id: string;
    title: string;
    message: string;
    created_at: string;
    expires_at: string;
    source: "visitors";
};

function buildResidentUnreadGroupsStorageKey(email: string): string | null {
    const normalized = email.trim().toLowerCase();
    if (!normalized) return null;
    return `student-chat-unread-groups:${normalized}`;
}

function persistResidentUnreadGroupIncrement(email: string, groupId: number): void {
    const storageKey = buildResidentUnreadGroupsStorageKey(email);
    if (!storageKey) return;
    if (!Number.isFinite(groupId) || groupId <= 0) return;

    try {
        const raw = globalThis.localStorage.getItem(storageKey);
        const parsed = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
        const previous = Number(parsed[String(groupId)] ?? 0);
        const nextValue = Number.isFinite(previous) && previous > 0 ? previous + 1 : 1;
        parsed[String(groupId)] = nextValue;
        globalThis.localStorage.setItem(storageKey, JSON.stringify(parsed));
    } catch {
        //
    }
}

function buildGroupMessageEventKey(evt: ChatRealtimeEvent): string | null {
    const groupId = Number(evt.payload?.group_id ?? -1);
    if (!Number.isFinite(groupId) || groupId <= 0) return null;

    const payloadMessage = evt.payload?.message as { id?: number } | undefined;
    const messageId = Number(evt.payload?.message_id ?? payloadMessage?.id ?? -1);
    if (Number.isFinite(messageId) && messageId > 0) {
        return `${groupId}:${messageId}`;
    }

    const senderEmail = typeof evt.payload?.sender_email === "string"
        ? evt.payload.sender_email.trim().toLowerCase()
        : "";
    const ts = typeof evt.ts === "number" ? evt.ts : Date.now();
    return `${groupId}:fallback:${senderEmail || "unknown"}:${ts}`;
}

export function StudentView({ onLogout }: StudentViewProps) {
    const [activeTab, setActiveTab] = useState<StudentTab>("home");
    const [unreadAnnouncements, setUnreadAnnouncements] = useState(0);
    const [currentUserEmail, setCurrentUserEmail] = useState("");
    const [chatRealtimeTick, setChatRealtimeTick] = useState(0);
    const [chatRealtimeEvent, setChatRealtimeEvent] = useState<ChatRealtimeEvent | null>(null);
    const [isCommunityChatActive, setIsCommunityChatActive] = useState(false);
    const [communityChatSubTab, setCommunityChatSubTab] = useState<"grupos" | "privados" | null>(null);
    const [hasGroupChatNews, setHasGroupChatNews] = useState(false);
    const [hasPrivateChatNews, setHasPrivateChatNews] = useState(false);
    const [visitLimitBanner, setVisitLimitBanner] = useState<{ minutesRemaining: number; visitEndLabel: string } | null>(null);
    const previousUnreadCount = useRef<number | null>(null);
    const processedGroupMessageEventKeysRef = useRef<Set<string>>(new Set());
    const notifiedExpiringPassesRef = useRef<Set<string>>(new Set());
    const urgentVisitCheckSequenceRef = useRef(0);

    const hasAnyChatNews = hasGroupChatNews || hasPrivateChatNews;

    const syncVisitUrgentSharedNotifications = useCallback((payload: VisitUrgentSharedNotification[]) => {
        if (typeof window === "undefined") {
            return;
        }

        if (!payload.length) {
            globalThis.localStorage.removeItem(VISIT_URGENT_NOTIFICATION_KEY);
            globalThis.dispatchEvent(new Event(VISIT_URGENT_NOTIFICATION_EVENT));
            return;
        }

        try {
            const raw = globalThis.localStorage.getItem(VISIT_URGENT_NOTIFICATION_KEY);
            const createdAtById = new Map<string, string>();
            if (raw) {
                const parsed = JSON.parse(raw) as VisitUrgentSharedNotification | VisitUrgentSharedNotification[];
                const currentItems = Array.isArray(parsed) ? parsed : [parsed];
                for (const item of currentItems) {
                    if (item?.id && item?.created_at) {
                        createdAtById.set(item.id, item.created_at);
                    }
                }
            }

            payload = payload.map((item) => ({
                ...item,
                created_at: createdAtById.get(item.id) || item.created_at,
            }));
        } catch {
            // If existing payload is invalid, overwrite it below.
        }

        globalThis.localStorage.setItem(VISIT_URGENT_NOTIFICATION_KEY, JSON.stringify(payload));
        globalThis.dispatchEvent(new Event(VISIT_URGENT_NOTIFICATION_EVENT));
    }, []);

    const isGroupLifecycleEvent = useCallback((evt: ChatRealtimeEvent): boolean =>
        evt.event === "group_created" || evt.event === "group_updated" || evt.event === "group_deleted", []);

    const isIncomingMessageEvent = (evt: ChatRealtimeEvent): boolean =>
        evt.event === "group_message_created" || evt.event === "private_message_created";

    const shouldSkipDuplicateGroupMessageEvent = (evt: ChatRealtimeEvent): boolean => {
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
            const recent = Array.from(processedGroupMessageEventKeysRef.current).slice(-500);
            processedGroupMessageEventKeysRef.current = new Set(recent);
        }

        return false;
    };

    const getSenderEmailFromEvent = (evt: ChatRealtimeEvent): string =>
        typeof evt.payload?.sender_email === "string" ? evt.payload.sender_email.trim().toLowerCase() : "";

    const handleGroupLifecycleRealtimeEvent = useCallback((
        evt: ChatRealtimeEvent,
        isViewingGroupChats: boolean,
    ): boolean => {
        if (!isGroupLifecycleEvent(evt)) {
            return false;
        }

        setChatRealtimeEvent(evt);
        setChatRealtimeTick((prev) => prev + 1);
        if (!isViewingGroupChats) {
            setHasGroupChatNews(true);
        }

        return true;
    }, [isGroupLifecycleEvent]);

    useEffect(() => {
        let mounted = true;
        const loadBranding = async () => {
            try {
                const { brandingService } = await import("../services/branding");
                const { applyGlobalBranding } = await import("../hooks/useTenantBranding");
                const branding = await brandingService.get();
                if (mounted && branding) {
                    applyGlobalBranding(branding);
                }
            } catch {
                // Branding is optional
            }
        };
        loadBranding();
        return () => { mounted = false; };
    }, []);

    useEffect(() => {
        authService.me().then((session) => {
            if (session.user?.email) {
                setCurrentUserEmail(session.user.email);
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

            const isViewingGroupChats = activeTab === "community" && isCommunityChatActive && communityChatSubTab === "grupos";
            if (handleGroupLifecycleRealtimeEvent(evt, isViewingGroupChats)) {
                return;
            }

            if (!isIncomingMessageEvent(evt)) {
                return;
            }

            if (shouldSkipDuplicateGroupMessageEvent(evt)) {
                return;
            }

            const senderEmail = getSenderEmailFromEvent(evt);
            if (!senderEmail || senderEmail === normalizedCurrentUserEmail) return;

            setChatRealtimeEvent(evt);
            setChatRealtimeTick((prev) => prev + 1);

            const isViewingPrivateChats = activeTab === "community" && isCommunityChatActive && communityChatSubTab === "privados";

            if (evt.event === "group_message_created" && !isViewingGroupChats) {
                setHasGroupChatNews(true);

                const chatModuleMounted = activeTab === "community" && isCommunityChatActive;
                if (!chatModuleMounted) {
                    const groupId = Number(evt.payload?.group_id ?? -1);
                    persistResidentUnreadGroupIncrement(currentUserEmail, groupId);
                }
            }

            if (evt.event === "private_message_created" && !isViewingPrivateChats) {
                setHasPrivateChatNews(true);
            }

        });

        source.onopen = () => {
            console.info("[chat-sse][student] connected");
        };

        source.onerror = () => {
            console.warn("[chat-sse][student] connection error; browser will retry");
        };

        return () => {
            source.close();
        };
    }, [activeTab, communityChatSubTab, currentUserEmail, handleGroupLifecycleRealtimeEvent, isCommunityChatActive]);

    useEffect(() => {
        if (activeTab !== "community") {
            setIsCommunityChatActive(false);
            setCommunityChatSubTab(null);
        }
    }, [activeTab]);

    useEffect(() => {
        let cancelled = false;

        const runUrgentVisitChecks = async () => {
            const currentSequence = ++urgentVisitCheckSequenceRef.current;
            try {
                const [activePasses, upcomingPasses, policy] = await Promise.all([
                    listMyActiveGuestPasses(),
                    listMyUpcomingGuestPasses(),
                    getMyGuestPassPolicy(),
                ]);
                if (cancelled || currentSequence !== urgentVisitCheckSequenceRef.current) return;

                const nowMs = Date.now();
                const allRelevantPasses = [...activePasses, ...upcomingPasses];

                const expiringPasses = allRelevantPasses
                    .map((pass) => {
                        const validUntilMs = new Date(pass.valid_until).getTime();
                        if (Number.isNaN(validUntilMs) || validUntilMs <= nowMs) {
                            return null;
                        }

                        const timeRemainingMs = validUntilMs - nowMs;
                        if (timeRemainingMs > VISIT_URGENT_WARNING_WINDOW_MS) {
                            return null;
                        }

                        return {
                            passCode: pass.pass_code,
                            validUntilIso: pass.valid_until,
                            minutesRemaining: Math.max(1, Math.ceil(timeRemainingMs / 60000)),
                            passId: pass.id,
                        };
                    })
                    .filter((item): item is { passCode: string; validUntilIso: string; minutesRemaining: number; passId: number } => Boolean(item))
                    .sort((a, b) => Date.parse(a.validUntilIso) - Date.parse(b.validUntilIso));

                for (const pass of expiringPasses) {
                    const passWarningKey = `${pass.passId}-${pass.validUntilIso}`;
                    if (notifiedExpiringPassesRef.current.has(passWarningKey)) {
                        continue;
                    }

                    notifiedExpiringPassesRef.current.add(passWarningKey);
                    toast.warning("Tu pase está a punto de caducar", {
                        description: `Quedan ${pass.minutesRemaining} min para que caduque el pase ${pass.passCode}.`,
                    });
                }

                const sharedNotifications: VisitUrgentSharedNotification[] = expiringPasses.map((pass) => ({
                    id: `visit-expiring-${pass.validUntilIso}`,
                    title: "Pase de invitado por caducar",
                    message: `Quedan ${pass.minutesRemaining} min · Pase ${pass.passCode}`,
                    created_at: new Date().toISOString(),
                    expires_at: pass.validUntilIso,
                    source: "visitors",
                }));
                syncVisitUrgentSharedNotifications(sharedNotifications);

                const visitEndTime = policy.visit_end_time;
                if (!visitEndTime) {
                    if (currentSequence === urgentVisitCheckSequenceRef.current) {
                        setVisitLimitBanner(null);
                    }
                    return;
                }

                const startOfToday = new Date();
                startOfToday.setHours(0, 0, 0, 0);
                const startOfTomorrow = new Date(startOfToday);
                startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);

                const hasVisitForToday = allRelevantPasses.some((pass) => {
                    const validFromMs = new Date(pass.valid_from).getTime();
                    const validUntilMs = new Date(pass.valid_until).getTime();
                    if (Number.isNaN(validFromMs) || Number.isNaN(validUntilMs)) {
                        return false;
                    }
                    return validFromMs < startOfTomorrow.getTime() && validUntilMs > startOfToday.getTime();
                });

                if (!hasVisitForToday) {
                    if (currentSequence === urgentVisitCheckSequenceRef.current) {
                        setVisitLimitBanner(null);
                    }
                    return;
                }

                const [hoursPart, minutesPart] = visitEndTime.slice(0, 5).split(":");
                const visitEndHour = Number(hoursPart);
                const visitEndMinute = Number(minutesPart);
                if (!Number.isInteger(visitEndHour) || !Number.isInteger(visitEndMinute)) {
                    if (currentSequence === urgentVisitCheckSequenceRef.current) {
                        setVisitLimitBanner(null);
                    }
                    return;
                }

                const todayVisitEnd = new Date();
                todayVisitEnd.setHours(visitEndHour, visitEndMinute, 0, 0);
                const visitEndMs = todayVisitEnd.getTime();
                if (visitEndMs <= nowMs) {
                    if (currentSequence === urgentVisitCheckSequenceRef.current) {
                        setVisitLimitBanner(null);
                    }
                    return;
                }

                const remainingMs = visitEndMs - nowMs;
                if (remainingMs > VISIT_URGENT_WARNING_WINDOW_MS) {
                    if (currentSequence === urgentVisitCheckSequenceRef.current) {
                        setVisitLimitBanner(null);
                    }
                    return;
                }

                const minutesRemaining = Math.max(1, Math.ceil(remainingMs / 60000));
                const visitEndLabel = visitEndTime.slice(0, 5);
                if (currentSequence !== urgentVisitCheckSequenceRef.current || cancelled) {
                    return;
                }
                setVisitLimitBanner({ minutesRemaining, visitEndLabel });
            } catch {
                if (!cancelled && currentSequence === urgentVisitCheckSequenceRef.current) {
                    setVisitLimitBanner(null);
                }
                syncVisitUrgentSharedNotifications([]);
            }
        };

        void runUrgentVisitChecks();
        const handleVisitStateChanged = () => {
            void runUrgentVisitChecks();
        };
        globalThis.addEventListener(VISIT_STATE_CHANGED_EVENT, handleVisitStateChanged);
        const intervalId = globalThis.setInterval(() => {
            void runUrgentVisitChecks();
        }, VISIT_URGENT_CHECK_INTERVAL_MS);

        return () => {
            cancelled = true;
            globalThis.clearInterval(intervalId);
            globalThis.removeEventListener(VISIT_STATE_CHANGED_EVENT, handleVisitStateChanged);
        };
    }, [syncVisitUrgentSharedNotifications]);

    useEffect(() => {
        if (activeTab === "announcements") {
            globalThis.localStorage.setItem(HOME_ANNOUNCEMENTS_SEEN_AT_KEY, new Date().toISOString());
        }

        const loadUnreadCount = async () => {
            try {
                const data = await announcementService.getUnviewedCount();
                const nextCount = data.count;

                if (activeTab === "announcements") {
                    previousUnreadCount.current = nextCount;
                    setUnreadAnnouncements(nextCount);
                    return;
                }

                if (
                    previousUnreadCount.current !== null
                    && nextCount > previousUnreadCount.current
                ) {
                    toast.info("Tienes un nuevo aviso disponible", {
                        description: "Revisa la pestaña Avisos para verlo.",
                    });
                }

                previousUnreadCount.current = nextCount;
                setUnreadAnnouncements(data.count);
            } catch {
                setUnreadAnnouncements(0);
            }
        };

        loadUnreadCount();

        if (activeTab === "announcements") {
            return;
        }

        const intervalId = globalThis.setInterval(loadUnreadCount, 3000);
        return () => globalThis.clearInterval(intervalId);
    }, [activeTab]);

    const handleNavigation = (tab: StudentTab) => {
        setActiveTab(tab);
    };

    const handleGoToProfile = () => {
        setActiveTab("community");
    };

    const renderContent = () => {
        // 1. El Home maneja sus propios márgenes (diseño de borde a borde)
        if (activeTab === "home") {
            return <StudentHome onNavigate={handleNavigation} onLogout={onLogout} />;
        }

        // 2. Evaluamos el resto de pestañas
        let tabContent;
        switch (activeTab) {
            case "incidences":
                tabContent = <StudentIncidences onGoToProfile={handleGoToProfile} onLogout={onLogout} />;
                break;
            case "reservations":
                tabContent = <StudentReservations onGoToProfile={handleGoToProfile} onLogout={onLogout} />;
                break;
            case "community":
                tabContent = (
                    <SocialHub
                        onLogout={onLogout}
                        chatRealtimeTick={chatRealtimeTick}
                        chatRealtimeEvent={chatRealtimeEvent}
                        onChatTabActiveChange={setIsCommunityChatActive}
                        onChatSubTabActiveChange={setCommunityChatSubTab}
                        onChatUnreadStatusChange={({ hasGroupUnread, hasPrivateUnread }) => {
                            setHasGroupChatNews(hasGroupUnread);
                            setHasPrivateChatNews(hasPrivateUnread);
                        }}
                        hasChatNews={hasAnyChatNews}
                        hasGroupChatNews={hasGroupChatNews}
                        hasPrivateChatNews={hasPrivateChatNews}
                    />
                );
                break;
            case "events":
                tabContent = <SocialHub initialTab="eventos" />;
                break;
            case "matches":
                tabContent = <MyMatchesPage />;
                break;
            case "announcements":
                tabContent = (
                    <StudentAnnouncements
                        onGoToProfile={handleGoToProfile}
                        onLogout={onLogout}
                        onAnnouncementsLoaded={() => {
                            globalThis.localStorage.setItem(HOME_ANNOUNCEMENTS_SEEN_AT_KEY, new Date().toISOString());
                            setUnreadAnnouncements(0);
                        }}
                    />
                );
                break;
            case "packages":
                tabContent = <PackagesPage onGoToProfile={handleGoToProfile} onLogout={onLogout} />;
                break;
            case "visitors":
                tabContent = <ActiveGuestPassesPage onGoToProfile={handleGoToProfile} onLogout={onLogout} />;
                break;
            case "menu":
                tabContent = <ResidentMenuView onGoToProfile={handleGoToProfile} onLogout={onLogout} />;
                break;
            default:
                tabContent = <div className="p-8 text-center text-gray-500">Módulo en construcción</div>;
                break;
        }

        return (
            <div className="h-full w-full">
                {tabContent}
            </div>
        );
    };

    return (
        <div className="min-h-screen w-full bg-background relative pb-20">
            {visitLimitBanner ? (
                <div className="pointer-events-none fixed left-1/2 top-2 z-50 w-[calc(100%-1rem)] max-w-lg -translate-x-1/2 rounded-lg border border-amber-300 bg-amber-100/95 px-3 py-2 text-amber-900 shadow-lg sm:top-3 sm:px-4 sm:py-2.5">
                    <div className="flex items-start gap-2 sm:gap-3">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 sm:h-5 sm:w-5" />
                        <div className="min-w-0">
                            <p className="text-xs font-semibold leading-tight sm:text-sm">AVISO URGENTE DE VISITAS</p>
                            <p className="text-xs leading-tight sm:text-sm">
                                Quedan <strong>{visitLimitBanner.minutesRemaining} min</strong> ({visitLimitBanner.visitEndLabel}). Las visitas deben salir cuanto antes.
                            </p>
                        </div>
                    </div>
                </div>
            ) : null}

            <div className="w-full">
                {renderContent()}
            </div>

            <nav className="fixed bottom-0 left-0 right-0 bg-background border-t border-border px-6 py-2 pb-6 z-20 w-full shadow-[0_-4px_15px_rgba(0,0,0,0.02)]">
                <div className="flex justify-between items-center">
                    <NavButton icon={<AlertCircle className="w-5 h-5" />} label="Incidencias" active={activeTab === "incidences"} onClick={() => setActiveTab("incidences")} />
                    <NavButton icon={<User className="w-5 h-5" />} label="Social" active={activeTab === "community"} onClick={() => setActiveTab("community")} showIndicator={hasAnyChatNews} />
                    <div className="relative -top-5">
                        <motion.button whileTap={{ scale: 0.95 }} onClick={() => setActiveTab("home")} className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-colors ${activeTab === "home" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground border border-border"}`}>
                            <Home className="w-6 h-6" />
                        </motion.button>
                    </div>
                    <NavButton icon={<Calendar className="w-5 h-5" />} label="Reservas" active={activeTab === "reservations"} onClick={() => setActiveTab("reservations")} />
                    <NavButton icon={<MessageSquare className="w-5 h-5" />} label="Avisos" active={activeTab === "announcements"} onClick={() => setActiveTab("announcements")} showIndicator={unreadAnnouncements > 0} />
                </div>
            </nav>
        </div>
    );
}

function NavButton({ icon, label, active, onClick, showIndicator = false }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void, showIndicator?: boolean }) {
    return (
        <button onClick={onClick} className={`relative flex flex-col items-center justify-center p-2 rounded-xl transition-all ${active ? "bg-primary text-primary-foreground font-bold px-3 shadow-md" : "text-muted-foreground hover:text-foreground"}`}>
            {showIndicator && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-destructive border border-background" />
            )}
            {icon}
            <span className="text-[10px] font-medium mt-1">{label}</span>
        </button>
    );
}
