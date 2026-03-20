import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { AlertCircle, Calendar, Home, MessageSquare, User } from "lucide-react";
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

interface StudentViewProps {
    onLogout: () => void;
}

const HOME_INCIDENCES_SEEN_AT_KEY = "home-incidences-seen-at";

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
    const previousUnreadCount = useRef<number | null>(null);
    const markAsViewedTimeoutRef = useRef<number | null>(null);
    const processedGroupMessageEventKeysRef = useRef<Set<string>>(new Set());

    const hasAnyChatNews = hasGroupChatNews || hasPrivateChatNews;

    const isGroupLifecycleEvent = (evt: ChatRealtimeEvent): boolean =>
        evt.event === "group_created" || evt.event === "group_updated" || evt.event === "group_deleted";

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

    const handleGroupLifecycleRealtimeEvent = (
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
    };

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
    }, [activeTab, communityChatSubTab, currentUserEmail, isCommunityChatActive]);

    useEffect(() => {
        if (activeTab !== "community") {
            setIsCommunityChatActive(false);
            setCommunityChatSubTab(null);
        }
    }, [activeTab]);

    useEffect(() => {
        const loadUnreadCount = async () => {
            try {
                const data = await announcementService.getUnviewedCount();
                const nextCount = data.count;

                if (
                    previousUnreadCount.current !== null
                    && nextCount > previousUnreadCount.current
                    && activeTab !== "announcements"
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

        const intervalId = globalThis.setInterval(loadUnreadCount, 15000);
        return () => globalThis.clearInterval(intervalId);
    }, [activeTab]);

    useEffect(() => {
        if (activeTab === "incidences") {
            globalThis.localStorage.setItem(HOME_INCIDENCES_SEEN_AT_KEY, new Date().toISOString());
        }

        if (activeTab !== "announcements") {
            if (markAsViewedTimeoutRef.current) {
                globalThis.clearTimeout(markAsViewedTimeoutRef.current);
                markAsViewedTimeoutRef.current = null;
            }
            return;
        }

        const markAsViewed = async () => {
            try {
                await announcementService.markAsViewed();
                previousUnreadCount.current = 0;
                setUnreadAnnouncements(0);
            } catch {
                // Ignorado: no bloquea la navegación
            }
        };

        markAsViewedTimeoutRef.current = globalThis.setTimeout(() => {
            markAsViewed();
            markAsViewedTimeoutRef.current = null;
        }, 5000);

        return () => {
            if (markAsViewedTimeoutRef.current) {
                globalThis.clearTimeout(markAsViewedTimeoutRef.current);
                markAsViewedTimeoutRef.current = null;
            }
        };
    }, [activeTab]);

    const handleNavigation = (tab: StudentTab) => {
        setActiveTab(tab);
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
                tabContent = <StudentIncidences />;
                break;
            case "reservations":
                tabContent = <StudentReservations />;
                break;
            case "community":
                tabContent = (
                    <SocialHub
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
                tabContent = <StudentAnnouncements />;
                break;
            case "packages":
                tabContent = <PackagesPage />;
                break;
            case "visitors":
                tabContent = <ActiveGuestPassesPage />;
                break;
            case "menu":
                tabContent = <ResidentMenuView />;
                break;
            default:
                tabContent = <div className="p-8 text-center text-gray-500">Módulo en construcción</div>;
                break;
        }

        // 3. Devolvemos el contenido envuelto en el div con "p-4"
        return (
            <div className="p-4 h-full">
                {tabContent}
            </div>
        );
    };

    return (
        <div className="min-h-screen flex flex-col w-full bg-background relative">
            <div className="flex-1 overflow-y-auto pb-20">
                {renderContent()}
            </div>

            <nav className="fixed bottom-0 left-0 right-0 bg-background border-t border-border px-6 py-2 pb-6 z-20 w-full shadow-[0_-4px_15px_rgba(0,0,0,0.02)]">
                <div className="flex justify-between items-center">
                    <NavButton icon={<AlertCircle className="w-5 h-5" />} label="Incidencias" active={activeTab === "incidences"} onClick={() => setActiveTab("incidences")} />
                    <NavButton icon={<User className="w-5 h-5" />} label="Social" active={activeTab === "community"} onClick={() => setActiveTab("community")} showIndicator={hasAnyChatNews} />
                    <div className="relative -top-5">
                        <motion.button whileTap={{ scale: 0.95 }} onClick={() => setActiveTab("home")} className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-colors ${activeTab === "home" ? "bg-secondary-brand text-white" : "bg-white text-slate-400 border border-slate-100"}`}>
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
        <button onClick={onClick} className={`relative flex flex-col items-center justify-center p-2 rounded-xl transition-colors ${active ? "text-[#4A7C59]" : "text-slate-400 hover:text-slate-600"}`}>
            {showIndicator && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500" />
            )}
            {icon}
            <span className="text-[10px] font-medium mt-1">{label}</span>
        </button>
    );
}
