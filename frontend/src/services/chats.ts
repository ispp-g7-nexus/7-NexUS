import { fetchWithAuth } from "../utils/api";
import { trackEvent } from "./analytics";

const CHAT_GROUPS_URL = "/api/chats/groups/";
const CHAT_LABELS_URL = "/api/chats/labels/";
const MY_GROUPS_URL = "/api/chats/my-groups/";
const CONVERSATIONS_URL = "/api/chats/conversations/";
const CHAT_RESIDENTS_URL = "/api/chats/residents/";
const CHAT_EVENTS_STREAM_URL = "/api/chats/events/";

// Eliminado tipo alias redundante - usar string directamente

export interface ChatMember {
  id: number;
  membership_id: number;
  full_name: string;
  email: string;
  is_admin: boolean;
  joined_at: string;
}

export interface ChatGroup {
  id: number;
  name: string;
  description: string;
  label: string;
  can_members_leave: boolean;
  current_user_can_interact?: boolean;
  members: number;
  members_list: ChatMember[];
  created_by_email?: string;
}

export interface UpsertChatGroupPayload {
  name: string;
  description: string;
  label: string;
  can_members_leave: boolean;
}

interface AddMemberPayload {
  email: string;
  is_admin?: boolean;
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const message =
      body?.detail ||
      (typeof body === 'object' && body 
        ? Object.values(body)
          .flat()
          .filter(val => typeof val === 'string')
          .join(" ") 
        : ""
      ) ||
      `Error ${res.status}`;
    throw new Error(message);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return res.json() as Promise<T>;
}

