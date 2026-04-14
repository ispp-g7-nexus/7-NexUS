export const REASON_PREVIEW_CHARS = 140;
export const ADMIN_CANCELLATION_REASON_MAX_LENGTH = 200;

export function formatDateTime(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("es-ES", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function normalizeReasonText(value: string): string {
  const normalizedLines = value
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trimEnd());

  const compactLines: string[] = [];
  let previousWasBlank = false;

  for (const line of normalizedLines) {
    const isBlank = line.trim().length === 0;
    if (isBlank) {
      if (!previousWasBlank) {
        compactLines.push("");
      }
      previousWasBlank = true;
      continue;
    }

    compactLines.push(line);
    previousWasBlank = false;
  }

  return compactLines.join("\n").trim();
}

export function buildReasonPreview(value: string, maxChars: number): string {
  if (value.length <= maxChars) {
    return value;
  }
  return `${value.slice(0, maxChars).trimEnd()}...`;
}
