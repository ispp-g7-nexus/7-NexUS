import type {
  LoginRequestPayload,
  LoginResponsePayload,
  LogoutResponsePayload,
} from "../types/user";

interface AuthResult {
  ok: boolean;
  detail?: string;
}

async function parseAuthJson<T>(response: Response): Promise<T | null> {
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    return null;
  }

  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export async function loginWithPassword(payload: LoginRequestPayload): Promise<AuthResult> {
  const response = await fetch("/api/auth/login/", {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await parseAuthJson<LoginResponsePayload & { detail?: string }>(response);
  if (!response.ok) {
    return {
      ok: false,
      detail: data?.detail || "No se pudo iniciar sesion.",
    };
  }

  return {
    ok: Boolean(data?.ok),
    detail: data?.detail || "Login correcto.",
  };
}

export async function logoutSession(): Promise<AuthResult> {
  const response = await fetch("/api/auth/logout/", {
    method: "POST",
    credentials: "include",
    headers: {
      Accept: "application/json",
    },
  });

  const data = await parseAuthJson<LogoutResponsePayload>(response);
  if (!response.ok) {
    return {
      ok: false,
      detail: data?.detail || "No se pudo cerrar sesion.",
    };
  }

  return {
    ok: Boolean(data?.ok),
    detail: data?.detail || "Sesion cerrada.",
  };
}
