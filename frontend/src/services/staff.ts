// src/services/staff.ts
import { fetchWithAuth } from "../utils/api";

const STAFF_URL = "/api/staff/";

export type StaffStatus = "active" | "inactive" | "holidays";

export interface StaffMember {
  id: number;
  full_name: string;
  job_title: string;
  department: string;
  email: string;
  location: string;
  schedule: string;
  status: StaffStatus;
  role: string;
}

export interface StaffPayload {
  full_name: string;
  job_title: string;
  department: string;
  email: string;
  password?: string;
  location: string;
  schedule: string;
  status: StaffStatus;
  role: string;
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const message =
      (body as { detail?: string }).detail ||
      Object.values(body as Record<string, unknown>)
        .flat()
        .join(" ") ||
      `Error ${res.status}`;
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}

export const staffService = {
  list: async (): Promise<StaffMember[]> => {
    const res = await fetchWithAuth(STAFF_URL);
    return handleResponse<StaffMember[]>(res);
  },

  create: async (payload: StaffPayload): Promise<StaffMember> => {
    const res = await fetchWithAuth(STAFF_URL, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return handleResponse<StaffMember>(res);
  },

  update: async (id: number, payload: Partial<StaffPayload>): Promise<StaffMember> => {
    const res = await fetchWithAuth(`${STAFF_URL}${id}/`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
    return handleResponse<StaffMember>(res);
  },

  delete: async (id: number): Promise<void> => {
    const res = await fetchWithAuth(`${STAFF_URL}${id}/`, { method: "DELETE" });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error((body as { detail?: string }).detail ?? `Error ${res.status}`);
    }
  },
};
