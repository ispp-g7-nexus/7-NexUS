import { API_URL } from "./api";

const PACKAGES_URL = `${API_URL}/packages`;

// --- Tipos de la API (Lo que viene del servidor) ---
export interface PackageItem {
  id: number;
  resident_name?: string;
  building?: string;
  carrier?: string;
  tracking_number?: string;
  status: string;
  received_at?: string;
  is_unread?: boolean;
}

// --- Tipo de la UI (Lo que tu Front entiende) ---
export type SimplePackage = {
  id: number;
  sender?: string;
  resident_name?: string;
  tracking?: string;
  date?: string;
  status?: string;
  location?: string;
  is_unread?: boolean;
};

// Transformador privado: Convierte "suciedad" de API en "pureza" de UI
const mapToSimplePackage = (p: PackageItem): SimplePackage => ({
  id: p.id,
  sender: p.carrier || p.resident_name || "Remitente desconocido",
  resident_name: p.resident_name,
  tracking: p.tracking_number || "S/N",
  date: p.received_at ? new Date(p.received_at).toLocaleDateString() : undefined,
  status: p.status,
  location: p.building,
  is_unread: Boolean(p.is_unread),
});

export const packagesService = {
  getMyPackages: async (page?: number): Promise<SimplePackage[]> => {
    const qs = page ? `?page=${page}` : "";
    const response = await fetch(`${PACKAGES_URL}/me/${qs}`, {
      method: 'GET',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!response.ok) throw new Error("Error al obtener paquetes");
    const data: PackageItem[] = await response.json();
    return data.map(mapToSimplePackage);
  },

  getDeliveryQr: async (): Promise<{ token: string; expires_at?: string; resident_name?: string }> => {
    const response = await fetch(`${PACKAGES_URL}/me/delivery_qr/`, {
      method: 'GET',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!response.ok) throw new Error("Error al obtener QR");
    const data = await response.json();
    // Compatibilidad defensiva: el backend puede devolver { qr_token } o { token }
    const token = (data && (data.qr_token || data.token)) || "";
    return {
      token,
      expires_at: data?.expires_at,
      resident_name: data?.resident_name,
    };
  },

  getUnreadCount: async (): Promise<number> => {
    const response = await fetch(`${PACKAGES_URL}/me/unread_count/`, {
      method: 'GET',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!response.ok) return 0;
    const data = await response.json();
    return Number(data?.count || 0);
  },

  markAsViewed: async () => {
    const response = await fetch(`${PACKAGES_URL}/me/mark_as_viewed/`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) throw new Error("Error marcando paquetes como vistos");
    return response.json();
  }
};