import { InternalApiError, internalApiFetch, type InternalApiRequestContext } from "./internal-fetch";
import type { AuthMeResponse, UserContextData } from "../types/user";

export async function fetchUserContext(
  context: InternalApiRequestContext
): Promise<UserContextData | null> {
  try {
    const response = await internalApiFetch<AuthMeResponse>("/api/auth/me/", context);
    return response.authenticated ? response.user : null;
  } catch (error) {
    if (error instanceof InternalApiError && (error.status === 401 || error.status === 403 || error.status === 404)) {
      return null;
    }
    console.error("No se pudo cargar user-context:", error);
    return null;
  }
}
