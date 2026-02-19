export interface TenantPlan {
  code: string;
  name: string;
  max_residences: number;
  allows_whitelabel: boolean;
}

export interface TenantData {
  id: number;
  schema_name: string;
  name: string;
  slug: string;
  is_active: boolean;
  plan: TenantPlan | null;
  whitelabel_enabled: boolean;
  can_use_whitelabel: boolean;
  metadata: Record<string, unknown>;
}

export interface ResidenceBrandingData {
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  logo_url: string;
  favicon_url: string;
  custom_css: string;
}

export interface ResidenceData {
  id: number;
  name: string;
  slug: string;
  code: string;
  timezone: string;
  is_active: boolean;
  branding: ResidenceBrandingData | null;
}

export interface TenantContextPayload {
  domain: string;
  tenant: TenantData;
  residence: ResidenceData | null;
}
