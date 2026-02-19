export function formatBooleanEs(value: boolean): string {
  return value ? "Si" : "No";
}

export function formatDateTimeEs(value: Date | string, options: Intl.DateTimeFormatOptions = {}): string {
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat("es-ES", {
    dateStyle: "medium",
    timeStyle: "short",
    ...options,
  }).format(date);
}

export function formatNumberEs(value: number, options: Intl.NumberFormatOptions = {}): string {
  return new Intl.NumberFormat("es-ES", options).format(value);
}
