import { fetchWithAuth } from "../utils/api";
import { trackEvent } from "./analytics";

const BRANDING_URL = "/api/residences/branding/";

export interface ResidenceBranding {
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  logo_url: string;
  favicon_url: string;
  custom_css: string;
  updated_at: string;
}

export interface UpdateResidenceBrandingPayload {
  primary_color?: string;
  secondary_color?: string;
  accent_color?: string;
  logo_url?: string;
  favicon_url?: string;
  custom_css?: string;
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error((body as { detail?: string }).detail || `Error ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export const brandingService = {
  get: async (): Promise<ResidenceBranding> => {
    const response = await fetchWithAuth(BRANDING_URL);
    return handleResponse<ResidenceBranding>(response);
  },

  update: async (payload: UpdateResidenceBrandingPayload): Promise<ResidenceBranding> => {
    const response = await fetchWithAuth(BRANDING_URL, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
    const result = await handleResponse<ResidenceBranding>(response);
    trackEvent('branding_updated');
    return result;
  },
};
