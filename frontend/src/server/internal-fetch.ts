import type { IncomingHttpHeaders } from "node:http";

import { getAccessTokenFromCookie, isJwtExpired } from "../lib/jwt";

const INTERNAL_API_BASE_URL = process.env.INTERNAL_API_BASE_URL || "http://backend:8000";
const JWT_ACCESS_COOKIE_NAME = process.env.JWT_ACCESS_COOKIE_NAME || "access_token";

export interface InternalApiRequestContext {
  host: string;
  protocol: string;
  headers: IncomingHttpHeaders;
}

export class InternalApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "InternalApiError";
    this.status = status;
  }
}

export async function internalApiFetch<T>(
  endpoint: string,
  context: InternalApiRequestContext,
  init: RequestInit = {}
): Promise<T> {
  const url = `${INTERNAL_API_BASE_URL}${endpoint}`;

  const cookieHeader = context.headers.cookie;
  const token = getAccessTokenFromCookie(cookieHeader, JWT_ACCESS_COOKIE_NAME);

  const headers = new Headers(init.headers || {});
  headers.set("Accept", "application/json");

  if (context.host) {
    headers.set("Host", context.host);
    headers.set("X-Forwarded-Host", context.host);
  }
  headers.set("X-Forwarded-Proto", context.protocol || "http");

  if (token && !isJwtExpired(token)) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(url, {
    ...init,
    headers,
  });

  if (!response.ok) {
    throw new InternalApiError(`Error llamando API interna (${response.status}): ${endpoint}`, response.status);
  }

  return (await response.json()) as T;
}
