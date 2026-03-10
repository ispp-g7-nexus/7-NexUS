import { ArrowLeft, LogOut, MessageSquare, Plus, Search, Send, Tag, Users } from "lucide-react";
import { type ReactElement, useCallback, useEffect, useMemo, useRef, useState } from "react";
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
    type ChatLabel,
    type ChatResident,
    type PrivateConversation,
    type PrivateMessage,
    type GroupMessage,
} from "../../../services/chats";
import { authService } from "../../../services/auth";

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

/* ── Config etiquetas ───────────────────────────────────────── */

const labelConfig: Record<ChatLabel, { label: string; color: string; icon: ReactElement }> = {
    general: { label: "General", color: "bg-blue-100 text-blue-800", icon: <MessageSquare className="w-3 h-3" /> },
    floor: { label: "Planta", color: "bg-green-100 text-green-800", icon: <Users className="w-3 h-3" /> },
    activity: { label: "Actividad", color: "bg-purple-100 text-purple-800", icon: <Users className="w-3 h-3" /> },
    private: { label: "Privado", color: "bg-gray-100 text-gray-800", icon: <Users className="w-3 h-3" /> },
};

/* ── Sub-tabs ───────────────────────────────────────────────── */

type ChatSubTab = "grupos" | "privados";

/* ══════════════════════════════════════════════════════════════
   Componente principal
   ══════════════════════════════════════════════════════════════ */

