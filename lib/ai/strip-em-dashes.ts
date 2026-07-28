/**
 * Strip em/en dashes and horizontal bars from AI output strings.
 * Models often ignore "don't use em dashes"; post-process like stripOverlayEmoji.
 *
 * Spacing:
 * - `word—word` → `word - word`
 * - `word — word` → `word - word` (no double spaces)
 *
 * Only apply to model output — never to user `input_content`.
 */

const DASH_CHARS = /[—–―]/g;

export function stripEmDashesFromString(text: string): string {
  const replaced = text.replace(DASH_CHARS, (_match, offset: number, full: string) => {
    const before = offset > 0 ? full[offset - 1] : "";
    const after =
      offset + 1 < full.length ? full[offset + 1] : "";
    const leftSpace = before === " " || before === "\t";
    const rightSpace = after === " " || after === "\t";
    if (leftSpace && rightSpace) return "-";
    if (leftSpace) return "- ";
    if (rightSpace) return " -";
    return " - ";
  });
  // Collapse runs of regular spaces only — preserve newlines in email bodies.
  return replaced.replace(/ {2,}/g, " ");
}

/** Deep-walk JSON-like values; rewrite every string field. */
export function stripEmDashes<T>(value: T): T {
  if (typeof value === "string") {
    return stripEmDashesFromString(value) as T;
  }
  if (Array.isArray(value)) {
    return value.map((item) => stripEmDashes(item)) as T;
  }
  if (value !== null && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      out[key] = stripEmDashes(child);
    }
    return out as T;
  }
  return value;
}