export const chatsService = {
  subscribeToEvents: (onEvent: (event: ChatRealtimeEvent) => void): ChatEventsConnection => {
    let source: EventSource | null = null;
    let manuallyClosed = false;

    source = new EventSource(CHAT_EVENTS_STREAM_URL, { withCredentials: true });

    source.onopen = () => {
      connection.onopen?.();
    };

    source.onerror = () => {
      if (manuallyClosed) return;
      connection.onerror?.();
    };

    source.onmessage = (evt) => {
      try {
        const parsed = JSON.parse(String(evt.data)) as ChatRealtimeEvent;
        onEvent(parsed);
      } catch {
        // Ignorar payloads malformados para no romper la conexion.
      }
    };

    const connection: ChatEventsConnection = {
      close: () => {
        manuallyClosed = true;
        source?.close();
        source = null;
      },
      onopen: null,
      onerror: null,
    };

    return connection;
  },

  listGroups: async (): Promise<ChatGroup[]> => {
    const res = await fetchWithAuth(CHAT_GROUPS_URL);
    return handleResponse<ChatGroup[]>(res);
  },

  getGroup: async (id: number): Promise<ChatGroup> => {
    const res = await fetchWithAuth(`${CHAT_GROUPS_URL}${id}/`);
    return handleResponse<ChatGroup>(res);
  },

  createGroup: async (payload: UpsertChatGroupPayload): Promise<ChatGroup> => {
    const res = await fetchWithAuth(CHAT_GROUPS_URL, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    const group = await handleResponse<ChatGroup>(res);
    trackEvent('chat_group_created', { group_id: group.id, label: payload.label });
    return group;
  },

  updateGroup: async (id: number, payload: Partial<UpsertChatGroupPayload>): Promise<ChatGroup> => {
    const res = await fetchWithAuth(`${CHAT_GROUPS_URL}${id}/`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
    const group = await handleResponse<ChatGroup>(res);
    trackEvent('chat_group_updated', { group_id: id });
    return group;
  },

  deleteGroup: async (id: number): Promise<void> => {
    const res = await fetchWithAuth(`${CHAT_GROUPS_URL}${id}/`, {
      method: "DELETE",
    });
    await handleResponse<void>(res);
    trackEvent('chat_group_deleted', { group_id: id });
  },

  addMember: async (groupId: number, payload: AddMemberPayload): Promise<ChatGroup> => {
    const res = await fetchWithAuth(`${CHAT_GROUPS_URL}${groupId}/members/`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    const group = await handleResponse<ChatGroup>(res);
    trackEvent('chat_member_added', { group_id: groupId });
    return group;
  },

  updateMemberRole: async (groupId: number, memberId: number, is_admin: boolean): Promise<ChatGroup> => {
    const res = await fetchWithAuth(`${CHAT_GROUPS_URL}${groupId}/members/${memberId}/`, {
      method: "PATCH",
      body: JSON.stringify({ is_admin }),
    });
    return handleResponse<ChatGroup>(res);
  },

  removeMember: async (groupId: number, memberId: number): Promise<void> => {
    const res = await fetchWithAuth(`${CHAT_GROUPS_URL}${groupId}/members/${memberId}/`, {
      method: "DELETE",
    });
    await handleResponse<void>(res);
    trackEvent('chat_member_removed', { group_id: groupId });
  },

  // ── Endpoints para residentes ──

  listMyGroups: async (): Promise<ChatGroup[]> => {
    const res = await fetchWithAuth(MY_GROUPS_URL);
    return handleResponse<ChatGroup[]>(res);
  },

  leaveGroup: async (groupId: number): Promise<void> => {
    const res = await fetchWithAuth(`${MY_GROUPS_URL}${groupId}/leave/`, {
      method: "POST",
    });
    await handleResponse<void>(res);
    trackEvent('chat_group_left', { group_id: groupId });
  },

  // ── Mensajes de Grupo ──

  listGroupMessages: async (groupId: number): Promise<GroupMessage[]> => {
    const res = await fetchWithAuth(`${MY_GROUPS_URL}${groupId}/messages/`);
    return handleResponse<GroupMessage[]>(res);
  },

  sendGroupMessage: async (groupId: number, content: string): Promise<GroupMessage> => {
    const res = await fetchWithAuth(`${MY_GROUPS_URL}${groupId}/messages/`, {
      method: "POST",
      body: JSON.stringify({ content }),
    });
    const msg = await handleResponse<GroupMessage>(res);
    trackEvent('group_message_sent', { group_id: groupId });
    return msg;
  },

  // ── Chats privados ──

  listConversations: async (): Promise<PrivateConversation[]> => {
    const res = await fetchWithAuth(CONVERSATIONS_URL);
    return handleResponse<PrivateConversation[]>(res);
  },

  startConversation: async (membershipId: number): Promise<PrivateConversation> => {
    const res = await fetchWithAuth(`${CONVERSATIONS_URL}start/`, {
      method: "POST",
      body: JSON.stringify({ membership_id: membershipId }),
    });
    const conv = await handleResponse<PrivateConversation>(res);
    trackEvent('private_conversation_started');
    return conv;
  },

  listMessages: async (conversationId: number): Promise<PrivateMessage[]> => {
    const res = await fetchWithAuth(`${CONVERSATIONS_URL}${conversationId}/messages/`);
    return handleResponse<PrivateMessage[]>(res);
  },

  sendMessage: async (conversationId: number, content: string): Promise<PrivateMessage> => {
    const res = await fetchWithAuth(`${CONVERSATIONS_URL}${conversationId}/messages/`, {
      method: "POST",
      body: JSON.stringify({ content }),
    });
    const msg = await handleResponse<PrivateMessage>(res);
    trackEvent('private_message_sent');
    return msg;
  },

  listChatResidents: async (): Promise<ChatResident[]> => {
    const res = await fetchWithAuth(CHAT_RESIDENTS_URL);
    return handleResponse<ChatResident[]>(res);
  },

  // ── Etiquetas personalizadas ──

  listLabels: async (): Promise<ChatGroupLabelItem[]> => {
    const res = await fetchWithAuth(CHAT_LABELS_URL);
    return handleResponse<ChatGroupLabelItem[]>(res);
  },

  createLabel: async (name: string): Promise<ChatGroupLabelItem> => {
    const res = await fetchWithAuth(CHAT_LABELS_URL, {
      method: "POST",
      body: JSON.stringify({ name }),
    });
    const label = await handleResponse<ChatGroupLabelItem>(res);
    trackEvent('chat_label_created');
    return label;
  },

  deleteLabel: async (id: number): Promise<void> => {
    const res = await fetchWithAuth(`${CHAT_LABELS_URL}${id}/`, {
      method: "DELETE",
    });
    await handleResponse<void>(res);
    trackEvent('chat_label_deleted');
  },
};

// ── Tipos para chats privados ──

export interface PrivateConversation {
  id: number;
  other_user: {
    membership_id: number;
    full_name: string;
    email: string;
  };
  last_message: {
    content: string;
    created_at: string;
    is_mine: boolean;
  } | null;
  unread_count: number;
  created_at: string;
  updated_at: string;
}

export interface PrivateMessage {
  id: number;
  sender_membership_id: number;
  sender_name: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

export interface GroupMessage {
  id: number;
  sender_membership_id: number;
  sender_name: string;
  sender_email: string;
  content: string;
  created_at: string;
}

export interface ChatResident {
  id: number;
  full_name: string;
  email: string;
}

export interface ChatGroupLabelItem {
  id: number;
  name: string;
  created_at: string;
}

export interface ChatRealtimeEvent {
  event: string;
  payload?: Record<string, unknown>;
  ts?: number;
}

export interface ChatEventsConnection {
  close: () => void;
  onopen: null | (() => void);
  onerror: null | (() => void);
}