/** Substring Capacitor appends to the WKWebView user-agent (see capacitor.config.ts). */
export const NATIVE_UA_TOKEN = "VoiceoraiOS";

/** Request header set by middleware so server components can detect the iOS shell. */
export const NATIVE_HEADER = "x-vo-native";

export function isNativeUserAgent(ua: string | null): boolean {
  return Boolean(ua && ua.includes(NATIVE_UA_TOKEN));
}
