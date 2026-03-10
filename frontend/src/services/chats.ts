import { fetchWithAuth } from "../utils/api";

const CHAT_GROUPS_URL = "/api/chats/groups/";

export type ChatLabel = "general" | "floor" | "activity" | "private";

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
};