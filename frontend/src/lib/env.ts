export function getEnv(name: string, fallback = ""): string {
  if (typeof process !== "undefined" && process.env?.[name]) {
    return process.env[name] as string;
  }

  if (typeof import.meta !== "undefined" && (import.meta as ImportMeta & { env?: Record<string, string> }).env?.[name]) {
    return (import.meta as ImportMeta & { env?: Record<string, string> }).env?.[name] as string;
  }

  return fallback;
}
