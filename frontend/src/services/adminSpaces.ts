import { fetchWithAuth } from "../utils/api";
import { trackEvent } from "./analytics";
import { ApiError } from "./reservations";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

const FIELD_LABELS: Record<string, string> = {
  name: "nombre",
  description: "descripción",
  capacity: "aforo",
  open_time: "hora de apertura",
  close_time: "hora de cierre",
  reservation_interval_minutes: "intervalo de reserva",
};

function normalizeFieldMessage(fieldName: string, rawMessage: string): string {
  const message = rawMessage.trim();
  const label = FIELD_LABELS[fieldName] ?? fieldName;

  const maxLengthMatch = message.match(/Ensure this field has no more than (\d+) characters\./i);
  if (maxLengthMatch) {
    return `El campo ${label} no puede superar los ${maxLengthMatch[1]} caracteres.`;
  }
  if (/This field may not be blank\./i.test(message)) {
    return `El campo ${label} no puede estar vacío.`;
  }
  if (/This field is required\./i.test(message)) {
    return `El campo ${label} es obligatorio.`;
  }

  return message;
}

function collectFieldMessages(payload: Record<string, unknown>): string[] {
  const messages: string[] = [];

  for (const [fieldName, value] of Object.entries(payload)) {
    if (fieldName === "detail" || fieldName === "message" || fieldName === "error") {
      continue;
    }

    if (typeof value === "string" && value.trim()) {
      messages.push(normalizeFieldMessage(fieldName, value));
      continue;
    }

    if (Array.isArray(value)) {
      const firstText = value.find((item) => typeof item === "string" && item.trim());
      if (typeof firstText === "string") {
        messages.push(normalizeFieldMessage(fieldName, firstText));
      }
    }
  }

  return messages;
}

function pickErrorMessage(payload: unknown, fallbackMessage: string): string {
  if (typeof payload === "string" && payload.trim()) {
    return payload;
  }

  if (!isRecord(payload)) {
    return fallbackMessage;
  }

  if (typeof payload.detail === "string" && payload.detail.trim()) {
    return payload.detail;
  }
  if (typeof payload.message === "string" && payload.message.trim()) {
    return payload.message;
  }
  if (typeof payload.error === "string" && payload.error.trim()) {
    return payload.error;
  }

  const fieldMessages = collectFieldMessages(payload);
  if (fieldMessages.length > 0) {
    return fieldMessages[0];
  }

  return fallbackMessage;
}

const ADMIN_SPACES_BASE = "/api/admin/spaces";

// ── Types ──────────────────────────────────────────────────────────────────

export interface AdminSpace {
  id: number;
  name: string;
  description: string;
  img?: string | null;
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
  img?: string | null;
  capacity: number;
  open_time: string;
  close_time: string;
  reservation_interval_minutes: number;
  is_active?: boolean;
}

export type UpdateSpacePayload = Partial<CreateSpacePayload>;

// ── Helpers ────────────────────────────────────────────────────────────────

async function parseError(response: Response): Promise<ApiError> {
  const fallbackMessage =
    response.status === 401 || response.status === 403
      ? "No tienes permisos para realizar esta acción."
      : "Ha ocurrido un error inesperado.";
  let message = fallbackMessage;
  try {
    const payload = (await response.json()) as unknown;
    message = pickErrorMessage(payload, fallbackMessage);
  } catch {
    message = fallbackMessage;
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

export async function deleteSpace(spaceId: number): Promise<void> {
  await requestVoid(`${ADMIN_SPACES_BASE}/${spaceId}/?permanent=true`, { method: "DELETE" });
  trackEvent('admin_space_deleted', { space_id: spaceId });
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
