import { ArrowLeft, LogOut, MessageSquare, Plus, Search, Send, Tag, Users } from "lucide-react";
import { type ReactElement, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "../../../components/ui/dialog";
import {
    chatsService,
    type ChatGroup,
    type ChatRealtimeEvent,
    type ChatResident,
    type PrivateConversation,
    type PrivateMessage,
    type GroupMessage,
} from "../../../services/chats";
import { authService } from "../../../services/auth";
import { AdminGroupEdit } from "../../Chats/AdminGroupEdit";

/* ── Helpers ────────────────────────────────────────────────── */

function timeAgo(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "ahora";
    if (mins < 60) return `hace ${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `hace ${hrs}h`;
    const days = Math.floor(hrs / 24);
    return `hace ${days}d`;
}

function dedupeGroupMessages(messages: GroupMessage[]): GroupMessage[] {
    const byId = new Map<number, GroupMessage>();
    for (const msg of messages) {
        const id = Number(msg.id);
        if (!Number.isFinite(id)) continue;
        byId.set(id, msg);
    }
    return Array.from(byId.values()).sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );
}

function appendUniqueGroupMessage(messages: GroupMessage[], incoming: GroupMessage): GroupMessage[] {
    return dedupeGroupMessages([...messages, incoming]);
}

function buildGroupMessageEventKey(evt: ChatRealtimeEvent): string | null {
    const groupId = Number(evt.payload?.group_id ?? -1);
    if (!Number.isFinite(groupId) || groupId <= 0) return null;

    const payloadMessage = evt.payload?.message as Partial<GroupMessage> | undefined;
    const messageId = Number(payloadMessage?.id ?? evt.payload?.message_id ?? -1);
    if (Number.isFinite(messageId) && messageId > 0) {
        return `${groupId}:${messageId}`;
    }

    const senderEmail = typeof evt.payload?.sender_email === "string" ? evt.payload.sender_email : "unknown";
    const ts = typeof evt.ts === "number" ? evt.ts : Date.now();
    return `${groupId}:fallback:${senderEmail}:${ts}`;
}

function buildPrivateMessageEventKey(evt: ChatRealtimeEvent): string | null {
    const conversationId = Number(evt.payload?.conversation_id ?? -1);
    if (!Number.isFinite(conversationId) || conversationId <= 0) return null;

    const payloadMessage = evt.payload?.message as Partial<PrivateMessage> | undefined;
    const messageId = Number(payloadMessage?.id ?? evt.payload?.message_id ?? -1);
    if (Number.isFinite(messageId) && messageId > 0) {
        return `${conversationId}:${messageId}`;
    }

    const senderEmail = typeof evt.payload?.sender_email === "string" ? evt.payload.sender_email : "unknown";
    const ts = typeof evt.ts === "number" ? evt.ts : Date.now();
    return `${conversationId}:fallback:${senderEmail}:${ts}`;
}

/* ── Config etiquetas ───────────────────────────────────────── */

const labelConfig: Record<string, { label: string; color: string; icon: ReactElement }> = {
    general: { label: "General", color: "bg-blue-100 text-blue-800", icon: <MessageSquare className="w-3 h-3" /> },
    floor: { label: "Planta", color: "bg-green-100 text-green-800", icon: <Users className="w-3 h-3" /> },
    activity: { label: "Actividad", color: "bg-purple-100 text-purple-800", icon: <Users className="w-3 h-3" /> },
    private: { label: "Privado", color: "bg-gray-50 text-gray-900", icon: <Users className="w-3 h-3" /> },
};

/* ── Sub-tabs ───────────────────────────────────────────────── */

type ChatSubTab = "grupos" | "privados";
type UnreadGroupCounts = Record<number, number>;

function buildResidentUnreadGroupsStorageKey(email: string): string | null {
    const normalized = email.trim().toLowerCase();
    if (!normalized) return null;
    return `student-chat-unread-groups:${normalized}`;
}

/*  ── Componente principal ──────────────────────────────────── */

export function StudentChats({
    enableRealtimeStream = true,
    realtimeTick = 0,
    realtimeEvent = null,
    hasGroupNews = false,
    hasPrivateNews = false,
    onSubTabActiveChange,
    onUnreadStatusChange,
    focusGroupId = null,
    onFocusGroupHandled,
}: {
    readonly enableRealtimeStream?: boolean;
    readonly realtimeTick?: number;
    readonly realtimeEvent?: ChatRealtimeEvent | null;
    readonly hasGroupNews?: boolean;
    readonly hasPrivateNews?: boolean;
    readonly onSubTabActiveChange?: (tab: ChatSubTab) => void;
    readonly onUnreadStatusChange?: (status: { hasGroupUnread: boolean; hasPrivateUnread: boolean }) => void;
    readonly focusGroupId?: number | null;
    readonly onFocusGroupHandled?: () => void;
}) {
    const [subTab, setSubTab] = useState<ChatSubTab>("grupos");

    // ── Estado grupos ──
    const [groups, setGroups] = useState<ChatGroup[]>([]);
    const [loadingGroups, setLoadingGroups] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedGroup, setSelectedGroup] = useState<ChatGroup | null>(null);
    const [editingGroup, setEditingGroup] = useState<ChatGroup | null>(null);
    const [unreadGroupCounts, setUnreadGroupCounts] = useState<UnreadGroupCounts>({});
    const [showLeaveDialog, setShowLeaveDialog] = useState(false);
    const [leaving, setLeaving] = useState(false);
    const [hasLoadedGroupsOnce, setHasLoadedGroupsOnce] = useState(false);
    const [hasLoadedConversationsOnce, setHasLoadedConversationsOnce] = useState(false);

    // ── Estado mensajes de grupo ──
    const [groupMessages, setGroupMessages] = useState<GroupMessage[]>([]);
    const [loadingGroupMsgs, setLoadingGroupMsgs] = useState(false);
    const [groupMsgText, setGroupMsgText] = useState("");
    const [sendingGroupMsg, setSendingGroupMsg] = useState(false);
    const [currentUserEmail, setCurrentUserEmail] = useState<string>("");
    const groupMessagesEndRef = useRef<HTMLDivElement>(null);

    // ── Estado privados ──
    const [conversations, setConversations] = useState<PrivateConversation[]>([]);
    const [loadingConvs, setLoadingConvs] = useState(false);
    const [convSearch, setConvSearch] = useState("");
    const [activeConv, setActiveConv] = useState<PrivateConversation | null>(null);
    const [messages, setMessages] = useState<PrivateMessage[]>([]);
    const [loadingMsgs, setLoadingMsgs] = useState(false);
    const [msgText, setMsgText] = useState("");
    const [sending, setSending] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const lastProcessedExternalRealtimeTickRef = useRef(0);
    const processedGroupMessageEventKeysRef = useRef<Set<string>>(new Set());
    const processedPrivateMessageEventKeysRef = useRef<Set<string>>(new Set());
    const lastHandledFocusGroupIdRef = useRef<number | null>(null);

    // ── Estado nueva conversación ──
    const [showNewConv, setShowNewConv] = useState(false);
    const [residents, setResidents] = useState<ChatResident[]>([]);
    const [loadingResidents, setLoadingResidents] = useState(false);
    const [residentSearch, setResidentSearch] = useState("");

    const unreadGroupsStorageKey = useMemo(
        () => buildResidentUnreadGroupsStorageKey(currentUserEmail),
        [currentUserEmail],
    );

    /* ────────────────── Carga de grupos ─────────────────────── */

    const loadGroups = useCallback(async () => {
        setLoadingGroups(true);
        try {
            setGroups(await chatsService.listMyGroups());
        } catch {
            toast.error("No se pudieron cargar tus grupos.");
        } finally {
            setLoadingGroups(false);
            setHasLoadedGroupsOnce(true);
        }
    }, []);

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const response = await authService.me();
                if (response.user?.email) {
                    setCurrentUserEmail(response.user.email);
                }
            } catch { /* empty */ }
        };
        fetchUser();
        loadGroups();
    }, [loadGroups]);

    const filteredGroups = useMemo(() =>
        groups.filter(
            (g) =>
                g.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                g.description.toLowerCase().includes(searchTerm.toLowerCase()),
        ),
        [groups, searchTerm]);

    useEffect(() => {
        if (!selectedGroup) return;

        const updated = groups.find((g) => g.id === selectedGroup.id);
        if (!updated) {
            setSelectedGroup(null);
            setGroupMessages([]);
            setGroupMsgText("");
            return;
        }

        setSelectedGroup(updated);
    }, [groups, selectedGroup]);

    useEffect(() => {
        if (!editingGroup) return;

        const updated = groups.find((g) => g.id === editingGroup.id);
        if (!updated) {
            setEditingGroup(null);
            return;
        }

        setEditingGroup(updated);
    }, [editingGroup, groups]);

    const canManageGroup = useCallback((group: ChatGroup) => {
        if (!currentUserEmail) return false;
        if (group.current_user_can_interact === false) return false;

        return group.members_list.some(
            (member) => member.email === currentUserEmail && member.is_admin,
        );
    }, [currentUserEmail]);

    const handleGroupUpdatedFromManagement = (updated: ChatGroup) => {
        setGroups((prev) => prev.map((group) => (group.id === updated.id ? updated : group)));
        setSelectedGroup((prev) => (prev && prev.id === updated.id ? updated : prev));
        setEditingGroup(updated);
    };

    useEffect(() => {
        if (groups.length === 0) {
            setUnreadGroupCounts({});
            return;
        }

        const interactiveGroupIds = new Set(
            groups
                .filter((group) => group.current_user_can_interact !== false)
                .map((group) => group.id),
        );

        setUnreadGroupCounts((prev) => {
            const next = Object.entries(prev).reduce<UnreadGroupCounts>((acc, [key, count]) => {
                const groupId = Number(key);
                if (interactiveGroupIds.has(groupId) && count > 0) {
                    acc[groupId] = count;
                }
                return acc;
            }, {});

            if (Object.keys(next).length === Object.keys(prev).length) {
                return prev;
            }

            return next;
        });
    }, [groups]);

    useEffect(() => {
        if (!unreadGroupsStorageKey) return;

        try {
            const raw = globalThis.localStorage.getItem(unreadGroupsStorageKey);
            if (!raw) return;

            const parsed = JSON.parse(raw) as Record<string, unknown>;
            const restored = Object.entries(parsed).reduce<UnreadGroupCounts>((acc, [key, value]) => {
                const groupId = Number(key);
                const count = Number(value);
                if (Number.isFinite(groupId) && groupId > 0 && Number.isFinite(count) && count > 0) {
                    acc[groupId] = count;
                }
                return acc;
            }, {});

            if (Object.keys(restored).length === 0) return;

            setUnreadGroupCounts((prev) => {
                const merged: UnreadGroupCounts = { ...restored };
                for (const [key, value] of Object.entries(prev)) {
                    const groupId = Number(key);
                    const current = Number(value);
                    if (!Number.isFinite(groupId) || !Number.isFinite(current) || current <= 0) continue;
                    merged[groupId] = Math.max(merged[groupId] ?? 0, current);
                }
                return merged;
            });
        } catch {
        }
    }, [unreadGroupsStorageKey]);

    useEffect(() => {
        if (!unreadGroupsStorageKey) return;

        if (Object.keys(unreadGroupCounts).length === 0) {
            globalThis.localStorage.removeItem(unreadGroupsStorageKey);
            return;
        }

        globalThis.localStorage.setItem(unreadGroupsStorageKey, JSON.stringify(unreadGroupCounts));
    }, [unreadGroupCounts, unreadGroupsStorageKey]);

    const handleLeaveGroup = async () => {
        if (!selectedGroup) return;
        if (!selectedGroup.can_members_leave) {
            toast.error("No puedes abandonar este grupo.");
            return;
        }
        setLeaving(true);
        try {
            await chatsService.leaveGroup(selectedGroup.id);
            setGroups((prev) => prev.filter((g) => g.id !== selectedGroup.id));
            setUnreadGroupCounts((prev) => {
                if (!(selectedGroup.id in prev)) return prev;
                const { [selectedGroup.id]: _ignored, ...rest } = prev;
                return rest;
            });
            toast.success("Has abandonado el grupo.");
            setSelectedGroup(null);
            setGroupMessages([]);
            setShowLeaveDialog(false);
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : "No se pudo abandonar el grupo.");
        } finally {
            setLeaving(false);
        }
    };

    /* ────────────────── Apertura y Mensajes de Grupo ─────────────────────── */

    const openGroup = async (group: ChatGroup) => {
        setUnreadGroupCounts((prev) => {
            if (!(group.id in prev)) return prev;
            const { [group.id]: _ignored, ...rest } = prev;
            return rest;
        });
        setSelectedGroup(group);
        setGroupMessages([]);
        setLoadingGroupMsgs(true);
        try {
            setGroupMessages(dedupeGroupMessages(await chatsService.listGroupMessages(group.id)));
        } catch {
            toast.error("No se pudieron cargar los mensajes del grupo.");
        } finally {
            setLoadingGroupMsgs(false);
        }
    };

    useEffect(() => {
        if (!focusGroupId || focusGroupId <= 0) {
            return;
        }

        if (lastHandledFocusGroupIdRef.current === focusGroupId) {
            return;
        }

        const target = groups.find((group) => group.id === focusGroupId);
        if (!target) {
            return;
        }

        setSubTab("grupos");
        openGroup(target).catch(() => { });
        lastHandledFocusGroupIdRef.current = focusGroupId;
        onFocusGroupHandled?.();
    }, [focusGroupId, groups, onFocusGroupHandled]);

    const loadSelectedGroupMessages = useCallback(async (groupId: number) => {
        try {
            setGroupMessages(dedupeGroupMessages(await chatsService.listGroupMessages(groupId)));
        } catch {
        }
    }, []);

    useEffect(() => {
        groupMessagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [groupMessages]);

    const handleSendGroupMessage = async () => {
        if (!selectedGroup || !groupMsgText.trim()) return;
        setSendingGroupMsg(true);
        try {
            const newMsg = await chatsService.sendGroupMessage(selectedGroup.id, groupMsgText.trim());
            setGroupMessages((prev) => appendUniqueGroupMessage(prev, newMsg));
            setGroupMsgText("");
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : "No se pudo enviar el mensaje.");
        } finally {
            setSendingGroupMsg(false);
        }
    };

    /* ────────────────── Carga de conversaciones ──────────────── */

    const loadConversations = useCallback(async () => {
        setLoadingConvs(true);
        try {
            setConversations(await chatsService.listConversations());
        } catch {
            toast.error("No se pudieron cargar las conversaciones.");
        } finally {
            setLoadingConvs(false);
            setHasLoadedConversationsOnce(true);
        }
    }, []);

    useEffect(() => {
        loadConversations().catch(() => { });
    }, [loadConversations]);

    useEffect(() => {
        if (subTab === "privados") loadConversations();
    }, [subTab, loadConversations]);

    const location = useLocation();
    const pendingConvIdRef = useRef<number | null>(null);
    useEffect(() => {
        const state = location.state as { openConversationId?: number } | null;
        if (state?.openConversationId) {
            pendingConvIdRef.current = state.openConversationId;
            setSubTab("privados");
            loadConversations().catch(() => { });
            // limpiar state para que no se reabra al navegar
            window.history.replaceState({}, "");
        }
    }, [location.state, loadConversations]);

    useEffect(() => {
        const pendingId = pendingConvIdRef.current;
        if (pendingId == null || conversations.length === 0) return;
        const conv = conversations.find((c) => c.id === pendingId);
        if (conv) {
            pendingConvIdRef.current = null;
            setActiveConv(conv);
        }
    }, [conversations]);

    useEffect(() => {
        onSubTabActiveChange?.(subTab);
    }, [onSubTabActiveChange, subTab]);

    const hasUnreadGroups = useMemo(
        () => Object.values(unreadGroupCounts).some((count) => count > 0),
        [unreadGroupCounts],
    );

    const hasUnreadPrivateConversations = useMemo(
        () => conversations.some((conversation) => conversation.unread_count > 0),
        [conversations],
    );

    useEffect(() => {
        if (!hasLoadedGroupsOnce || !hasLoadedConversationsOnce) {
            return;
        }

        onUnreadStatusChange?.({
            hasGroupUnread: hasUnreadGroups,
            hasPrivateUnread: hasUnreadPrivateConversations,
        });
    }, [
        hasLoadedConversationsOnce,
        hasLoadedGroupsOnce,
        hasUnreadGroups,
        hasUnreadPrivateConversations,
        onUnreadStatusChange,
    ]);

    const showGroupDot = hasGroupNews || hasUnreadGroups;
    const showPrivateDot = hasPrivateNews || hasUnreadPrivateConversations;

    useEffect(() => {
        if (subTab === "grupos") {
            loadGroups().catch(() => { });
        }
    }, [subTab, loadGroups]);

    const filteredConvs = useMemo(() =>
        conversations.filter((c) =>
            c.other_user.full_name.toLowerCase().includes(convSearch.toLowerCase()),
        ),
        [conversations, convSearch]);

    /* ────────────────── Mensajes ─────────────────────────────── */

    const openConversation = async (conv: PrivateConversation) => {
        setActiveConv(conv);
        setMessages([]);
        setLoadingMsgs(true);
        try {
            setMessages(await chatsService.listMessages(conv.id));
            // resetear contador de no leídos localmente
            setConversations((prev) =>
                prev.map((c) => (c.id === conv.id ? { ...c, unread_count: 0 } : c)),
            );
        } catch {
            toast.error("No se pudieron cargar los mensajes.");
        } finally {
            setLoadingMsgs(false);
        }
    };

    const loadActiveConversationMessages = useCallback(async (conversationId: number) => {
        try {
            setMessages(await chatsService.listMessages(conversationId));
        } catch {
        }
    }, []);

    const applyGroupMessageEvent = useCallback((evt: ChatRealtimeEvent) => {
        if (!selectedGroup) return;
        if (selectedGroup.current_user_can_interact === false) return;

        const groupId = Number(evt.payload?.group_id ?? -1);
        if (groupId !== selectedGroup.id) return;

        const incoming = evt.payload?.message as GroupMessage | undefined;
        if (!incoming || typeof incoming.id !== "number") {
            loadSelectedGroupMessages(selectedGroup.id).catch(() => { });
            return;
        }

        setGroupMessages((prev) => appendUniqueGroupMessage(prev, incoming));
    }, [loadSelectedGroupMessages, selectedGroup]);

    const applyGroupUnreadEvent = useCallback((evt: ChatRealtimeEvent) => {
        const eventKey = buildGroupMessageEventKey(evt);
        if (eventKey) {
            if (processedGroupMessageEventKeysRef.current.has(eventKey)) {
                return;
            }
            processedGroupMessageEventKeysRef.current.add(eventKey);

            if (processedGroupMessageEventKeysRef.current.size > 1000) {
                const keys = Array.from(processedGroupMessageEventKeysRef.current);
                processedGroupMessageEventKeysRef.current = new Set(keys.slice(-500));
            }
        }

        applyGroupMessageEvent(evt);

        const groupId = Number(evt.payload?.group_id ?? -1);
        if (!Number.isFinite(groupId) || groupId <= 0) return;

        const group = groups.find((g) => g.id === groupId);
        if (!group) return;
        if (group.current_user_can_interact === false) {
            setUnreadGroupCounts((prev) => {
                if (!(groupId in prev)) return prev;
                const { [groupId]: _ignored, ...rest } = prev;
                return rest;
            });
            return;
        }

        const senderEmail = typeof evt.payload?.sender_email === "string" ? evt.payload.sender_email.trim().toLowerCase() : "";
        if (!senderEmail) return;

        const normalizedCurrentUserEmail = currentUserEmail.trim().toLowerCase();
        const isMine = senderEmail !== "" && senderEmail === normalizedCurrentUserEmail;
        if (isMine) return;

        if (selectedGroup?.id === groupId) return;

        setUnreadGroupCounts((prev) => ({
            ...prev,
            [groupId]: (prev[groupId] ?? 0) + 1,
        }));
    }, [applyGroupMessageEvent, currentUserEmail, groups, selectedGroup]);

    const applyPrivateMessageEvent = useCallback((evt: ChatRealtimeEvent) => {
        const eventKey = buildPrivateMessageEventKey(evt);
        if (eventKey) {
            if (processedPrivateMessageEventKeysRef.current.has(eventKey)) {
                return;
            }
            processedPrivateMessageEventKeysRef.current.add(eventKey);

            if (processedPrivateMessageEventKeysRef.current.size > 1000) {
                const keys = Array.from(processedPrivateMessageEventKeysRef.current);
                processedPrivateMessageEventKeysRef.current = new Set(keys.slice(-500));
            }
        }

        const conversationId = Number(evt.payload?.conversation_id ?? -1);
        if (conversationId <= 0) return;

        const incoming = evt.payload?.message as PrivateMessage | undefined;
        const senderEmail = typeof evt.payload?.sender_email === "string" ? evt.payload.sender_email.trim().toLowerCase() : "";
        const normalizedCurrentUserEmail = currentUserEmail.trim().toLowerCase();
        const isMine = senderEmail !== "" && senderEmail === normalizedCurrentUserEmail;

        setConversations((prev) => {
            const idx = prev.findIndex((c) => c.id === conversationId);
            if (idx === -1) {
                if (subTab === "privados") {
                    loadConversations().catch(() => { });
                }
                return prev;
            }

            const curr = prev[idx];
            let unread = 0;
            if (activeConv?.id !== conversationId) {
                unread = isMine ? curr.unread_count : curr.unread_count + 1;
            }
            const nextConv: PrivateConversation = {
                ...curr,
                unread_count: unread,
                last_message: incoming
                    ? {
                        content: incoming.content,
                        created_at: incoming.created_at,
                        is_mine: isMine,
                    }
                    : curr.last_message,
                updated_at: incoming?.created_at ?? curr.updated_at,
            };

            const next = [...prev];
            next.splice(idx, 1);
            return [nextConv, ...next];
        });

        if (activeConv?.id !== conversationId) return;

        if (!incoming || typeof incoming.id !== "number") {
            loadActiveConversationMessages(activeConv.id).catch(() => { });
            return;
        }

        setMessages((prev) => (prev.some((m) => m.id === incoming.id) ? prev : [...prev, incoming]));
    }, [activeConv, currentUserEmail, loadActiveConversationMessages, loadConversations, subTab]);

    useEffect(() => {
        if (!enableRealtimeStream) return;

        const source = chatsService.subscribeToEvents((evt: ChatRealtimeEvent) => {
            if (evt.event === "group_created" || evt.event === "group_updated" || evt.event === "group_deleted") {
                loadGroups().catch(() => { });
                return;
            }

            if (evt.event === "group_message_created") {
                applyGroupUnreadEvent(evt);
                return;
            }

            if (evt.event === "private_message_created") {
                applyPrivateMessageEvent(evt);
            }
        });

        return () => {
            source.close();
        };
    }, [applyGroupUnreadEvent, applyPrivateMessageEvent, enableRealtimeStream, loadGroups, selectedGroup]);

    useEffect(() => {
        if (realtimeTick <= 0 || !realtimeEvent) return;

        if (realtimeTick <= lastProcessedExternalRealtimeTickRef.current) {
            return;
        }

        lastProcessedExternalRealtimeTickRef.current = realtimeTick;

        if (realtimeEvent.event === "group_created" || realtimeEvent.event === "group_updated" || realtimeEvent.event === "group_deleted") {
            loadGroups().catch(() => { });
            return;
        }

        if (realtimeEvent.event === "group_message_created") {
            applyGroupUnreadEvent(realtimeEvent);
            return;
        }

        if (realtimeEvent.event === "private_message_created") {
            applyPrivateMessageEvent(realtimeEvent);
        }
    }, [applyGroupUnreadEvent, applyPrivateMessageEvent, loadGroups, realtimeEvent, realtimeTick]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleSendMessage = async () => {
        if (!activeConv || !msgText.trim()) return;
        setSending(true);
        try {
            const newMsg = await chatsService.sendMessage(activeConv.id, msgText.trim());
            setMessages((prev) => [...prev, newMsg]);
            setMsgText("");
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : "No se pudo enviar el mensaje.");
        } finally {
            setSending(false);
        }
    };

    /* ────────────────── Nueva conversación ───────────────────── */

    const openNewConvDialog = async () => {
        setShowNewConv(true);
        setResidentSearch("");
        setLoadingResidents(true);
        try {
            setResidents(await chatsService.listChatResidents());
        } catch {
            toast.error("No se pudieron cargar los residentes.");
        } finally {
            setLoadingResidents(false);
        }
    };

    const startConversationWith = async (resident: ChatResident) => {
        try {
            const conv = await chatsService.startConversation(resident.id);
            setShowNewConv(false);
            // Refrescar lista y abrir
            await loadConversations();
            setActiveConv(conv);
            setMessages([]);
            setLoadingMsgs(true);
            try {
                setMessages(await chatsService.listMessages(conv.id));
            } catch { /* vacío */ }
            setLoadingMsgs(false);
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : "No se pudo iniciar la conversación.");
        }
    };

    const filteredResidents = useMemo(() =>
        residents.filter((r) =>
            r.full_name.toLowerCase().includes(residentSearch.toLowerCase()) ||
            r.email.toLowerCase().includes(residentSearch.toLowerCase()),
        ),
        [residents, residentSearch]);

    /*  ── Vista de chat activo ───────────────────────────── */

    if (editingGroup) {
        return (
            <AdminGroupEdit
                group={editingGroup}
                onBack={() => setEditingGroup(null)}
                onGroupUpdated={handleGroupUpdatedFromManagement}
                enforceCurrentMemberAdmin
            />
        );
    }

    if (activeConv) {
        return (
            <div className="flex flex-col h-[calc(100vh-220px)]">
                {/* Cabecera */}
                <div className="flex items-center gap-3 pb-3 border-b border-gray-200 shrink-0">
                    <Button variant="ghost" size="icon" onClick={() => {
                        setActiveConv(null);
                        setMessages([]);
                    }} className="w-9 h-9 shrink-0">
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div className="w-9 h-9 bg-gradient-to-br from-indigo-200 to-indigo-400 rounded-full flex items-center justify-center text-indigo-800 font-bold text-sm shrink-0">
                        {activeConv.other_user.full_name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                        <p className="font-semibold text-gray-900 truncate">{activeConv.other_user.full_name}</p>
                        <p className="text-xs text-gray-400 truncate">{activeConv.other_user.email}</p>
                    </div>
                </div>

                {/* Mensajes */}
                <div className="flex-1 overflow-y-auto py-4 space-y-3">
                    {loadingMsgs ? (
                        <p className="text-center text-sm text-gray-400 py-8">Cargando mensajes…</p>
                    ) : messages.length === 0 ? (
                        <p className="text-center text-sm text-gray-400 py-8">
                            Aún no hay mensajes. ¡Escribe el primero!
                        </p>
                    ) : (
                        messages.map((msg) => {
                            const isMine = msg.sender_membership_id !== activeConv.other_user.membership_id;
                            return (
                                <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                                    <div
                                        className={`px-4 py-2 max-w-[85%] rounded-2xl shadow-sm ${isMine
                                        ? "bg-primary text-primary-foreground rounded-br-md"
                                        : "bg-white text-gray-800 rounded-bl-md border border-gray-100"
                                            }`}
                                    >
                                        <p className="text-[13.5px] leading-relaxed break-words">{msg.content}</p>
                                        <p className={`text-[10px] mt-1 ${isMine ? "text-primary-foreground/70" : "text-gray-400"}`}>
                                            {timeAgo(msg.created_at)}
                                        </p>
                                    </div>
                                </div>
                            );
                        })
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="flex items-center gap-2 pt-3 border-t border-gray-200 shrink-0">
                    <Input
                        placeholder="Escribe un mensaje…"
                        value={msgText}
                        onChange={(e) => setMsgText(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                        className="flex-1"
                    />
                    <Button
                        size="icon"
                        onClick={handleSendMessage}
                        disabled={sending || !msgText.trim()}
                        className="bg-primary text-primary-foreground hover:opacity-90 shrink-0 w-10 h-10"
                    >
                        <Send className="w-4 h-4" />
                    </Button>
                </div>
            </div>
        );
    }

    /* ══════════════════════════════════════════════════════════════
       RENDER: Vista detalle de grupo
       ══════════════════════════════════════════════════════════════ */

    if (selectedGroup) {
        const config = labelConfig[selectedGroup.label as keyof typeof labelConfig] ?? {
            label: selectedGroup.label,
            color: "bg-amber-100 text-amber-800",
            icon: <Tag className="w-3 h-3" />,
        };
        const canInteractInGroup = selectedGroup.current_user_can_interact !== false;
        return (
            <div className="flex flex-col h-[calc(100vh-220px)]">
                {/* Cabecera del Grupo */}
                <div className="flex items-center gap-3 pb-3 border-b border-gray-200 shrink-0 justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                        <Button variant="ghost" size="icon" onClick={() => {
                            setSelectedGroup(null);
                            setGroupMessages([]);
                        }} className="w-9 h-9 shrink-0">
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                        <div className="w-9 h-9 bg-gradient-to-br from-green-200 to-green-400 rounded-full flex items-center justify-center text-green-800 font-bold text-sm shrink-0">
                            {selectedGroup.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex flex-col">
                            <h2 className="text-base font-bold text-gray-900 truncate">{selectedGroup.name}</h2>
                            <span className={`inline-flex items-center gap-1 mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-medium w-fit ${config.color}`}>
                                {config.icon} {config.label}
                            </span>
                        </div>
                    </div>
                    {selectedGroup.can_members_leave && (
                        <Button variant="ghost" className="text-red-600 hover:bg-red-50 hover:text-red-700 shrink-0" onClick={() => setShowLeaveDialog(true)}>
                            <LogOut className="w-4 h-4 text-red-600" />
                        </Button>
                    )}
                </div>

                {!canInteractInGroup && (
                    <div className="mt-3 mb-1 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                        Has sido eliminado de este grupo. Puedes leer mensajes históricos, pero no puedes interactuar.
                    </div>
                )}

                {/* Mensajes del Grupo */}
                <div className="flex-1 overflow-y-auto py-4 space-y-3">
                    {loadingGroupMsgs ? (
                        <p className="text-center text-sm text-gray-400 py-8">Cargando mensajes…</p>
                    ) : groupMessages.length === 0 ? (
                        <p className="text-center text-sm text-gray-400 py-8">
                            Aún no hay mensajes en este grupo. ¡Escribe el primero!
                        </p>
                    ) : (
                        groupMessages.map((msg) => {
                            const isMine = msg.sender_email === currentUserEmail;
                            return (
                                <div key={msg.id} className={`flex flex-col ${isMine ? "items-end" : "items-start"} mb-3`}>
                                    {!isMine && (
                                        <span className="text-[10px] text-gray-500 mb-1 ml-1">{msg.sender_name}</span>
                                    )}
                                    <div className={`max-w-[75%] px-3.5 py-2 rounded-2xl text-sm ${isMine
                                        ? "bg-primary text-primary-foreground rounded-br-md"
                                        : "bg-gray-50 text-gray-900 rounded-bl-md"
                                        }`}>
                                        <p className="whitespace-pre-line break-words">{msg.content}</p>
                                        <p className={`text-[10px] mt-1 ${isMine ? "text-primary-foreground/70" : "text-gray-400"}`}>
                                            {timeAgo(msg.created_at)}
                                        </p>
                                    </div>
                                </div>
                            );
                        })
                    )}
                    <div ref={groupMessagesEndRef} />
                </div>

                {/* Input del Grupo */}
                <div className="flex items-center gap-2 pt-3 border-t border-gray-200 shrink-0">
                    <Input
                        placeholder={canInteractInGroup ? "Escribe un mensaje al grupo…" : "No puedes enviar mensajes en este grupo"}
                        value={groupMsgText}
                        onChange={(e) => setGroupMsgText(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendGroupMessage(); } }}
                        className="flex-1"
                        disabled={!canInteractInGroup}
                    />
                    <Button
                        size="icon"
                        onClick={handleSendGroupMessage}
                        disabled={!canInteractInGroup || sendingGroupMsg || !groupMsgText.trim()}
                        className="bg-primary text-primary-foreground hover:opacity-90 shrink-0 w-10 h-10"
                    >
                        <Send className="w-4 h-4 ml-0.5" />
                    </Button>
                </div>

                <Dialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>¿Salir del grupo?</DialogTitle>
                            <DialogDescription>
                                Vas a salir de <strong>{selectedGroup.name}</strong>. No podrás volver a unirte por tu cuenta.
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setShowLeaveDialog(false)}>Cancelar</Button>
                            <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={handleLeaveGroup} disabled={leaving}>
                                {leaving ? "Saliendo…" : "Sí, salir"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        );
    }

    /*  ── Vista principal con sub-tabs ─────────────────────────────────────────────────*/

    return (
        <div className="space-y-5">
            {/* Sub-tabs */}
            <div className="flex bg-gray-50 p-1 rounded-full w-fit mx-auto">
                {(["grupos", "privados"] as ChatSubTab[]).map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setSubTab(tab as "grupos" | "privados")}
                        className={`relative rounded-full px-6 capitalize ${subTab === tab ? "bg-primary text-primary-foreground shadow-sm" : "text-gray-500"}`}
                    >
                        {tab}
                        {tab === "grupos" && showGroupDot && (
                            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-red-500" />
                        )}
                        {tab === "privados" && showPrivateDot && (
                            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-red-500" />
                        )}
                    </button>
                ))}
            </div>

            {/* ── TAB PRIVADOS ──────────────────────────────────── */}
            {subTab === "privados" ? (
                <>
                    {/* Buscador + botón nueva conversación */}
                    <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <Input
                                placeholder="Buscar conversación…"
                                value={convSearch}
                                onChange={(e) => setConvSearch(e.target.value)}
                                className="pl-9"
                            />
                        </div>
                        <Button size="icon" className="bg-primary text-primary-foreground hover:opacity-90 shrink-0 w-10 h-10" onClick={openNewConvDialog}>
                            <Plus className="w-5 h-5" />
                        </Button>
                    </div>

                    {/* Lista de conversaciones */}
                    {loadingConvs ? (
                        <div className="text-center py-12 text-sm text-gray-400">Cargando conversaciones…</div>
                    ) : filteredConvs.length === 0 ? (
                        <div className="text-center py-16">
                            <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                            <h3 className="text-base font-medium text-gray-900 mb-1">
                                {convSearch ? "Sin resultados" : "No tienes conversaciones"}
                            </h3>
                            <p className="text-sm text-gray-400">
                                {convSearch ? "Prueba con otro nombre." : "Pulsa + para iniciar una conversación."}
                            </p>
                        </div>
                    ) : (
                        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100 overflow-hidden">
                            {filteredConvs.map((conv) => (
                                <button
                                    key={conv.id}
                                    onClick={() => openConversation(conv)}
                                    className="w-full text-left px-4 py-3.5 hover:bg-gray-50 transition-colors flex items-center gap-3"
                                >
                                    {/* Avatar */}
                                    <div className="relative shrink-0">
                                        <div className="w-11 h-11 bg-gradient-to-br from-indigo-200 to-indigo-400 rounded-full flex items-center justify-center text-indigo-800 font-bold text-sm">
                                            {conv.other_user.full_name.charAt(0).toUpperCase()}
                                        </div>
                                        {conv.unread_count > 0 && (
                                            <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                                                {conv.unread_count > 9 ? "9+" : conv.unread_count}
                                            </span>
                                        )}
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-0.5">
                                            <span className={`font-medium truncate ${conv.unread_count > 0 ? "text-gray-900" : "text-gray-500"}`}>
                                                {conv.other_user.full_name}
                                            </span>
                                            {conv.last_message && (
                                                <span className="text-[10px] text-gray-400 shrink-0 ml-2">
                                                    {timeAgo(conv.last_message.created_at)}
                                                </span>
                                            )}
                                        </div>
                                        {conv.last_message ? (
                                            <p className={`text-xs truncate ${conv.unread_count > 0 ? "text-gray-500 font-medium" : "text-gray-400"}`}>
                                                {conv.last_message.is_mine && "Tú: "}{conv.last_message.content}
                                            </p>
                                        ) : (
                                            <p className="text-xs text-gray-400 italic">Sin mensajes aún</p>
                                        )}
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Dialog: nueva conversación */}
                    <Dialog open={showNewConv} onOpenChange={setShowNewConv}>
                        <DialogContent className="max-h-[80vh] flex flex-col">
                            <DialogHeader>
                                <DialogTitle>Nueva conversación</DialogTitle>
                                <DialogDescription>Selecciona un residente para chatear.</DialogDescription>
                            </DialogHeader>
                            <div className="relative mb-3">
                                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <Input
                                    placeholder="Buscar residente…"
                                    value={residentSearch}
                                    onChange={(e) => setResidentSearch(e.target.value)}
                                    className="pl-9"
                                />
                            </div>
                            <div className="flex-1 overflow-y-auto divide-y divide-gray-100 -mx-1">
                                {loadingResidents ? (
                                    <p className="text-center py-8 text-sm text-gray-400">Cargando…</p>
                                ) : filteredResidents.length === 0 ? (
                                    <p className="text-center py-8 text-sm text-gray-400">No se encontraron residentes.</p>
                                ) : (
                                    filteredResidents.map((r) => (
                                        <button
                                            key={r.id}
                                            onClick={() => startConversationWith(r)}
                                            className="w-full text-left px-3 py-3 hover:bg-gray-50 transition-colors flex items-center gap-3 rounded-lg"
                                        >
                                            <div className="w-9 h-9 bg-gradient-to-br from-indigo-200 to-indigo-400 rounded-full flex items-center justify-center text-indigo-800 font-bold text-sm shrink-0">
                                                {r.full_name.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium text-gray-900 truncate">{r.full_name}</p>
                                                <p className="text-xs text-gray-500 truncate">{r.email}</p>
                                            </div>
                                        </button>
                                    ))
                                )}
                            </div>
                        </DialogContent>
                    </Dialog>
                </>
            ) : (
                /* ── TAB GRUPOS ─────────────────────────────────── */
                <>
                    <div className="relative">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <Input placeholder="Buscar grupos…" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
                    </div>

                    {loadingGroups ? (
                        <div className="text-center py-12 text-sm text-gray-400">Cargando grupos…</div>
                    ) : filteredGroups.length === 0 ? (
                        <div className="text-center py-16">
                            <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                            <h3 className="text-base font-medium text-gray-900 mb-1">
                                {searchTerm ? "Sin resultados" : "No estás en ningún grupo"}
                            </h3>
                            <p className="text-sm text-gray-400">
                                {searchTerm ? "Prueba con otra búsqueda." : "Cuando un administrador te añada a un grupo, aparecerá aquí."}
                            </p>
                        </div>
                    ) : (
                        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100 overflow-hidden">
                            {filteredGroups.map((group) => {
                                const cfg = labelConfig[group.label as keyof typeof labelConfig] ?? {
                                    label: group.label,
                                    color: "bg-amber-100 text-amber-800",
                                    icon: <Tag className="w-3 h-3" />,
                                };
                                const isFormerMember = group.current_user_can_interact === false;
                                const unreadCount = unreadGroupCounts[group.id] ?? 0;
                                const unreadBadgeText = unreadCount > 9 ? "9+" : String(unreadCount);
                                const membersLabel = group.members === 1 ? "miembro" : "miembros";
                                return (
                                    <div
                                        key={group.id}
                                        className={`px-4 py-3.5 transition-colors flex items-center gap-3 ${
                                            isFormerMember
                                                ? "bg-gray-50 hover:bg-gray-50"
                                                : "hover:bg-gray-50"
                                        }`}
                                    >
                                        <button
                                            onClick={() => openGroup(group)}
                                            className="flex-1 min-w-0 text-left flex items-center gap-3"
                                        >
                                            <div className="relative shrink-0">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                                                    isFormerMember
                                                        ? "bg-gray-300 text-gray-700"
                                                        : "bg-gradient-to-br from-green-200 to-green-400 text-green-800"
                                                }`}>
                                                    {group.name.charAt(0).toUpperCase()}
                                                </div>
                                                {unreadCount > 0 && (
                                                    <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                                                        {unreadBadgeText}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-0.5">
                                                    <span className={`font-medium truncate ${isFormerMember ? "text-gray-700" : "text-gray-900"}`}>{group.name}</span>
                                                    {isFormerMember && (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-300 text-gray-700 shrink-0">
                                                            No perteneces a este grupo
                                                        </span>
                                                    )}
                                                    <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium shrink-0 ${cfg.color}`}>
                                                        {cfg.icon} {cfg.label}
                                                    </span>
                                                </div>
                                                {group.description && <p className="text-xs truncate text-gray-500">{group.description}</p>}
                                                {isFormerMember && (
                                                    <p className="text-[11px] text-gray-600 mt-0.5">
                                                        Ya no puedes enviar ni recibir mensajes en este grupo.
                                                    </p>
                                                )}
                                                <div className={`flex items-center gap-1 mt-0.5 text-[11px] ${isFormerMember ? "text-gray-500" : "text-gray-400"}`}>
                                                    <Users className="w-3 h-3" />
                                                    {group.members} {membersLabel}
                                                </div>
                                            </div>
                                        </button>
                                        {canManageGroup(group) && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="text-green-700 border-green-200 hover:bg-green-50 shrink-0"
                                                onClick={() => setEditingGroup(group)}
                                            >
                                                Gestionar
                                            </Button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
