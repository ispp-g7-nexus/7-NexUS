import { fetchWithAuth } from "../utils/api";

const GUEST_PASSES_API_BASE = "/api/guest-passes";
const ADMIN_GUEST_PASSES_API_BASE = "/api/admin/guest-passes";
const ADMIN_VISITORS_ANALYTICS_API_BASE = "/api/admin/analytics/visitors/";

export interface GuestPass {
  id: number;
  full_name: string;
  pass_code: string;
  valid_from: string;
  valid_until: string;
  status?: string;
  comment?: string;
}

export interface AdminGuestPass extends GuestPass {
  created_at: string;
  resident_name: string;
  out_of_schedule: boolean;
}

export interface CreateGuestPassPayload {
  guest_first_name: string;
  guest_last_name: string;
  valid_from: string;
  valid_until: string;
  comment?: string;
}

export interface GuestPassPolicy {
  max_duration_hours: number;
  max_concurrent_passes: number;
  visit_start_time?: string | null;
  visit_end_time?: string | null;
}

export interface UpdateGuestPassPolicyPayload {
  max_duration_hours?: number;
  max_concurrent_passes?: number;
  visit_start_time?: string | null;
  visit_end_time?: string | null;
}

export type VisitorsAnalyticsGranularity = "hour";
export type VisitorsAnalyticsCompare = "none" | "previous_period";

export interface VisitorsByHostAnalyticsItem {
  host_id: number;
  host_name: string;
  visitors_count: number;
  pct_of_total: number;
  compare_value: number | null;
  delta: number | null;
  delta_pct: number | null;
}

export interface PeakHourAnalyticsItem {
  hour: number;
  label: string;
  visits_count: number;
  compare_value: number | null;
  delta: number | null;
  delta_pct: number | null;
}

export interface VisitorsAnalyticsSummary {
  total_visits: number;
  total_hosts: number;
  compare_value_total_visits: number | null;
  compare_value_total_hosts: number | null;
  delta_total_visits: number | null;
  delta_total_hosts: number | null;
  delta_pct_total_visits: number | null;
  delta_pct_total_hosts: number | null;
}

export interface VisitorsAnalyticsMeta {
  from_value: string;
  to_value: string;
  granularity: VisitorsAnalyticsGranularity;
  compare: VisitorsAnalyticsCompare;
  compare_from: string | null;
  compare_to: string | null;
}

export interface VisitorsAnalyticsResponse {
  summary: VisitorsAnalyticsSummary;
  visitors_by_host: VisitorsByHostAnalyticsItem[];
  peak_hours: PeakHourAnalyticsItem[];
  meta: VisitorsAnalyticsMeta;
}

export interface VisitorsAnalyticsParams {
  from?: string;
  to?: string;
  granularity?: VisitorsAnalyticsGranularity;
  compare?: VisitorsAnalyticsCompare;
}

export class GuestPassApiError extends Error {
  status: number;
  fieldErrors: Record<string, string>;

