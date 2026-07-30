/**
 * Normalize pasted article URLs before SSRF checks / fetch.
 * Users often paste host paths without a scheme, or wrap links in <> / quotes.
 */
export function normalizeIngestUrl(raw: string): string {
  let value = raw.trim();
  if (!value) return value;

  // Strip common paste wrappers: <https://…>, "https://…", 'https://…'
  if (
    (value.startsWith("<") && value.endsWith(">")) ||
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1).trim();
  }

  // Already has a scheme (http:, https:, etc.)
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(value)) {
    return value;
  }

  // Protocol-relative //example.com/path
  if (value.startsWith("//")) {
    return `https:${value}`;
  }

  // Bare host or www.… path — default to https
  return `https://${value}`;
}
