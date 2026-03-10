import { fetchWithAuth } from "../utils/api";

const CHAT_GROUPS_URL = "/api/chats/groups/";
const CHAT_LABELS_URL = "/api/chats/labels/";
const MY_GROUPS_URL = "/api/chats/my-groups/";
const CONVERSATIONS_URL = "/api/chats/conversations/";
const CHAT_RESIDENTS_URL = "/api/chats/residents/";

export type ChatLabel = string;

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
  label: ChatLabel;
  can_members_leave: boolean;
  members: number;
  members_list: ChatMember[];
  created_by_email?: string;
}

export interface UpsertChatGroupPayload {
  name: string;
  description: string;
  label: ChatLabel;
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
      Object.values(body as Record<string, unknown>)
        .flat()
        .join(" ") ||
      `Error ${res.status}`;
    throw new Error(message);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return res.json() as Promise<T>;
}

export const chatsService = {
  listGroups: async (): Promise<ChatGroup[]> => {
    const res = await fetchWithAuth(CHAT_GROUPS_URL);
    return handleResponse<ChatGroup[]>(res);
  },

  createGroup: async (payload: UpsertChatGroupPayload): Promise<ChatGroup> => {
    const res = await fetchWithAuth(CHAT_GROUPS_URL, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return handleResponse<ChatGroup>(res);
  },

  updateGroup: async (id: number, payload: Partial<UpsertChatGroupPayload>): Promise<ChatGroup> => {
    const res = await fetchWithAuth(`${CHAT_GROUPS_URL}${id}/`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
    return handleResponse<ChatGroup>(res);
  },

  deleteGroup: async (id: number): Promise<void> => {
    const res = await fetchWithAuth(`${CHAT_GROUPS_URL}${id}/`, {
      method: "DELETE",
    });
    await handleResponse<void>(res);
  },

  addMember: async (groupId: number, payload: AddMemberPayload): Promise<ChatGroup> => {
    const res = await fetchWithAuth(`${CHAT_GROUPS_URL}${groupId}/members/`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return handleResponse<ChatGroup>(res);
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
    return handleResponse<PrivateConversation>(res);
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
    return handleResponse<PrivateMessage>(res);
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
    return handleResponse<ChatGroupLabelItem>(res);
  },

  deleteLabel: async (id: number): Promise<void> => {
    const res = await fetchWithAuth(`${CHAT_LABELS_URL}${id}/`, {
      method: "DELETE",
    });
    await handleResponse<void>(res);
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