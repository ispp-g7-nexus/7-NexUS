import { fetchWithAuth } from "../utils/api";

const PACKAGES_URL = "/api/packages/";

export type PackageStatus = "RECEIVED" | "DELIVERED";

export interface PackageAdminItem {
  id: number;
  resident_id: number;
  resident_name: string;
  room: string;
  building: string;
  carrier: string;
  tracking_number: string;
  notes: string;
  status: PackageStatus;
  received_at: string;
  delivered_at: string | null;
  created_at: string;
  updated_at: string;
  is_unread: boolean;
}

export interface PackageResidentCandidate {
  resident_id: number;
  full_name: string;
  room: string;
  building: string;
}

export interface PackageLabelPreview {
  suggested_fields: {
    recipient_name: string;
    room: string;
    building: string;
    carrier: string;
    tracking_number: string;
    notes: string;
  };
  resident_match: {
    resident_id: number | null;
    confidence: number;
    reason: string;
  };
  candidate_residents: PackageResidentCandidate[];
}

export interface CreatePackagePayload {
  resident_id: number;
  carrier?: string;
  tracking_number?: string;
  notes?: string;
  status?: PackageStatus;
  received_at?: string;
}

export interface UpdatePackagePayload {
  resident_id?: number;
  carrier?: string;
  tracking_number?: string;
  notes?: string;
  status?: PackageStatus;
  received_at?: string;
}

export interface PackageListParams {
  status?: PackageStatus;
  resident_id?: number;
  search?: string;
}

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

function buildQuery(params?: PackageListParams): string {
  if (!params) {
    return "";
  }

  const searchParams = new URLSearchParams();
  if (params.status) {
    searchParams.set("status", params.status);
  }
  if (typeof params.resident_id === "number") {
    searchParams.set("resident_id", String(params.resident_id));
  }
  if (params.search?.trim()) {
    searchParams.set("search", params.search.trim());
  }

  const query = searchParams.toString();
  return query ? `?${query}` : "";
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const message =
      (body as { detail?: string }).detail ||
      Object.values(body as Record<string, unknown>)
        .flat()
        .join(" ") ||
      `Error ${response.status}`;
    throw new Error(message);
  }

  return response.json() as Promise<T>;
}

const mapToSimplePackage = (pkg: PackageAdminItem): SimplePackage => ({
  id: pkg.id,
  sender: pkg.carrier || pkg.resident_name || "Remitente desconocido",
  resident_name: pkg.resident_name,
  tracking: pkg.tracking_number || "S/N",
  date: pkg.received_at ? new Date(pkg.received_at).toLocaleDateString() : undefined,
  status: pkg.status,
  location: pkg.building,
  is_unread: Boolean(pkg.is_unread),
});

export const packagesService = {
  list: async (params?: PackageListParams): Promise<PackageAdminItem[]> => {
    const response = await fetchWithAuth(`${PACKAGES_URL}${buildQuery(params)}`);
    return handleResponse<PackageAdminItem[]>(response);
  },

  get: async (id: number): Promise<PackageAdminItem> => {
    const response = await fetchWithAuth(`${PACKAGES_URL}${id}/`);
    return handleResponse<PackageAdminItem>(response);
  },

  create: async (payload: CreatePackagePayload): Promise<PackageAdminItem> => {
    const response = await fetchWithAuth(PACKAGES_URL, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return handleResponse<PackageAdminItem>(response);
  },

  update: async (id: number, payload: UpdatePackagePayload): Promise<PackageAdminItem> => {
    const response = await fetchWithAuth(`${PACKAGES_URL}${id}/`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
    return handleResponse<PackageAdminItem>(response);
  },

  delete: async (id: number): Promise<void> => {
    const response = await fetchWithAuth(`${PACKAGES_URL}${id}/`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error((body as { detail?: string }).detail || `Error ${response.status}`);
    }
  },

  deliverByQr: async (id: number, qrToken: string): Promise<PackageAdminItem> => {
    const response = await fetchWithAuth(`${PACKAGES_URL}${id}/deliver-by-qr/`, {
      method: "POST",
      body: JSON.stringify({ qr_token: qrToken }),
    });
    return handleResponse<PackageAdminItem>(response);
  },

  previewLabel: async (file: File): Promise<PackageLabelPreview> => {
    const formData = new FormData();
    formData.append("label_image", file);

    const response = await fetchWithAuth(`${PACKAGES_URL}label-preview/`, {
      method: "POST",
      body: formData,
    });
    return handleResponse<PackageLabelPreview>(response);
  },

  getMyPackages: async (): Promise<SimplePackage[]> => {
    const response = await fetchWithAuth(`${PACKAGES_URL}me/`);
    const data = await handleResponse<PackageAdminItem[]>(response);
    return data.map(mapToSimplePackage);
  },

  getDeliveryQr: async (): Promise<{ token: string; expires_at?: string; resident_name?: string }> => {
    const response = await fetchWithAuth(`${PACKAGES_URL}me/delivery_qr/`);
    const data = await handleResponse<Record<string, unknown>>(response);
    const token = String(data.qr_token || data.token || "");

    return {
      token,
      expires_at: typeof data.expires_at === "string" ? data.expires_at : undefined,
      resident_name: typeof data.resident_name === "string" ? data.resident_name : undefined,
    };
  },

  getUnreadCount: async (): Promise<number> => {
    const response = await fetchWithAuth(`${PACKAGES_URL}me/unread_count/`);
    if (!response.ok) {
      return 0;
    }

    const data = await response.json().catch(() => ({}));
    return Number((data as { count?: number }).count || 0);
  },

  markAsViewed: async (): Promise<{ message: string; marked_count: number }> => {
    const response = await fetchWithAuth(`${PACKAGES_URL}me/mark_as_viewed/`, {
      method: "POST",
    });
    return handleResponse<{ message: string; marked_count: number }>(response);
  },
};
