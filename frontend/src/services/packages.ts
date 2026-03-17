import { API_URL } from "./api";

const PACKAGES_URL = `${API_URL}/packages`;

// --- Tipos de la API (Lo que viene del servidor) ---
export interface PackageItem {
  id: number;
  resident_name: string;
  building?: string;
  carrier?: string;
  tracking_number?: string;
  status: string;
  received_at?: string;
}

// --- Tipo de la UI (Lo que tu Front entiende) ---
export type SimplePackage = {
  id: number;
  sender: string;
  tracking: string;
  date: string;
  status: string;
  location?: string;
};

// Transformador privado: Convierte "suciedad" de API en "pureza" de UI
const mapToSimplePackage = (p: PackageItem): SimplePackage => ({
  id: p.id,
  sender: p.carrier || p.resident_name || "Remitente desconocido",
  tracking: p.tracking_number || "S/N",
  date: p.received_at ? new Date(p.received_at).toLocaleDateString() : "Sin fecha",
  status: p.status,
  location: p.building,
});

export const packagesService = {
  getMyPackages: async (): Promise<SimplePackage[]> => {
    const response = await fetch(`${PACKAGES_URL}/me/`, {
      method: 'GET',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!response.ok) throw new Error("Error al obtener paquetes");
    const data: PackageItem[] = await response.json();
    return data.map(mapToSimplePackage);
  },

  getDeliveryQr: async (): Promise<{ token: string }> => {
    const response = await fetch(`${PACKAGES_URL}/me/delivery_qr/`, {
      method: 'GET',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!response.ok) throw new Error("Error al obtener QR");
    return response.json();
  },

  markAsViewed: async () => {
    await fetch(`${PACKAGES_URL}/me/mark_as_viewed/`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    });
  }
};