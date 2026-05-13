import { fetchWithAuth } from "../utils/api";
import { trackEvent } from "./analytics";

const SPACES_API_BASE = "/api/spaces";

export type ReservationStatus = "active" | "cancelled";

export interface CommonSpace {
  id: number;
  name: string;
  description: string;
  img?: string;
  capacity: number;
  is_active: boolean;
  open_time: string;
  close_time: string;
  reservation_interval_minutes: number;
}

export interface ReservationSpaceRef {
  id: number;
  name: string;
}

export interface ReservationUser {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
}

export interface SpaceReservation {
  id: number;
  space: ReservationSpaceRef;
  user: ReservationUser;
  residence_id: number;
  start_time: string;
  end_time: string;
  status: ReservationStatus;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface ReservationReminderNotification {
  id: string;
  title: string;
  message: string;
  created_at: string;
  start_time: string;
  end_time: string;
}

export interface AvailableSlot {
  start_time: string;
  end_time: string;
  status: "available" | "occupied" | "past";
}

export interface SpaceAvailability {
  date: string;
  space: CommonSpace;
  reservations: SpaceReservation[];
  available_slots: AvailableSlot[];
}

export interface CreateReservationPayload {
  start_time: string;
  end_time: string;
  notes?: string;
}

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

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
  start_time: "hora de inicio",
  end_time: "hora de fin",
  notes: "nota",
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
  if (!response.ok) {
    throw await parseError(response);
  }
  return (await response.json()) as T;
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}
export async function listCommonSpaces(): Promise<CommonSpace[]> {
  return requestJson<CommonSpace[]>(`${SPACES_API_BASE}/`);
}

export async function getSpaceAvailability(spaceId: number, date: string): Promise<SpaceAvailability> {
  return requestJson<SpaceAvailability>(
    `${SPACES_API_BASE}/${spaceId}/availability/?date=${encodeURIComponent(date)}`,
  );
}

export async function createReservation(
  spaceId: number,
  payload: CreateReservationPayload,
): Promise<SpaceReservation> {
  const reservation = await requestJson<SpaceReservation>(`${SPACES_API_BASE}/${spaceId}/reservations/`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  trackEvent('space_reserved', { space_id: spaceId });
  return reservation;
}

export async function listMyReservations(): Promise<SpaceReservation[]> {
  return requestJson<SpaceReservation[]>(`${SPACES_API_BASE}/reservations/me/`);
}

export async function listMyReservationReminders(): Promise<ReservationReminderNotification[]> {
  return requestJson<ReservationReminderNotification[]>(`${SPACES_API_BASE}/reservations/reminders/`);
}

export async function cancelReservation(reservationId: number): Promise<void> {
  await requestJson<{ detail: string }>(`${SPACES_API_BASE}/reservations/${reservationId}/cancel/`, {
    method: "POST",
  });
  trackEvent('space_reservation_cancelled', { reservation_id: reservationId });
}
