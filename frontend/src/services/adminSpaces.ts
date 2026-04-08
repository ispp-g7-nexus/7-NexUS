import { fetchWithAuth } from "../utils/api";
import { trackEvent } from "./analytics";
import { ApiError } from "./reservations";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

const ADMIN_SPACES_BASE = "/api/admin/spaces";

// ── Types ──────────────────────────────────────────────────────────────────

export interface AdminSpace {
  id: number;
  name: string;
  description: string;
  capacity: number;
  is_active: boolean;
  open_time: string;
  close_time: string;
  reservation_interval_minutes: number;
}

export interface AdminSpaceReservation {
  id: number;
  space: { id: number; name: string };
  user: { id: number; first_name: string; last_name: string; email: string };
  residence_id: number;
  start_time: string;
  end_time: string;
  status: "active" | "cancelled";
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface CreateSpacePayload {
  name: string;
  description?: string;
  capacity: number;
  open_time: string;
  close_time: string;
  reservation_interval_minutes: number;
  is_active?: boolean;
}

export type UpdateSpacePayload = Partial<CreateSpacePayload>;

// ── Helpers ────────────────────────────────────────────────────────────────

async function parseError(response: Response): Promise<ApiError> {
  let message = "Ha ocurrido un error inesperado.";
  try {
    const payload = (await response.json()) as unknown;
    if (isRecord(payload) && typeof payload.detail === "string" && payload.detail.trim()) {
      message = payload.detail;
    }
  } catch {
    if (response.status === 401 || response.status === 403) {
      message = "No tienes permisos para realizar esta acción.";
    }
  }
  return new ApiError(message, response.status);
}

async function requestJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetchWithAuth(url, options);
  if (!response.ok) throw await parseError(response);
  return (await response.json()) as T;
}

async function requestVoid(url: string, options?: RequestInit): Promise<void> {
  const response = await fetchWithAuth(url, options);
  if (!response.ok) throw await parseError(response);
}

// ── API calls ──────────────────────────────────────────────────────────────

export function listAdminSpaces(): Promise<AdminSpace[]> {
  return requestJson<AdminSpace[]>(`${ADMIN_SPACES_BASE}/`);
}

export function getSpace(spaceId: number): Promise<AdminSpace> {
  return requestJson<AdminSpace>(`${ADMIN_SPACES_BASE}/${spaceId}/`);
}

export async function createSpace(payload: CreateSpacePayload): Promise<AdminSpace> {
  const space = await requestJson<AdminSpace>(`${ADMIN_SPACES_BASE}/`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  trackEvent('admin_space_created', { space_name: payload.name });
  return space;
}

export async function updateSpace(spaceId: number, payload: UpdateSpacePayload): Promise<AdminSpace> {
  const space = await requestJson<AdminSpace>(`${ADMIN_SPACES_BASE}/${spaceId}/`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  trackEvent('admin_space_updated', { space_id: spaceId });
  return space;
}

export async function deactivateSpace(spaceId: number): Promise<void> {
  await requestVoid(`${ADMIN_SPACES_BASE}/${spaceId}/`, { method: "DELETE" });
  trackEvent('admin_space_deactivated', { space_id: spaceId });
}

export function listSpaceReservations(
  spaceId: number,
  status?: "active" | "cancelled",
): Promise<AdminSpaceReservation[]> {
  const params = status ? `?status=${status}` : "";
  return requestJson<AdminSpaceReservation[]>(
    `${ADMIN_SPACES_BASE}/${spaceId}/reservations/${params}`,
  );
}