export function StudentChats() {
    const [subTab, setSubTab] = useState<ChatSubTab>("grupos");

    // ── Estado grupos ──
    const [groups, setGroups] = useState<ChatGroup[]>([]);
    const [loadingGroups, setLoadingGroups] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedGroup, setSelectedGroup] = useState<ChatGroup | null>(null);
    const [showLeaveDialog, setShowLeaveDialog] = useState(false);
    const [leaving, setLeaving] = useState(false);

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

    // ── Estado nueva conversación ──
    const [showNewConv, setShowNewConv] = useState(false);
    const [residents, setResidents] = useState<ChatResident[]>([]);
    const [loadingResidents, setLoadingResidents] = useState(false);
    const [residentSearch, setResidentSearch] = useState("");

    /* ────────────────── Carga de grupos ─────────────────────── */

    const loadGroups = useCallback(async () => {
        setLoadingGroups(true);
        try {
            setGroups(await chatsService.listMyGroups());
        } catch {
            toast.error("No se pudieron cargar tus grupos.");
        } finally {
            setLoadingGroups(false);
        }
    }, []);

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const response = await authService.me();
                if (response.user && response.user.email) {
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

    const handleLeaveGroup = async () => {
        if (!selectedGroup) return;
        setLeaving(true);
        try {
            await chatsService.leaveGroup(selectedGroup.id);
            setGroups((prev) => prev.filter((g) => g.id !== selectedGroup.id));
            toast.success("Has abandonado el grupo.");
            setSelectedGroup(null);
            setShowLeaveDialog(false);
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : "No se pudo abandonar el grupo.");
        } finally {
            setLeaving(false);
        }
    };

    /* ────────────────── Apertura y Mensajes de Grupo ─────────────────────── */

    const openGroup = async (group: ChatGroup) => {
        setSelectedGroup(group);
        setLoadingGroupMsgs(true);
        try {
            setGroupMessages(await chatsService.listGroupMessages(group.id));
        } catch {
            toast.error("No se pudieron cargar los mensajes del grupo.");
        } finally {
            setLoadingGroupMsgs(false);
        }
    };

    useEffect(() => {
        groupMessagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [groupMessages]);

    const handleSendGroupMessage = async () => {
        if (!selectedGroup || !groupMsgText.trim()) return;
        setSendingGroupMsg(true);
        try {
            const newMsg = await chatsService.sendGroupMessage(selectedGroup.id, groupMsgText.trim());
            setGroupMessages((prev) => [...prev, newMsg]);
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
        }
    }, []);

    useEffect(() => {
        if (subTab === "privados") loadConversations();
    }, [subTab, loadConversations]);

    const filteredConvs = useMemo(() =>
        conversations.filter((c) =>
            c.other_user.full_name.toLowerCase().includes(convSearch.toLowerCase()),
        ),
        [conversations, convSearch]);

    /* ────────────────── Mensajes ─────────────────────────────── */

    const openConversation = async (conv: PrivateConversation) => {
        setActiveConv(conv);
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

    /* ══════════════════════════════════════════════════════════════
       RENDER: Vista de chat activo (mensajes)
       ══════════════════════════════════════════════════════════════ */

    if (activeConv) {
        return (
            <div className="flex flex-col h-[calc(100vh-220px)]">
                {/* Cabecera */}
                <div className="flex items-center gap-3 pb-3 border-b border-gray-200 shrink-0">
                    <Button variant="ghost" size="icon" onClick={() => setActiveConv(null)} className="w-9 h-9 shrink-0">
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
                                    <div className={`max-w-[75%] px-3.5 py-2 rounded-2xl text-sm ${isMine
                                        ? "bg-green-600 text-white rounded-br-md"
                                        : "bg-gray-100 text-gray-900 rounded-bl-md"
                                        }`}>
                                        <p className="whitespace-pre-line break-words">{msg.content}</p>
                                        <p className={`text-[10px] mt-1 ${isMine ? "text-green-200" : "text-gray-400"}`}>
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
                        className="bg-green-600 hover:bg-green-700 shrink-0 w-10 h-10"
                        onClick={handleSendMessage}
                        disabled={sending || !msgText.trim()}
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
        return (
            <div className="flex flex-col h-[calc(100vh-220px)]">
                {/* Cabecera del Grupo */}
                <div className="flex items-center gap-3 pb-3 border-b border-gray-200 shrink-0 justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                        <Button variant="ghost" size="icon" onClick={() => setSelectedGroup(null)} className="w-9 h-9 shrink-0">
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
                                        ? "bg-green-600 text-white rounded-br-md"
                                        : "bg-gray-100 text-gray-900 rounded-bl-md"
                                        }`}>
                                        <p className="whitespace-pre-line break-words">{msg.content}</p>
                                        <p className={`text-[10px] mt-1 ${isMine ? "text-green-200" : "text-gray-400"}`}>
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
                        placeholder="Escribe un mensaje al grupo…"
                        value={groupMsgText}
                        onChange={(e) => setGroupMsgText(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendGroupMessage(); } }}
                        className="flex-1"
                    />
                    <Button
                        size="icon"
                        className="bg-green-600 hover:bg-green-700 shrink-0 w-10 h-10"
                        onClick={handleSendGroupMessage}
                        disabled={sendingGroupMsg || !groupMsgText.trim()}
                    >
                        <Send className="w-4 h-4 ml-0.5" />
                    </Button>
                </div>

                <Dialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>¿Abandonar grupo?</DialogTitle>
                            <DialogDescription>
                                Estás a punto de abandonar <strong>{selectedGroup.name}</strong>. No podrás volver a unirte por tu cuenta.
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setShowLeaveDialog(false)}>Cancelar</Button>
                            <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={handleLeaveGroup} disabled={leaving}>
                                {leaving ? "Saliendo…" : "Sí, abandonar"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        );
    }

    /* ══════════════════════════════════════════════════════════════
       RENDER: Vista principal con sub-tabs
       ══════════════════════════════════════════════════════════════ */

    return (
        <div className="space-y-5">
            {/* Sub-tabs */}
            <div className="flex bg-gray-100 p-1 rounded-full w-fit mx-auto">
                {(["grupos", "privados"] as ChatSubTab[]).map((tab) => (
                    <Button
                        key={tab}
                        variant={subTab === tab ? "default" : "ghost"}
                        className={`rounded-full px-6 capitalize ${subTab === tab ? "bg-white text-green-700 shadow-sm hover:bg-white" : "text-gray-500"
                            }`}
                        onClick={() => setSubTab(tab)}
                    >
                        {tab}
                    </Button>
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
                        <Button size="icon" className="bg-green-600 hover:bg-green-700 shrink-0 w-10 h-10" onClick={openNewConvDialog}>
                            <Plus className="w-5 h-5" />
                        </Button>
                    </div>

                    {/* Lista de conversaciones */}
                    {loadingConvs ? (
                        <div className="text-center py-12 text-sm text-gray-400">Cargando conversaciones…</div>
                    ) : filteredConvs.length === 0 ? (
                        <div className="text-center py-16">
                            <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                            <h3 className="text-base font-medium text-gray-800 mb-1">
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
                                            <span className={`font-medium truncate ${conv.unread_count > 0 ? "text-gray-900" : "text-gray-700"}`}>
                                                {conv.other_user.full_name}
                                            </span>
                                            {conv.last_message && (
                                                <span className="text-[10px] text-gray-400 shrink-0 ml-2">
                                                    {timeAgo(conv.last_message.created_at)}
                                                </span>
                                            )}
                                        </div>
                                        {conv.last_message ? (
                                            <p className={`text-xs truncate ${conv.unread_count > 0 ? "text-gray-600 font-medium" : "text-gray-400"}`}>
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
                            <h3 className="text-base font-medium text-gray-800 mb-1">
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
                                return (
                                    <button
                                        key={group.id}
                                        onClick={() => openGroup(group)}
                                        className="w-full text-left px-4 py-3.5 hover:bg-gray-50 transition-colors flex items-center gap-3"
                                    >
                                        <div className="w-10 h-10 bg-gradient-to-br from-green-200 to-green-400 rounded-full flex items-center justify-center text-green-800 font-bold text-sm shrink-0">
                                            {group.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-0.5">
                                                <span className="font-medium text-gray-900 truncate">{group.name}</span>
                                                <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium shrink-0 ${cfg.color}`}>
                                                    {cfg.icon} {cfg.label}
                                                </span>
                                            </div>
                                            {group.description && <p className="text-xs text-gray-500 truncate">{group.description}</p>}
                                            <div className="flex items-center gap-1 mt-0.5 text-[11px] text-gray-400">
                                                <Users className="w-3 h-3" />
                                                {group.members} {group.members === 1 ? "miembro" : "miembros"}
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
