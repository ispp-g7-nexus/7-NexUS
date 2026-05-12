import { ArrowLeft, LogOut, MessageSquare, Send, Users, Plus, Search, Trash2, Tag, X } from "lucide-react";
import { type ReactElement, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { AdminGroupEdit } from "./AdminGroupEdit";
import { authService } from "../../services/auth";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "../../components/ui/dialog";
import { chatsService, type ChatGroup, type GroupMessage, type ChatGroupLabelItem, type ChatRealtimeEvent, type UpsertChatGroupPayload } from "../../services/chats";


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

function normalizeGroupId(groupId: unknown): number {
    return Number(groupId);
}

function upsertGroup(groups: ChatGroup[], incoming: ChatGroup): ChatGroup[] {
    const incomingId = normalizeGroupId(incoming.id);
    if (!Number.isFinite(incomingId)) {
        return groups;
    }

    const idx = groups.findIndex((g) => normalizeGroupId(g.id) === incomingId);
    const previous = idx >= 0 ? groups[idx] : null;
    const normalizedIncoming = {
        ...incoming,
        is_member: typeof incoming.is_member === "boolean"
            ? incoming.is_member
            : previous?.is_member,
    };
    const next = idx === -1
        ? [...groups, normalizedIncoming]
        : groups.map((g, i) => (i === idx ? normalizedIncoming : g));

    return next.sort((a, b) => a.name.localeCompare(b.name));
}

type UnreadCountsByGroup = Record<number, number>;

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

const EMPTY_GROUP_FORM: UpsertChatGroupPayload = {
    name: "",
    description: "",
    label: "general",
    can_members_leave: true,
};

const CHAT_GROUP_NAME_MAX_LENGTH = 45;
const CHAT_GROUP_DESCRIPTION_MAX_LENGTH = 255;
const CHAT_LABEL_MAX_LENGTH = 15;

const typeConfig: Record<string, { label: string; color: string; icon: ReactElement }> = {
    general: {
        label: "General",
        color: "bg-blue-100 text-blue-800",
        icon: <MessageSquare className="w-3 h-3" />
    },
    floor: {
        label: "Planta",
        color: "bg-primary/10 text-primary",
        icon: <Users className="w-3 h-3" />
    },
    activity: {
        label: "Actividad",
        color: "bg-purple-100 text-purple-800",
        icon: <Users className="w-3 h-3" />
    },
    private: {
        label: "Privado",
        color: "bg-gray-50 text-gray-900",
        icon: <Users className="w-3 h-3" />
    }
};

export function AdminChats({
    onChatsCountChange,
    enableRealtimeStream = true,
    realtimeTick = 0,
    realtimeEvent = null,
}: {
    readonly onChatsCountChange?: (count: number) => void;
    readonly enableRealtimeStream?: boolean;
    readonly realtimeTick?: number;
    readonly realtimeEvent?: ChatRealtimeEvent | null;
}) {
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedType, setSelectedType] = useState<string>("all");
    const [groups, setGroups] = useState<ChatGroup[]>([]);
    const [loading, setLoading] = useState(true);
    const [isUnauthorized, setIsUnauthorized] = useState(false);
    const [editingGroup, setEditingGroup] = useState<ChatGroup | null>(null);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [createForm, setCreateForm] = useState<UpsertChatGroupPayload>(EMPTY_GROUP_FORM);

    const [groupToDelete, setGroupToDelete] = useState<ChatGroup | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
        const [joiningGroupId, setJoiningGroupId] = useState<number | null>(null);

    // ── Chatting in Group (Inline) ──
    const [currentUserEmail, setCurrentUserEmail] = useState<string>("");
    const [chattingGroup, setChattingGroup] = useState<ChatGroup | null>(null);
    const [groupMessages, setGroupMessages] = useState<GroupMessage[]>([]);
    const [loadingGroupMsgs, setLoadingGroupMsgs] = useState(false);
    const [groupMsgText, setGroupMsgText] = useState("");
    const [sendingGroupMsg, setSendingGroupMsg] = useState(false);
    const [unreadCountsByGroup, setUnreadCountsByGroup] = useState<UnreadCountsByGroup>({});
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const processedGroupMessageEventKeysRef = useRef<Set<string>>(new Set());
    const lastFetchGroupMessagesTimeRef = useRef<number>(0);

    // ── Etiquetas personalizadas ──
    const [customLabels, setCustomLabels] = useState<ChatGroupLabelItem[]>([]);
    const [isLabelsOpen, setIsLabelsOpen] = useState(false);
    const [newLabelName, setNewLabelName] = useState("");
    const [creatingLabel, setCreatingLabel] = useState(false);

    const unreadStorageKey = useMemo(() => {
        if (!currentUserEmail) return null;
        return `admin-chat-unread:${currentUserEmail.toLowerCase()}`;
    }, [currentUserEmail]);

    const allLabelOptions = useMemo(() => {
        const predefined = [
            { value: "general", display: "General" },
            { value: "floor", display: "Planta" },
            { value: "activity", display: "Actividad" },
            { value: "private", display: "Privado" },
        ];
        const custom = customLabels.map((l) => ({ value: l.name, display: l.name }));
        return [...predefined, ...custom];
    }, [customLabels]);

    const refreshGroups = async () => {
        setLoading(true);
        try {
            const data = await chatsService.listAvailableGroups();
            setGroups(data);
            setEditingGroup((prev) => {
                if (!prev) return prev;
                return data.find((g) => normalizeGroupId(g.id) === normalizeGroupId(prev.id)) ?? prev;
            });
            setChattingGroup((prev) => {
                if (!prev) return prev;
                return data.find((g) => normalizeGroupId(g.id) === normalizeGroupId(prev.id)) ?? prev;
            });
            setIsUnauthorized(false);
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            if (msg.includes("No tienes permisos para gestionar chats")) {
                setIsUnauthorized(true);
            } else {
                toast.error("No se pudieron cargar los grupos de chat.");
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        refreshGroups();
        chatsService.listLabels().then(setCustomLabels).catch(() => { });
        authService.me().then(session => {
            if (session.user) setCurrentUserEmail(session.user.email || "");
        }).catch(() => { });
    }, []);

    useEffect(() => {
        if (!unreadStorageKey) {
            setUnreadCountsByGroup({});
            return;
        }

        try {
            const raw = localStorage.getItem(unreadStorageKey);
            if (!raw) {
                setUnreadCountsByGroup({});
                return;
            }

            const parsed = JSON.parse(raw) as Record<string, unknown>;
            const restored = Object.entries(parsed).reduce<UnreadCountsByGroup>((acc, [key, value]) => {
                const groupId = Number(key);
                const count = Number(value);
                if (Number.isFinite(groupId) && groupId > 0 && Number.isFinite(count) && count > 0) {
                    acc[groupId] = Math.floor(count);
                }
                return acc;
            }, {});

            setUnreadCountsByGroup(restored);
        } catch {
            setUnreadCountsByGroup({});
        }
    }, [unreadStorageKey]);

    useEffect(() => {
        if (!unreadStorageKey) return;
        localStorage.setItem(unreadStorageKey, JSON.stringify(unreadCountsByGroup));
    }, [unreadCountsByGroup, unreadStorageKey]);

    useEffect(() => {
        if (groups.length === 0) return;

        const groupIds = new Set(
            groups
                .filter((group) => group.is_member)
                .map((group) => group.id),
        );
        setUnreadCountsByGroup((prev) => {
            const next = Object.entries(prev).reduce<UnreadCountsByGroup>((acc, [key, count]) => {
                const groupId = Number(key);
                if (groupIds.has(groupId) && count > 0) {
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
        onChatsCountChange?.(groups.length);
    }, [groups, onChatsCountChange]);

    const fetchGroupMessages = async (groupId: number) => {
        // Debounce: prevent multiple fetches within 500ms to avoid infinite loops
        const now = Date.now();
        if (now - lastFetchGroupMessagesTimeRef.current < 500) {
            return;
        }
        lastFetchGroupMessagesTimeRef.current = now;

        try {
            const msgs = await chatsService.listGroupMessages(groupId);
            setGroupMessages(dedupeGroupMessages(msgs));
            setUnreadCountsByGroup((prev) => {
                if (!(groupId in prev)) return prev;
                const { [groupId]: _ignored, ...rest } = prev;
                return rest;
            });
        } catch (err: unknown) {
            console.error("Failed fetching group messages:", err);
        }
    };

    const applyGroupMessageEvent = (evt: ChatRealtimeEvent) => {
        if (!chattingGroup) return;
        const payloadGroupId = Number(evt.payload?.group_id ?? -1);
        if (payloadGroupId !== chattingGroup.id) return;

        const incoming = evt.payload?.message as GroupMessage | undefined;
        if (!incoming || typeof incoming.id !== "number") {
            void fetchGroupMessages(chattingGroup.id);
            return;
        }

        setGroupMessages((prev) => appendUniqueGroupMessage(prev, incoming));
    };

    const applyRealtimeGroupUpsert = (rawGroup: unknown) => {
        const incoming = rawGroup as ChatGroup | undefined;
        if (!incoming) return;

        const incomingId = normalizeGroupId(incoming.id);
        if (!Number.isFinite(incomingId)) return;

        let mergedIncoming = incoming;
        setGroups((prev) => {
            const existing = prev.find((g) => normalizeGroupId(g.id) === incomingId);
            mergedIncoming = {
                ...incoming,
                is_member: typeof incoming.is_member === "boolean"
                    ? incoming.is_member
                    : existing?.is_member,
            };
            return upsertGroup(prev, mergedIncoming);
        });

        setEditingGroup((prev) => (prev && normalizeGroupId(prev.id) === incomingId ? mergedIncoming : prev));
        setChattingGroup((prev) => (prev && normalizeGroupId(prev.id) === incomingId ? mergedIncoming : prev));
    };

    const markGroupAsUnread = (groupId: number, senderEmail?: string) => {
        if (!Number.isFinite(groupId) || groupId <= 0) return;
        const normalizedSender = senderEmail?.trim().toLowerCase();
        const normalizedCurrentUser = currentUserEmail.trim().toLowerCase();
        if (normalizedSender && normalizedCurrentUser && normalizedSender === normalizedCurrentUser) return;
        if (chattingGroup && normalizeGroupId(chattingGroup.id) === groupId) return;

        const targetGroup = groups.find((group) => normalizeGroupId(group.id) === groupId);
        if (!targetGroup?.is_member) return;

        setUnreadCountsByGroup((prev) => ({
            ...prev,
            [groupId]: (prev[groupId] ?? 0) + 1,
        }));
    };

    const clearUnreadForGroup = (groupId: number) => {
        setUnreadCountsByGroup((prev) => {
            if (!(groupId in prev)) return prev;
            const { [groupId]: _ignored, ...rest } = prev;
            return rest;
        });
    };

    const handleGroupMessageCreatedEvent = (evt: ChatRealtimeEvent) => {
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
        const senderEmail = typeof evt.payload?.sender_email === "string" ? evt.payload.sender_email : undefined;
        markGroupAsUnread(groupId, senderEmail);
    };
    const removeGroupLocally = (groupId: number) => {
        setGroups((prev) => prev.filter((g) => normalizeGroupId(g.id) !== groupId));
        setEditingGroup((prev) => (prev && normalizeGroupId(prev.id) === groupId ? null : prev));
        setChattingGroup((prev) => (prev && normalizeGroupId(prev.id) === groupId ? null : prev));
    };

    const syncGroupById = async (groupId: number) => {
        if (!Number.isFinite(groupId) || groupId <= 0) return;

        try {
            const fresh = await chatsService.getGroup(groupId);
            let mergedFresh = fresh;
            setGroups((prev) => {
                const existing = prev.find((g) => normalizeGroupId(g.id) === groupId);
                mergedFresh = {
                    ...fresh,
                    is_member: typeof fresh.is_member === "boolean"
                        ? fresh.is_member
                        : existing?.is_member,
                };
                return upsertGroup(prev, mergedFresh);
            });
            setEditingGroup((prev) => (prev && normalizeGroupId(prev.id) === groupId ? mergedFresh : prev));
            setChattingGroup((prev) => (prev && normalizeGroupId(prev.id) === groupId ? mergedFresh : prev));
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase();
            const notFound = msg.includes("no encontrado") || msg.includes("not found") || msg.includes("error 404");
            if (notFound) {
                removeGroupLocally(groupId);
            }
        }
    };

    useEffect(() => {
        if (!enableRealtimeStream) return;

        const source = chatsService.subscribeToEvents((evt: ChatRealtimeEvent) => {
            if (evt.event === "group_created" || evt.event === "group_updated") {
                const incomingGroup = evt.payload?.group;
                if (incomingGroup) {
                    applyRealtimeGroupUpsert(incomingGroup);
                }

                const groupId = Number(evt.payload?.group_id ?? (incomingGroup as ChatGroup | undefined)?.id ?? -1);
                if (groupId > 0) {
                    void syncGroupById(groupId);
                } else if (!incomingGroup) {
                    void refreshGroups();
                }
                return;
            }

            if (evt.event === "group_deleted") {
                const groupId = Number(evt.payload?.group_id ?? -1);
                if (groupId > 0) {
                    clearUnreadForGroup(groupId);
                    removeGroupLocally(groupId);
                }
                return;
            }

            if (evt.event === "group_message_created") {
                handleGroupMessageCreatedEvent(evt);
            }
        });

        source.onerror = () => { };

        return () => {
            source.close();
        };
    }, [chattingGroup, currentUserEmail, enableRealtimeStream]);

    // Ref to track current chatting group without affecting listeners
    const chattingGroupRef = useRef<ChatGroup | null>(null);
    useEffect(() => {
        chattingGroupRef.current = chattingGroup;
    }, [chattingGroup]);

    // Stable event handler that never changes
    const handleVisibilityOrFocus = useCallback(() => {
        if (document.visibilityState === "visible" && chattingGroupRef.current) {
            void fetchGroupMessages(chattingGroupRef.current.id);
        }
    }, []);

    // Set up visibility/focus listeners ONCE with stable reference
    useEffect(() => {
        window.addEventListener("focus", handleVisibilityOrFocus);
        document.addEventListener("visibilitychange", handleVisibilityOrFocus);

        return () => {
            window.removeEventListener("focus", handleVisibilityOrFocus);
            document.removeEventListener("visibilitychange", handleVisibilityOrFocus);
        };
    }, [handleVisibilityOrFocus]);

    // Fetch messages when chattingGroup changes
    useEffect(() => {
        if (!chattingGroup) return;

        let isMounted = true;
        const fetchMsgs = async () => {
            if (!isMounted) return;
            await fetchGroupMessages(chattingGroup.id);
        };

        setLoadingGroupMsgs(true);
        fetchMsgs().finally(() => { if (isMounted) setLoadingGroupMsgs(false); });

        return () => {
            isMounted = false;
        };
    }, [chattingGroup]);

    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [groupMessages]);

    useEffect(() => {
        if (realtimeTick <= 0 || !realtimeEvent) return;

        if (realtimeEvent.event === "group_created" || realtimeEvent.event === "group_updated") {
            const incomingGroup = realtimeEvent.payload?.group;
            if (incomingGroup) {
                applyRealtimeGroupUpsert(incomingGroup);
            }

            const groupId = Number(realtimeEvent.payload?.group_id ?? (incomingGroup as ChatGroup | undefined)?.id ?? -1);
            if (groupId > 0) {
                void syncGroupById(groupId);
            } else if (!incomingGroup) {
                void refreshGroups();
            }
            return;
        }

        if (realtimeEvent.event === "group_deleted") {
            const groupId = Number(realtimeEvent.payload?.group_id ?? -1);
            if (groupId > 0) {
                setGroups((prev) => prev.filter((g) => normalizeGroupId(g.id) !== groupId));
                setEditingGroup((prev) => (prev && normalizeGroupId(prev.id) === groupId ? null : prev));
                setChattingGroup((prev) => (prev && normalizeGroupId(prev.id) === groupId ? null : prev));
                clearUnreadForGroup(groupId);
                removeGroupLocally(groupId);
            } else {
                void refreshGroups();
            }
            return;
        }

        if (realtimeEvent.event === "group_message_created") {
            handleGroupMessageCreatedEvent(realtimeEvent);
            return;
        }
    }, [realtimeEvent, realtimeTick, currentUserEmail]);

    const handleSendGroupMessage = async () => {
        if (!groupMsgText.trim() || !chattingGroup) return;
        setSendingGroupMsg(true);
        try {
            const newMsg = await chatsService.sendGroupMessage(chattingGroup.id, groupMsgText.trim());
            setGroupMessages((prev) => appendUniqueGroupMessage(prev, newMsg));
            setGroupMsgText("");
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : "Error al enviar el mensaje.");
        } finally {
            setSendingGroupMsg(false);
        }
    };

    const filteredGroups = useMemo(() => {
        return groups.filter((group) => {
            const matchesSearch =
                group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                group.description.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesType = selectedType === "all" || group.label === selectedType;
            return matchesSearch && matchesType;
        });
    }, [groups, searchTerm, selectedType]);

    const handleBackToList = () => {
        setEditingGroup(null);
    };

    const handleEditGroup = (group: ChatGroup) => {
        setEditingGroup(group);
    };

    const handleJoinGroup = async (group: ChatGroup) => {
        setJoiningGroupId(group.id);
        try {
            await chatsService.joinGroup(group.id);
            toast.success(`Te has unido a "${group.name}" correctamente.`);
            // Recargar la lista completa para asegurar sincronización
            await refreshGroups();
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : "No se pudo unirse al grupo.");
        } finally {
            setJoiningGroupId(null);
        }
    };

    const executeDeleteGroup = async () => {
        if (!groupToDelete) return;
        setIsDeleting(true);
        try {
            await chatsService.deleteGroup(groupToDelete.id);
            setGroups((prev) => prev.filter((group) => group.id !== groupToDelete.id));
            toast.success("Grupo eliminado correctamente.");
            setGroupToDelete(null);
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : "No se pudo eliminar el grupo.");
        } finally {
            setIsDeleting(false);
        }
    };

    const handleLeaveGroup = async (group: ChatGroup) => {
        if (!group.can_members_leave) {
            toast.error("No puedes abandonar este grupo.");
            return;
        }

        setJoiningGroupId(group.id);
        try {
            await chatsService.leaveGroup(group.id);
            setGroups((prev) => prev.map((g) => (
                g.id === group.id
                    ? { ...g, is_member: false, current_user_can_interact: false }
                    : g
            )));
            if (chattingGroup && normalizeGroupId(chattingGroup.id) === group.id) {
                setChattingGroup(null);
                setGroupMessages([]);
            }
            clearUnreadForGroup(group.id);
            toast.success(`Has abandonado "${group.name}".`);
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : "No se pudo abandonar el grupo.");
        } finally {
            setJoiningGroupId(null);
        }
    };

    const handleCreateGroup = async () => {
        const normalizedName = createForm.name.trim();
        const normalizedDescription = createForm.description.trim();

        if (!normalizedName) {
            toast.error("El nombre del grupo es obligatorio.");
            return;
        }
        if (normalizedName.length > CHAT_GROUP_NAME_MAX_LENGTH) {
            toast.error(`El nombre del grupo no puede superar ${CHAT_GROUP_NAME_MAX_LENGTH} caracteres.`);
            return;
        }
        if (normalizedDescription.length > CHAT_GROUP_DESCRIPTION_MAX_LENGTH) {
            toast.error(`La descripción no puede superar ${CHAT_GROUP_DESCRIPTION_MAX_LENGTH} caracteres.`);
            return;
        }
        if (createForm.label.length > CHAT_LABEL_MAX_LENGTH) {
            toast.error(`La etiqueta no puede superar ${CHAT_LABEL_MAX_LENGTH} caracteres.`);
            return;
        }

        setIsCreating(true);
        try {
            const created = await chatsService.createGroup({
                ...createForm,
                name: normalizedName,
                description: normalizedDescription,
            });
            // El creador es automáticamente miembro
            created.is_member = true;
            setGroups((prev) => upsertGroup(prev, created));
            setCreateForm(EMPTY_GROUP_FORM);
            setIsCreateOpen(false);
            toast.success("Grupo creado correctamente.");
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : "No se pudo crear el grupo.");
        } finally {
            setIsCreating(false);
        }
    };

    const handleGroupUpdated = (updated: ChatGroup) => {
        let mergedUpdated = updated;
        setGroups((prev) => {
            const existing = prev.find((group) => normalizeGroupId(group.id) === normalizeGroupId(updated.id));
            mergedUpdated = {
                ...updated,
                is_member: typeof updated.is_member === "boolean"
                    ? updated.is_member
                    : existing?.is_member,
            };
            return upsertGroup(prev, mergedUpdated);
        });
        setEditingGroup(mergedUpdated);
    };

    const handleCreateLabel = async () => {
        const name = newLabelName.trim();
        if (!name) return;
        if (name.length > CHAT_LABEL_MAX_LENGTH) {
            toast.error(`La etiqueta no puede superar ${CHAT_LABEL_MAX_LENGTH} caracteres.`);
            return;
        }
        setCreatingLabel(true);
        try {
            const created = await chatsService.createLabel(name);
            setCustomLabels((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
            setNewLabelName("");
            toast.success(`Etiqueta "${name}" creada.`);
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : "No se pudo crear la etiqueta.");
        } finally {
            setCreatingLabel(false);
        }
    };

    const handleDeleteLabel = async (labelId: number) => {
        try {
            await chatsService.deleteLabel(labelId);
            setCustomLabels((prev) => prev.filter((l) => l.id !== labelId));
            toast.success("Etiqueta eliminada.");
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : "No se pudo eliminar la etiqueta.");
        }
    };

    if (isUnauthorized) {
        return (
            <div className="flex items-center justify-center h-64 text-gray-500">
                No tienes permisos para gestionar los chats.
            </div>
        );
    };

    if (editingGroup) {
        return (
            <AdminGroupEdit
                group={editingGroup}
                onBack={handleBackToList}
                onGroupUpdated={handleGroupUpdated}
            />
        );
    }

    if (chattingGroup) {
        const config = typeConfig[chattingGroup.label as keyof typeof typeConfig] ?? {
            label: chattingGroup.label,
            color: "bg-amber-100 text-amber-800",
            icon: <Tag className="w-3 h-3" />,
        };
        return (
            <div className="flex flex-col h-[calc(100vh-220px)] bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center gap-3 pb-3 border-b border-gray-200 shrink-0 justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                        <Button variant="ghost" size="icon" onClick={() => {
                            setChattingGroup(null);
                            setGroupMessages([]);
                        }} className="w-9 h-9 shrink-0">
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                        <div className="w-9 h-9 bg-gradient-to-br from-primary/20 to-primary/40 rounded-full flex items-center justify-center text-primary font-bold text-sm shrink-0">
                            {chattingGroup.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex flex-col text-left">
                            <h2 className="text-base font-bold text-gray-900 truncate">{chattingGroup.name}</h2>
                            <span className={`inline-flex items-center gap-1 mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-medium w-fit ${config.color}`}>
                                {config.icon} {config.label}
                            </span>
                        </div>
                    </div>
                    {chattingGroup.can_members_leave && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="w-9 h-9 text-red-600 hover:bg-red-50 hover:text-red-700"
                            onClick={() => handleLeaveGroup(chattingGroup)}
                            disabled={joiningGroupId === chattingGroup.id}
                        >
                            <LogOut className="w-4 h-4" />
                        </Button>
                    )}
                </div>

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
                            const bubbleClasses = isMine
                                ? "bg-primary text-primary-foreground rounded-br-md"
                                : "bg-gray-50 text-gray-900 rounded-bl-md";
                            const timeClasses = isMine ? "text-primary-foreground/70" : "text-gray-400";

                            return (
                                <div key={msg.id} className={`flex flex-col ${isMine ? "items-end text-right" : "items-start text-left"} mb-3`}>
                                    {!isMine && (
                                        <span className="text-[10px] text-gray-500 mb-1 ml-1 font-bold">{msg.sender_name}</span>
                                    )}
                                    <div className={`max-w-[75%] px-3.5 py-2 rounded-2xl text-sm ${bubbleClasses}`}>
                                        <p className="whitespace-pre-line break-words text-left">{msg.content}</p>
                                        <p className={`text-[10px] mt-1 ${timeClasses}`}>
                                            {timeAgo(msg.created_at)}
                                        </p>
                                    </div>
                                </div>
                            );
                        })
                    )}
                    <div ref={messagesEndRef} />
                </div>

                <div className="flex items-center gap-2 pt-3 border-t border-gray-200 shrink-0">
                    <Input
                        placeholder="Escribe un mensaje…"
                        value={groupMsgText}
                        onChange={(e) => setGroupMsgText(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendGroupMessage(); } }}
                        className="flex-1"
                    />
                    <Button
                        size="icon"
                        className="bg-primary text-primary-foreground hover:bg-primary/90 shrink-0 w-10 h-10"
                        onClick={handleSendGroupMessage}
                        disabled={sendingGroupMsg || !groupMsgText.trim()}
                    >
                        <Send className="w-4 h-4" />
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 text-left">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Chats Grupales</h1>
                    <p className="text-sm text-gray-500 mt-1">Gestiona los grupos de chat activos</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={() => setIsLabelsOpen(true)}>
                        <Tag className="w-4 h-4 mr-2" />
                        Gestionar etiquetas
                    </Button>
                    <Button className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => setIsCreateOpen(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        Crear Grupo
                    </Button>
                </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                    <div className="relative">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <Input
                            placeholder="Buscar grupos..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9"
                        />
                    </div>
                </div>
                <select
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value)}
                    className="px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                    <option value="all">Todos los tipos</option>
                    {allLabelOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.display}</option>
                    ))}
                </select>
            </div>

            <div className="bg-white rounded-lg border border-gray-200">
                <div className="p-4 border-b border-gray-200">
                    <h3 className="font-medium text-gray-900">
                        {filteredGroups.length} {filteredGroups.length === 1 ? 'grupo' : 'grupos'} encontrados
                    </h3>
                </div>

                <div className="divide-y divide-gray-200">
                    {filteredGroups.map((group) => {
                        const config = typeConfig[group.label as keyof typeof typeConfig] ?? {
                            label: group.label,
                            color: "bg-amber-100 text-amber-800",
                            icon: <Tag className="w-3 h-3" />,
                        };
                        return (
                            <div key={group.id} className="p-4 hover:bg-gray-50 transition-colors">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-3 mb-2">
                                            <h4 className="font-bold text-gray-900 truncate">
                                                {group.name}
                                            </h4>
                                            {group.is_member && (unreadCountsByGroup[group.id] ?? 0) > 0 && (
                                                <span className="inline-flex shrink-0 items-center justify-center min-w-5 h-5 px-1 rounded-full text-[10px] font-semibold bg-red-500 text-white">
                                                    {(unreadCountsByGroup[group.id] ?? 0) > 99 ? "99+" : unreadCountsByGroup[group.id]}
                                                </span>
                                            )}
                                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
                                                {config.icon}
                                                {config.label}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-500 mb-2 truncate">
                                            {group.description}
                                        </p>
                                        <div className="flex items-center gap-4 text-xs text-gray-500">
                                            <span className="flex items-center gap-1 font-medium">
                                                <Users className="w-3 h-3" />
                                                {group.members} miembros
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 ml-4">
                                        {group.is_member ? (
                                            <Button
                                                variant="default"
                                                size="sm"
                                                className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl"
                                                onClick={() => {
                                                    clearUnreadForGroup(group.id);
                                                    setChattingGroup(group);
                                                    setGroupMessages([]);
                                                }}
                                            >
                                                <MessageSquare className="w-4 h-4 mr-1.5" /> Entrar
                                            </Button>
                                        ) : (
                                            <Button
                                                variant="default"
                                                size="sm"
                                                className="bg-green-600 text-white hover:bg-green-700 rounded-xl"
                                                onClick={() => handleJoinGroup(group)}
                                                disabled={joiningGroupId === group.id}
                                            >
                                                {joiningGroupId === group.id ? "Uniéndose..." : "Unirse"}
                                            </Button>
                                        )}
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="rounded-xl border-gray-300 font-bold"
                                            onClick={() => handleEditGroup(group)}
                                        >
                                            Gestionar
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="w-8 h-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                                            onClick={() => setGroupToDelete(group)}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    {!loading && filteredGroups.length === 0 && <p className="p-10 text-center text-gray-400">No se encontraron grupos.</p>}
                </div>
            </div>

            <Dialog open={!!groupToDelete} onOpenChange={() => setGroupToDelete(null)}>
                <DialogContent className="max-w-[400px] rounded-3xl p-6">
                    <DialogTitle className="text-center text-lg font-bold">¿Eliminar grupo?</DialogTitle>
                    <DialogDescription className="text-center text-gray-500 mt-2">
                        Esta acción borrará permanentemente el grupo <span className="font-bold text-gray-900">"{groupToDelete?.name}"</span> y todos sus mensajes. Esta acción no se puede deshacer.
                    </DialogDescription>
                    <div className="flex gap-3 mt-6">
                        <Button variant="outline" onClick={() => setGroupToDelete(null)} className="flex-1 rounded-xl h-12 font-bold">
                            Cancelar
                        </Button>
                        <Button variant="destructive" onClick={executeDeleteGroup} disabled={isDeleting} className="flex-1 rounded-xl h-12 font-bold">
                            {isDeleting ? "Eliminando..." : "Eliminar"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogContent className="rounded-2xl max-w-md">
                    <DialogHeader>
                        <DialogTitle className="font-bold">Crear nuevo grupo</DialogTitle>
                        <DialogDescription>
                            Define el nombre, descripción y etiqueta del grupo.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label className="font-bold text-gray-700">Nombre <span className="text-red-500">*</span></Label>
                            <Input
                                value={createForm.name}
                                onChange={(e) => setCreateForm((prev) => ({ ...prev, name: e.target.value }))}
                                placeholder="Ej. Club de Lectura"
                                maxLength={45}
                            />
                            <p className="text-xs text-gray-500 text-right">
                                {createForm.name.length}/45
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label className="font-bold text-gray-700">Descripción</Label>
                            <textarea
                                value={createForm.description}
                                onChange={(e) => setCreateForm((prev) => ({ ...prev, description: e.target.value }))}
                                rows={3}
                                maxLength={255}
                                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                placeholder="De qué trata el grupo..."
                            />
                            <p className="text-xs text-gray-500 text-right">
                                {createForm.description.length}/255
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label className="font-bold text-gray-700">Etiqueta</Label>
                            <select
                                value={createForm.label}
                                onChange={(e) => setCreateForm((prev) => ({ ...prev, label: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                            >
                                {allLabelOptions.map((opt) => (
                                    <option key={opt.value} value={opt.value}>{opt.display}</option>
                                ))}
                            </select>
                        </div>

                        <div className="flex items-center gap-3">
                            <input
                                type="checkbox"
                                id="create-can-leave"
                                checked={createForm.can_members_leave}
                                onChange={(e) => setCreateForm((prev) => ({ ...prev, can_members_leave: e.target.checked }))}
                                className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                            />
                            <label htmlFor="create-can-leave" className="text-sm font-medium text-gray-600">
                                Permitir a los miembros abandonar
                            </label>
                        </div>
                    </div>

                    <DialogFooter className="gap-2">
                        <Button variant="outline" className="rounded-xl font-bold" onClick={() => setIsCreateOpen(false)}>
                            Cancelar
                        </Button>
                        <Button className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl font-bold" onClick={handleCreateGroup} disabled={isCreating}>
                            {isCreating ? "Creando..." : "Crear grupo"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Dialog: Gestionar etiquetas */}
            <Dialog open={isLabelsOpen} onOpenChange={setIsLabelsOpen}>
                <DialogContent className="rounded-2xl max-w-md">
                    <DialogHeader>
                        <DialogTitle className="font-bold">Gestionar etiquetas</DialogTitle>
                        <DialogDescription>
                            Las etiquetas personalizadas aparecerán al crear o editar grupos.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-6 py-4">
                        <div className="flex items-center gap-2">
                            <Input
                                value={newLabelName}
                                onChange={(e) => setNewLabelName(e.target.value)}
                                placeholder="Nombre de etiqueta..."
                                maxLength={15}
                                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleCreateLabel(); } }}
                            />
                            <Button className="bg-primary text-primary-foreground rounded-xl font-bold px-4" onClick={handleCreateLabel} disabled={creatingLabel || !newLabelName.trim()}>
                                <Plus className="w-4 h-4" />
                            </Button>
                        </div>
                        <p className="text-xs text-gray-500 text-right -mt-3">
                            {newLabelName.length}/15
                        </p>

                        <div className="space-y-2">
                            <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">Predefinidas</div>
                            <div className="flex flex-wrap gap-2">
                                {["General", "Planta", "Actividad", "Privado"].map((l) => (
                                    <span key={l} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold bg-gray-50 text-gray-400 border border-gray-200">
                                        <Tag className="w-3 h-3" /> {l}
                                    </span>
                                ))}
                            </div>
                        </div>

                        {customLabels.length > 0 && (
                            <div className="space-y-2">
                                <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">Personalizadas</div>
                                <div className="flex flex-wrap gap-2">
                                    {customLabels.map((label) => (
                                        <span key={label.id} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20">
                                            <Tag className="w-3 h-3" /> {label.name}
                                            <button onClick={() => handleDeleteLabel(label.id)} className="ml-1 hover:text-red-600 transition-colors">
                                                <X className="w-3 h-3" />
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button variant="outline" className="w-full rounded-xl font-bold" onClick={() => setIsLabelsOpen(false)}>
                            Cerrar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function Label({ children, className }: { children: React.ReactNode, className?: string }) {
    return <label className={`text-sm ${className}`}>{children}</label>;
}