  constructor(message: string, status: number, fieldErrors: Record<string, string> = {}) {
    super(message);
    this.name = "GuestPassApiError";
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseFieldErrors(payload: unknown): Record<string, string> {
  if (!isRecord(payload)) {
    return {};
  }

  const fields = [
    "guest_first_name",
    "guest_last_name",
    "valid_from",
    "valid_until",
    "comment",
    "max_duration_hours",
    "max_concurrent_passes",
    "from",
    "to",
    "granularity",
    "compare",
    "visit_start_time",
    "visit_end_time",
  ];
  const errors: Record<string, string> = {};

  for (const field of fields) {
    const fieldValue = payload[field];
    if (typeof fieldValue === "string" && fieldValue.trim()) {
      errors[field] = fieldValue;
      continue;
    }
    if (Array.isArray(fieldValue) && typeof fieldValue[0] === "string") {
      errors[field] = fieldValue[0];
    }
  }

  return errors;
}

function pickFirstErrorMessage(payload: unknown, fallbackMessage: string): string {
  if (!isRecord(payload)) {
    return fallbackMessage;
  }

  if (typeof payload.detail === "string" && payload.detail.trim()) {
    return payload.detail;
  }

  const fieldErrors = parseFieldErrors(payload);
  const firstField = Object.keys(fieldErrors)[0];
  if (firstField) {
    return fieldErrors[firstField];
  }

  return fallbackMessage;
}

async function parseError(
  response: Response,
  {
    fallbackMessage,
    forbiddenMessage,
  }: { fallbackMessage: string; forbiddenMessage: string }
): Promise<GuestPassApiError> {
  let message = fallbackMessage;
  let fieldErrors: Record<string, string> = {};

  try {
    const payload = (await response.json()) as unknown;
    fieldErrors = parseFieldErrors(payload);
    message = pickFirstErrorMessage(payload, fallbackMessage);
  } catch {
    if (response.status === 401 || response.status === 403) {
      message = forbiddenMessage;
    }
  }

  return new GuestPassApiError(message, response.status, fieldErrors);
}

export async function listMyActiveGuestPasses(): Promise<GuestPass[]> {
  const response = await fetchWithAuth(`${GUEST_PASSES_API_BASE}/me/active/`);
  if (!response.ok) {
    throw await parseError(response, {
      fallbackMessage: "No se pudo cargar el listado de pases activos.",
      forbiddenMessage: "No tienes permisos para consultar los pases de invitados.",
    });
  }
  return (await response.json()) as GuestPass[];
}

export async function listMyUpcomingGuestPasses(): Promise<GuestPass[]> {
  const response = await fetchWithAuth(`${GUEST_PASSES_API_BASE}/me/upcoming/`);
  if (!response.ok) {
    throw await parseError(response, {
      fallbackMessage: "No se pudo cargar el listado de pases próximos.",
      forbiddenMessage: "No tienes permisos para consultar los pases de invitados.",
    });
  }
  return (await response.json()) as GuestPass[];
}

export async function cancelMyGuestPass(guestPassId: number): Promise<GuestPass> {
  const response = await fetchWithAuth(`${GUEST_PASSES_API_BASE}/me/${guestPassId}/cancel/`, {
    method: "POST",
  });
  if (!response.ok) {
    throw await parseError(response, {
      fallbackMessage: "No se pudo cancelar el pase de invitado.",
      forbiddenMessage: "No tienes permisos para cancelar este pase de invitado.",
    });
  }

  const payload = (await response.json()) as { guest_pass?: GuestPass };
  if (!payload.guest_pass) {
    throw new GuestPassApiError(
      "La respuesta de cancelación del pase no es válida.",
      response.status
    );
  }

  return payload.guest_pass;
}

export async function listMyGuestPassHistory(): Promise<GuestPass[]> {
  const response = await fetchWithAuth(`${GUEST_PASSES_API_BASE}/me/history/`);
  if (!response.ok) {
    throw await parseError(response, {
      fallbackMessage: "No se pudo cargar el historial de pases.",
      forbiddenMessage: "No tienes permisos para consultar el historial de pases de invitados.",
    });
  }
  return (await response.json()) as GuestPass[];
}

export async function createMyGuestPass(payload: CreateGuestPassPayload): Promise<GuestPass> {
  const response = await fetchWithAuth(`${GUEST_PASSES_API_BASE}/me/`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw await parseError(response, {
      fallbackMessage: "No se pudo crear el pase de invitado.",
      forbiddenMessage: "No tienes permisos para crear pases de invitados.",
    });
  }
  return (await response.json()) as GuestPass;
}

export async function getMyGuestPassPolicy(): Promise<GuestPassPolicy> {
  const response = await fetchWithAuth(`${GUEST_PASSES_API_BASE}/me/policy/`);
  if (!response.ok) {
    throw await parseError(response, {
      fallbackMessage: "No se pudo cargar la política de pases de invitados.",
      forbiddenMessage: "No tienes permisos para consultar la política de pases.",
    });
  }
  return (await response.json()) as GuestPassPolicy;
}

export async function listAdminGuestPasses(statusFilter?: string): Promise<AdminGuestPass[]> {
  const url = statusFilter
    ? `${ADMIN_GUEST_PASSES_API_BASE}/?status=${encodeURIComponent(statusFilter)}`
    : `${ADMIN_GUEST_PASSES_API_BASE}/`;
  const response = await fetchWithAuth(url);
  if (!response.ok) {
    throw await parseError(response, {
      fallbackMessage: "No se pudo cargar el listado de invitados.",
      forbiddenMessage: "No tienes permisos para consultar el listado de invitados.",
    });
  }
  return (await response.json()) as AdminGuestPass[];
}

export async function getAdminGuestPassPolicy(): Promise<GuestPassPolicy> {
  const response = await fetchWithAuth(`${ADMIN_GUEST_PASSES_API_BASE}/policy/`);
  if (!response.ok) {
    throw await parseError(response, {
      fallbackMessage: "No se pudo cargar la configuración de visitantes.",
      forbiddenMessage: "No tienes permisos para consultar la configuración de visitantes.",
    });
  }
  return (await response.json()) as GuestPassPolicy;
}

export async function updateAdminGuestPassPolicy(
  payload: UpdateGuestPassPolicyPayload
): Promise<GuestPassPolicy> {
  const response = await fetchWithAuth(`${ADMIN_GUEST_PASSES_API_BASE}/policy/`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw await parseError(response, {
      fallbackMessage: "No se pudo guardar la configuración de visitantes.",
      forbiddenMessage: "No tienes permisos para actualizar la configuración de visitantes.",
    });
  }
  return (await response.json()) as GuestPassPolicy;
}

export async function getAdminVisitorsAnalytics(
  params: VisitorsAnalyticsParams = {}
): Promise<VisitorsAnalyticsResponse> {
  const query = new URLSearchParams();
  if (params.from) query.set("from", params.from);
  if (params.to) query.set("to", params.to);
  if (params.granularity) query.set("granularity", params.granularity);
  if (params.compare) query.set("compare", params.compare);

  const url = query.toString()
    ? `${ADMIN_VISITORS_ANALYTICS_API_BASE}?${query.toString()}`
    : ADMIN_VISITORS_ANALYTICS_API_BASE;
  const response = await fetchWithAuth(url);

  if (!response.ok) {
    throw await parseError(response, {
      fallbackMessage: "No se pudieron cargar las analíticas de visitantes.",
      forbiddenMessage: "No tienes permisos para consultar analíticas de visitantes.",
    });
  }

  return (await response.json()) as VisitorsAnalyticsResponse;
}
