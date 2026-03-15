// src/services/packages.ts
import { API_URL } from "./api";

const PACKAGES_URL = `${API_URL}/packages`;

async function buildApiError(response: Response, fallbackMessage: string): Promise<Error> {
  try {
    const contentType = response.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      const payload = await response.json();
      const detail = typeof payload?.detail === "string" ? payload.detail : "";
      return new Error(detail || `${fallbackMessage} (HTTP ${response.status})`);
    }

    const rawText = (await response.text()).trim();
    if (rawText && !rawText.startsWith("<")) {
      return new Error(rawText);
    }
  } catch {
    // Fall back to a generic message when body parsing fails.
  }

  return new Error(`${fallbackMessage} (HTTP ${response.status})`);
}

export interface PackageItem {
  id: number;
  resident_id: number;
  resident_name: string;
  room?: string;
  building?: string;
  carrier?: string;
  tracking_number?: string;
  notes?: string;
  status: string;
  received_at?: string;
  delivered_at?: string | null;
  created_at?: string;
  updated_at?: string;
  is_unread?: boolean;
}

export const packagesService = {
  getMyPackages: async (status?: string): Promise<PackageItem[]> => {
    const url = status ? `${PACKAGES_URL}/me/?status=${encodeURIComponent(status)}` : `${PACKAGES_URL}/me/`;
    const response = await fetch(url, {
      method: 'GET',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
      throw await buildApiError(response, 'Error al obtener paquetes');
    }

    return response.json();
  },

  getDeliveryQr: async (): Promise<{ token: string }> => {
    const response = await fetch(`${PACKAGES_URL}/me/delivery_qr/`, {
      method: 'GET',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
      throw await buildApiError(response, 'Error al obtener QR');
    }

    return response.json();
  },

  getUnreadCount: async (): Promise<{ count: number }> => {
    const response = await fetch(`${PACKAGES_URL}/me/unread_count/`, {
      method: 'GET',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
      throw await buildApiError(response, 'Error al obtener contador de paquetes no leídos');
    }

    return response.json();
  },

  markAsViewed: async (): Promise<{ marked_count: number }> => {
    const response = await fetch(`${PACKAGES_URL}/me/mark_as_viewed/`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });

    if (!response.ok) {
      throw await buildApiError(response, 'Error al marcar paquetes como vistos');
    }

    return response.json();
  }
};
