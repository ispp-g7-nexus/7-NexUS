// src/services/residents.ts
import { fetchWithAuth } from "../utils/api";

const RESIDENTS_URL = "/api/residents/";

export interface Resident {
  id: number;
  full_name: string;
  email: string;
  is_active: boolean;
  bedroom_id: number | null;
  room: string;        // read-only, derivado de la habitación asignada
  building: string;    // read-only, derivado de la habitación asignada
  check_in_date: string | null;
  created_at: string;
}

export interface CreateResidentPayload {
  full_name: string;
  email: string;
  password?: string;
  bedroom_id?: number | null;
  checkin_date?: string | null;
  is_active: boolean;
}

export interface UpdateResidentPayload {
  full_name?: string;
  email?: string;
  bedroom_id?: number | null;
  check_in_date?: string | null;
  is_active?: boolean;
}

/**
 * Maps a raw API response body into a consistent Resident shape,
 * normalising possible key variants.
 */
function normalise(raw: Record<string, unknown>): Resident {
  return {
    id: raw.id as number,
    full_name: (raw.full_name as string) ?? "",
    email: (raw.email as string) ?? "",
    is_active: (raw.is_active as boolean) ?? true,
    bedroom_id: (raw.bedroom_id as number | null) ?? null,
    room: (raw.room as string) ?? "",
    building: (raw.building as string) ?? "",
    check_in_date: (raw.check_in_date as string | null) ?? null,
    created_at: (raw.created_at as string) ?? "",
  };
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
  return res.json() as Promise<T>;
}

export const residentsService = {
  /**
   * GET /api/residents/
   * Returns all residents for the current residence.
   */
  list: async (): Promise<Resident[]> => {
    const res = await fetchWithAuth(RESIDENTS_URL);
    const data = await handleResponse<Record<string, unknown>[]>(res);
    return data.map(normalise);
  },

  /**
   * GET /api/residents/:id/
   */
  get: async (id: number): Promise<Resident> => {
    const res = await fetchWithAuth(`${RESIDENTS_URL}${id}/`);
    const data = await handleResponse<Record<string, unknown>>(res);
    return normalise(data);
  },

  /**
   * POST /api/residents/
   */
  create: async (payload: CreateResidentPayload): Promise<{ ok: boolean; created: boolean; email: string }> => {
    const res = await fetchWithAuth(RESIDENTS_URL, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return handleResponse(res);
  },

  /**
   * PATCH /api/residents/:id/
   */
  update: async (id: number, payload: UpdateResidentPayload): Promise<Resident> => {
    const res = await fetchWithAuth(`${RESIDENTS_URL}${id}/`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
    const data = await handleResponse<Record<string, unknown>>(res);
    return normalise(data);
  },

  /**
   * DELETE /api/residents/:id/  (soft-delete)
   */
  delete: async (id: number): Promise<void> => {
    const res = await fetchWithAuth(`${RESIDENTS_URL}${id}/`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error((body as { detail?: string }).detail || `Error ${res.status}`);
    }
  },
};
