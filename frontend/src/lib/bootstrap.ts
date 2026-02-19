import type { AppBootstrapData } from "../types/app";

function getFallbackBootstrapData(): AppBootstrapData {
  if (typeof window === "undefined") {
    return {
      tenantContext: null,
      userContext: null,
      requestHost: "",
      protocol: "http",
    };
  }

  return {
    tenantContext: null,
    userContext: null,
    requestHost: window.location.host,
    protocol: window.location.protocol.replace(":", "") || "http",
  };
}

function isBootstrapData(value: unknown): value is AppBootstrapData {
  if (!value || typeof value !== "object") return false;

  const data = value as Partial<AppBootstrapData>;
  return typeof data.requestHost === "string" && typeof data.protocol === "string";
}

export function readBootstrapData(): AppBootstrapData {
  const fallback = getFallbackBootstrapData();

  if (typeof document === "undefined") {
    return fallback;
  }

  const element = document.getElementById("__NEXUS_DATA__");
  if (!element?.textContent) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(element.textContent) as unknown;
    if (!isBootstrapData(parsed)) {
      return fallback;
    }

    return {
      tenantContext: parsed.tenantContext ?? null,
      userContext: parsed.userContext ?? null,
      requestHost: parsed.requestHost,
      protocol: parsed.protocol,
    };
  } catch {
    return fallback;
  }
}
