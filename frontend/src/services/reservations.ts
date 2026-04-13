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

export async function cancelReservation(reservationId: number): Promise<void> {
  await requestJson<{ detail: string }>(`${SPACES_API_BASE}/reservations/${reservationId}/cancel/`, {
    method: "POST",
  });
  trackEvent('space_reservation_cancelled', { reservation_id: reservationId });
}
