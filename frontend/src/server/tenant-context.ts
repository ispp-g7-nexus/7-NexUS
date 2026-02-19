import { InternalApiError, internalApiFetch, type InternalApiRequestContext } from "./internal-fetch";
import type { TenantContextPayload } from "../types/tenant";

export async function fetchTenantContext(
  context: InternalApiRequestContext
): Promise<TenantContextPayload | null> {
  try {
    return await internalApiFetch<TenantContextPayload>("/api/public/tenant-context/", context);
  } catch (error) {
    if (error instanceof InternalApiError && error.status === 404) {
      return null;
    }
    console.error("No se pudo cargar tenant-context:", error);
    return null;
  }
}
