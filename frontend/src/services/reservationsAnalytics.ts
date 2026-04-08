import { fetchWithAuth } from "../utils/api";

const ADMIN_RESERVATIONS_ANALYTICS_API_BASE = "/api/admin/analytics/reservations/";

export type ReservationsAnalyticsCompare = "none" | "previous_period";
export type ReservationsAnalyticsResourceType = "all" | "spaces" | "objects";

export interface ReservationsAnalyticsSummary {
  total_reservations: number;
  total_cancelled: number;
  cancellation_rate: number;
  active_zones: number;
  compare_value_total_reservations: number | null;
  compare_value_total_cancelled: number | null;
  compare_value_cancellation_rate: number | null;
  compare_value_active_zones: number | null;
  delta_total_reservations: number | null;
  delta_total_cancelled: number | null;
  delta_cancellation_rate: number | null;
  delta_active_zones: number | null;
  delta_pct_total_reservations: number | null;
  delta_pct_total_cancelled: number | null;
  delta_pct_cancellation_rate: number | null;
  delta_pct_active_zones: number | null;
}

export interface ReservationsMostReservedZoneItem {
  zone_id: string;
  zone_name: string;
  resource_type: ReservationsAnalyticsResourceType | "unknown";
  reservations_count: number;
  pct_of_total: number;
  compare_value: number | null;
  delta: number | null;
  delta_pct: number | null;
}

export interface ReservationsPeakTimeByZoneItem {
  zone_id: string;
  zone_name: string;
  resource_type: ReservationsAnalyticsResourceType | "unknown";
  hour: number;
  label: string;
  reservations_count: number;
  compare_value: number | null;
  delta: number | null;
  delta_pct: number | null;
}

export interface ReservationsCancellationRateByZoneItem {
  zone_id: string;
  zone_name: string;
  resource_type: ReservationsAnalyticsResourceType | "unknown";
  total_reservations: number;
  cancelled_reservations: number;
  cancellation_rate: number;
  compare_value: number | null;
  delta: number | null;
  delta_pct: number | null;
}

export interface ReservationsCancellationRateByUserItem {
  user_id: number;
  user_name: string;
  total_reservations: number;
  cancelled_reservations: number;
  cancellation_rate: number;
  compare_value: number | null;
  delta: number | null;
  delta_pct: number | null;
}

export interface ReservationsAnalyticsMeta {
  from_value: string;
  to_value: string;
  compare: ReservationsAnalyticsCompare;
  resource_type: ReservationsAnalyticsResourceType;
  zone_id: string | null;
  compare_from: string | null;
  compare_to: string | null;
}

export interface ReservationsAnalyticsResponse {
  summary: ReservationsAnalyticsSummary;
  most_reserved_zones: ReservationsMostReservedZoneItem[];
  peak_time_by_zone: ReservationsPeakTimeByZoneItem[];
  cancellation_rate_by_zone: ReservationsCancellationRateByZoneItem[];
  cancellation_rate_by_user: ReservationsCancellationRateByUserItem[];
  meta: ReservationsAnalyticsMeta;
}

export interface ReservationsAnalyticsParams {
  from?: string;
  to?: string;
  compare?: ReservationsAnalyticsCompare;
  resource_type?: ReservationsAnalyticsResourceType;
  zone_id?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function pickErrorMessage(payload: unknown, fallback: string): string {
  if (!isRecord(payload)) return fallback;
  if (typeof payload.detail === "string" && payload.detail.trim()) {
    return payload.detail;
  }
  const firstKey = Object.keys(payload)[0];
  if (firstKey) {
    const value = payload[firstKey];
    if (typeof value === "string" && value.trim()) {
      return value;
    }
    if (Array.isArray(value) && typeof value[0] === "string") {
      return value[0];
    }
  }
  return fallback;
}

async function parseError(response: Response): Promise<Error> {
  const fallbackMessage = "No se pudieron cargar las analíticas de reservas.";
  try {
    const payload = (await response.json()) as unknown;
    return new Error(pickErrorMessage(payload, fallbackMessage));
  } catch {
    if (response.status === 401 || response.status === 403) {
      return new Error("No tienes permisos para consultar analíticas de reservas.");
    }
    return new Error(fallbackMessage);
  }
}

export async function getAdminReservationsAnalytics(
  params: ReservationsAnalyticsParams = {}
): Promise<ReservationsAnalyticsResponse> {
  const query = new URLSearchParams();
  if (params.from) query.set("from", params.from);
  if (params.to) query.set("to", params.to);
  if (params.compare) query.set("compare", params.compare);
  if (params.resource_type) query.set("resource_type", params.resource_type);
  if (params.zone_id) query.set("zone_id", params.zone_id);

  const url = query.toString()
    ? `${ADMIN_RESERVATIONS_ANALYTICS_API_BASE}?${query.toString()}`
    : ADMIN_RESERVATIONS_ANALYTICS_API_BASE;

  const response = await fetchWithAuth(url);
  if (!response.ok) {
    throw await parseError(response);
  }

  return (await response.json()) as ReservationsAnalyticsResponse;
}
