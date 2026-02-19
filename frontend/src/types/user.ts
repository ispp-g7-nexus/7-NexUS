export interface UserContextData {
  id: string;
  username: string;
  email: string;
  roles: string[];
  exp: number | null;
  raw: Record<string, unknown>;
}

export interface AuthMeResponse {
  authenticated: boolean;
  user: UserContextData | null;
}

export type PortalType = "student" | "admin";

export interface LoginRequestPayload {
  email: string;
  password: string;
  portal: PortalType;
}

export interface LoginResponsePayload {
  ok: boolean;
  portal: PortalType;
  detail?: string;
}

export interface LogoutResponsePayload {
  ok: boolean;
  detail?: string;
}
