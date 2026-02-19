import { decodeJwtPayload } from "./jwt";
import type { UserContextData } from "../types/user";

function getFirstString(claims: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = claims[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value;
    }
  }
  return "";
}

function getRoles(claims: Record<string, unknown>): string[] {
  const rawRoles = claims.roles ?? claims.role ?? claims.groups;

  if (Array.isArray(rawRoles)) {
    return rawRoles.filter((item): item is string => typeof item === "string");
  }

  if (typeof rawRoles === "string") {
    return [rawRoles];
  }

  return [];
}

export function buildUserContextFromClaims(claims: Record<string, unknown>): UserContextData {
  const id = getFirstString(claims, ["user_id", "sub", "id"]) || "anon";
  const email = getFirstString(claims, ["email"]);
  const username =
    getFirstString(claims, ["username", "preferred_username", "name"]) ||
    (email ? email.split("@")[0] : "usuario");
  const exp = typeof claims.exp === "number" ? claims.exp : null;

  return {
    id,
    username,
    email,
    roles: getRoles(claims),
    exp,
    raw: claims,
  };
}

export function buildUserContextFromToken(token: string): UserContextData | null {
  const claims = decodeJwtPayload<Record<string, unknown>>(token);
  if (!claims) return null;

  return buildUserContextFromClaims(claims);
}
