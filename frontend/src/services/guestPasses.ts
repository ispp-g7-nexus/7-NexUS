import { fetchWithAuth } from "../utils/api";

const GUEST_PASSES_API_BASE = "/api/guest-passes";

export interface GuestPass {
  id: number;
  full_name: string;
  pass_code: string;
  valid_from: string;
  valid_until: string;
}

export class GuestPassApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "GuestPassApiError";
    this.status = status;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

async function parseError(response: Response): Promise<GuestPassApiError> {
  let message = "No se pudo cargar el listado de pases activos.";

  try {
    const payload = (await response.json()) as unknown;
    if (isRecord(payload) && typeof payload.detail === "string" && payload.detail.trim()) {
      message = payload.detail;
    }
  } catch {
    if (response.status === 401 || response.status === 403) {
      message = "No tienes permisos para consultar los pases de invitados.";
    }
  }

  return new GuestPassApiError(message, response.status);
}

export async function listMyActiveGuestPasses(): Promise<GuestPass[]> {
  const response = await fetchWithAuth(`${GUEST_PASSES_API_BASE}/me/active/`);
  if (!response.ok) {
    throw await parseError(response);
  }
  return (await response.json()) as GuestPass[];
}
