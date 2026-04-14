import { fetchWithAuth } from "../utils/api";

const ADMIN_EVENTS_ANALYTICS_API_BASE = "/api/admin/analytics/events/";

export type EventsAnalyticsCompare = "none" | "previous_period";
export type EventsAnalyticsEventType = "all" | "official" | "resident";
export type EventsAnalyticsMeasurementType =
  | "real_attendance"
  | "registrations_proxy";

export interface EventsAnalyticsSummary {
  total_events: number;
  total_event_creators: number;
  total_participants_or_attendees: number;
  attendance_rate: number;
  compare_value_total_events: number | null;
  compare_value_total_event_creators: number | null;
  compare_value_total_participants_or_attendees: number | null;
  compare_value_attendance_rate: number | null;
  delta_total_events: number | null;
  delta_total_event_creators: number | null;
  delta_total_participants_or_attendees: number | null;
  delta_attendance_rate: number | null;
  delta_pct_total_events: number | null;
  delta_pct_total_event_creators: number | null;
  delta_pct_total_participants_or_attendees: number | null;
  delta_pct_attendance_rate: number | null;
}

export interface EventsAttendanceOverview {
  total_registered: number;
  total_attended: number;
  attendance_rate: number;
  measurement_type: EventsAnalyticsMeasurementType;
  compare_value: number | null;
  delta: number | null;
  delta_pct: number | null;
}

export interface EventCreationByResidentItem {
  resident_id: number;
  resident_name: string;
  events_created_count: number;
  pct_of_total: number;
  compare_value: number | null;
  delta: number | null;
  delta_pct: number | null;
}

export interface TopResidentByAttendanceItem {
  resident_id: number;
  resident_name: string;
  attended_events_count: number;
  registered_events_count: number;
  attendance_rate: number;
  compare_value: number | null;
  delta: number | null;
  delta_pct: number | null;
}

export interface EventsAnalyticsMeta {
  from_value: string;
  to_value: string;
  compare: EventsAnalyticsCompare;
  event_type: EventsAnalyticsEventType;
  creator_id: number | null;
  measurement_type: EventsAnalyticsMeasurementType;
  compare_from: string | null;
  compare_to: string | null;
}

export interface EventsAnalyticsResponse {
  summary: EventsAnalyticsSummary;
  attendance_overview: EventsAttendanceOverview;
  event_creation_by_resident: EventCreationByResidentItem[];
  top_residents_by_attendance: TopResidentByAttendanceItem[];
  meta: EventsAnalyticsMeta;
}

export interface EventsAnalyticsParams {
  from?: string;
  to?: string;
  compare?: EventsAnalyticsCompare;
  event_type?: EventsAnalyticsEventType;
  creator_id?: string | number;
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
  const fallbackMessage = "No se pudieron cargar las analíticas de eventos.";
  try {
    const payload = (await response.json()) as unknown;
    return new Error(pickErrorMessage(payload, fallbackMessage));
  } catch {
    if (response.status === 401 || response.status === 403) {
      return new Error("No tienes permisos para consultar analíticas de eventos.");
    }
    return new Error(fallbackMessage);
  }
}

export async function getAdminEventsAnalytics(
  params: EventsAnalyticsParams = {}
): Promise<EventsAnalyticsResponse> {
  const query = new URLSearchParams();
  if (params.from) query.set("from", params.from);
  if (params.to) query.set("to", params.to);
  if (params.compare) query.set("compare", params.compare);
  if (params.event_type) query.set("event_type", params.event_type);
  if (params.creator_id !== undefined && params.creator_id !== null && `${params.creator_id}`.trim()) {
    query.set("creator_id", `${params.creator_id}`.trim());
  }

  const url = query.toString()
    ? `${ADMIN_EVENTS_ANALYTICS_API_BASE}?${query.toString()}`
    : ADMIN_EVENTS_ANALYTICS_API_BASE;

  const response = await fetchWithAuth(url);
  if (!response.ok) {
    throw await parseError(response);
  }

  return (await response.json()) as EventsAnalyticsResponse;
}
