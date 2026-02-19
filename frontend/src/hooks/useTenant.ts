import { useCallback, useState } from "react";

import { useAppData } from "../providers/AppDataProvider";
import type { TenantContextPayload } from "../types/tenant";

export function useTenant() {
  const { tenantContext, setTenantContext } = useAppData();
  const [loading, setLoading] = useState(false);

  const refreshTenant = useCallback(async () => {
    if (typeof window === "undefined") return tenantContext;

    setLoading(true);
    try {
      const response = await fetch("/api/public/tenant-context/", {
        headers: { Accept: "application/json" },
      });
      if (!response.ok) {
        return tenantContext;
      }

      const data = (await response.json()) as TenantContextPayload;
      setTenantContext(data);
      return data;
    } finally {
      setLoading(false);
    }
  }, [tenantContext, setTenantContext]);

  return {
    tenantContext,
    tenant: tenantContext?.tenant || null,
    residence: tenantContext?.residence || null,
    hasWhitelabel: Boolean(tenantContext?.tenant.can_use_whitelabel),
    loading,
    refreshTenant,
  };
}
