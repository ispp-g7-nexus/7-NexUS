import type { TenantContextPayload } from "./tenant";
import type { UserContextData } from "./user";

export interface AppBootstrapData {
  tenantContext: TenantContextPayload | null;
  userContext: UserContextData | null;
  requestHost: string;
  protocol: string;
}
