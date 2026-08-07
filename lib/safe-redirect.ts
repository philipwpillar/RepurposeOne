/**
 * Resolve a user-supplied redirect to a same-origin path.
 *
 * Rejects protocol-relative URLs (`//evil.com`), absolute URLs, and paths
 * that normalize to another origin. Prefer returning a path string for
 * `router.push`; use {@link safeRedirectUrl} when you need a full URL.
 */
export function safeRedirectPath(
  candidate: string | null | undefined,
  fallback = "/dashboard"
): string {
  if (!candidate || !candidate.startsWith("/") || candidate.startsWith("//")) {
    return fallback;
  }

  try {
    const resolved = new URL(candidate, "https://voiceora.invalid");
    if (resolved.origin !== "https://voiceora.invalid") return fallback;
    if (resolved.pathname.startsWith("//")) return fallback;
    return `${resolved.pathname}${resolved.search}${resolved.hash}`;
  } catch {
    return fallback;
  }
}

/**
 * Resolve a user-supplied `redirect` / `next` param to a same-origin URL.
 *
 * Returns a URL (not a string) deliberately: returning a path string and
 * letting the caller re-resolve it reintroduces the bug — `/..//evil.com`
 * normalises to pathname `//evil.com`, which passes an origin check here
 * and then becomes protocol-relative at `new URL(dest, base)`.
 */
export function safeRedirectUrl(
  candidate: string | null,
  requestUrl: string,
  origin: string
): URL {
  const fallback = new URL("/dashboard", requestUrl);
  const path = safeRedirectPath(candidate, "/dashboard");

  try {
    const resolved = new URL(path, requestUrl);
    if (resolved.origin !== origin) return fallback;
    if (resolved.pathname.startsWith("//")) return fallback;
    return resolved;
  } catch {
    return fallback;
  }
}
