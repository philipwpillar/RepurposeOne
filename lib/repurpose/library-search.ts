const SEARCH_MIN = 2;
const SEARCH_MAX = 100;

/**
 * Strip ILIKE wildcards from user input so patterns cannot be injected.
 * Prefer stripping over backslash-escaping (Postgres needs ESCAPE for `\`).
 */
export function sanitizeIlikeTerm(value: string): string {
  return value.replace(/[%_]/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Parse and validate Library `?q=` search.
 * Returns null for empty / too-short / invalid values (treated as no search).
 */
export function parseLibrarySearchQuery(
  value: string | undefined
): string | null {
  if (!value) return null;
  const trimmed = sanitizeIlikeTerm(value.trim());
  if (trimmed.length < SEARCH_MIN) return null;
  if (trimmed.length > SEARCH_MAX) {
    return trimmed.slice(0, SEARCH_MAX);
  }
  return trimmed;
}
