/**
 * Share intent helpers for X and LinkedIn.
 *
 * LinkedIn's `shareActive=true` feed URL parameter is widely used but not
 * formally documented by LinkedIn; the copy-then-open fallback is the safety
 * net if it breaks or if the encoded URL exceeds a safe length.
 */

const LINKEDIN_FEED_URL = "https://www.linkedin.com/feed/";
const LINKEDIN_INTENT_MAX_LENGTH = 1900;

export function buildXIntentUrl(text: string): string {
  return `https://x.com/intent/post?text=${encodeURIComponent(text)}`;
}

export function buildLinkedInShareUrl(text: string): string {
  return `${LINKEDIN_FEED_URL}?shareActive=true&text=${encodeURIComponent(text)}`;
}

/** False when the encoded LinkedIn intent URL would exceed ~1,900 chars. */
export function canUseLinkedInIntent(text: string): boolean {
  return buildLinkedInShareUrl(text).length <= LINKEDIN_INTENT_MAX_LENGTH;
}

export function linkedInFeedUrl(): string {
  return LINKEDIN_FEED_URL;
}

/**
 * True when running inside the Capacitor native shell.
 * Uses the Cap global (injected on native) so the web bundle does not need a
 * static `@capacitor/core` import on this path.
 */
export function isNativeShareAvailable(): boolean {
  if (typeof window === "undefined") return false;
  const Cap = (
    window as Window & {
      Capacitor?: { isNativePlatform?: () => boolean };
    }
  ).Capacitor;
  return Cap?.isNativePlatform?.() === true;
}
