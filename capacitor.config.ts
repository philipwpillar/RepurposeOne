import type { CapacitorConfig } from "@capacitor/cli";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Capacitor CLI does not load Next.js `.env.local`. Pull CAPACITOR_* /
 * HOLDING_BYPASS_TOKEN from that file for local `npx cap sync` only.
 * Never commit secrets — `.env.local` is gitignored.
 */
function loadEnvLocal() {
  const path = resolve(process.cwd(), ".env.local");
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

loadEnvLocal();

/** Canonical production host (apex voiceora.io 308s here). */
const PRODUCTION_ORIGIN = "https://www.voiceora.io";

/**
 * Resolve the remote WebView URL for local / TestFlight-internal builds.
 *
 * - Default: https://www.voiceora.io (App Store / production shell)
 * - CAPACITOR_SERVER_URL: point at a Vercel Preview (no HOLDING_MODE) for local testing
 * - HOLDING_BYPASS_TOKEN / CAPACITOR_HOLDING_BYPASS_TOKEN: when the base host is
 *   voiceora.io / www.voiceora.io, append ?preview=<token> so the first load sets
 *   the vo-preview cookie and the shell skips the holding page
 *
 * Unset bypass env vars before any App Store / external TestFlight archive so
 * the binary does not embed the preview token in server.url.
 */
function resolveServerUrl(): string {
  const raw = (
    process.env.CAPACITOR_SERVER_URL?.trim() || PRODUCTION_ORIGIN
  ).replace(/\/$/, "");

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return PRODUCTION_ORIGIN;
  }

  const token = (
    process.env.CAPACITOR_HOLDING_BYPASS_TOKEN ||
    process.env.HOLDING_BYPASS_TOKEN ||
    ""
  ).trim();

  const isProductionHost =
    url.hostname === "voiceora.io" || url.hostname === "www.voiceora.io";

  if (token && isProductionHost && !url.searchParams.has("preview")) {
    url.searchParams.set("preview", token);
  }

  // Keep a clean origin for production default; keep query when bypass is set.
  if (url.pathname === "/" && !url.search && !url.hash) {
    return url.origin;
  }
  return url.toString();
}

const resolvedUrl = resolveServerUrl();
const resolvedIsHttp = resolvedUrl.startsWith("http://");

const config: CapacitorConfig = {
  appId: "com.voiceora.io",
  appName: "Voiceora",
  webDir: "public",
  server: {
    url: resolvedUrl,
    // Required for CAPACITOR_SERVER_URL=http://localhost:3000 local debug.
    cleartext: resolvedIsHttp,
    // Keep apex + www in-app (production 308s apex → www). Include localhost for Cap→Next local debug.
    allowNavigation: [
      "voiceora.io",
      "www.voiceora.io",
      "*.voiceora.io",
      "localhost",
      "127.0.0.1",
    ],
  },
  // Server-visible identity for App Store 3.1.3(f) purchase-surface strip.
  // Token must match NATIVE_UA_TOKEN in lib/native-request.ts.
  ios: {
    appendUserAgent: "VoiceoraiOS/1",
  },
};

export default config;
