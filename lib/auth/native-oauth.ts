"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { isNativePlatform } from "@/lib/platform";

/** Must match CFBundleURLTypes in ios/App/App/Info.plist and Supabase redirect allowlist. */
export const NATIVE_OAUTH_REDIRECT = "com.voiceora.io://auth/callback";

/**
 * PKCE verifier is written by signInWithOAuth inside the Capacitor webview
 * (server.url: https://voiceora.io). Exchange must happen in that same webview
 * so @supabase/ssr cookies land on voiceora.io — not via app/auth/callback/route.ts
 * and not inside SFSafariViewController alone.
 *
 * Capacitor plugins are dynamic-imported (see lib/haptics.ts) so public auth
 * pages never ship a static native dependency into the web bundle.
 */
export async function startNativeGoogleOAuth(
  supabase: SupabaseClient,
  nextPath: string
): Promise<{ error?: string }> {
  pendingNextPath = nextPath.startsWith("/") ? nextPath : "/dashboard";

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      // Bare URL — no query string — so Supabase allowlist matches exactly.
      redirectTo: NATIVE_OAUTH_REDIRECT,
      skipBrowserRedirect: true,
    },
  });

  if (error) return { error: error.message };
  if (!data.url) return { error: "Google sign-in did not return a URL." };

  const { Browser } = await import("@capacitor/browser");
  await Browser.open({ url: data.url });
  return {};
}

export function parseNativeOAuthCallbackUrl(rawUrl: string): {
  code: string | null;
} {
  try {
    const url = new URL(rawUrl);
    return { code: url.searchParams.get("code") };
  } catch {
    return { code: null };
  }
}

export type NativeOAuthExchangeHandler = (
  code: string,
  nextPath: string
) => Promise<void>;

let exchangeHandler: NativeOAuthExchangeHandler | null = null;
let pendingNextPath = "/dashboard";

export function setNativeOAuthExchangeHandler(
  handler: NativeOAuthExchangeHandler | null
) {
  exchangeHandler = handler;
}

export function registerNativeOAuthDeepLinkListener(): () => void {
  if (!isNativePlatform()) return () => {};

  let remove: (() => void) | null = null;
  let cancelled = false;

  void (async () => {
    const { App } = await import("@capacitor/app");
    const { Browser } = await import("@capacitor/browser");

    const handle = await App.addListener("appUrlOpen", async ({ url }) => {
      if (!url.startsWith(NATIVE_OAUTH_REDIRECT)) return;
      if (!exchangeHandler) return;

      const { code } = parseNativeOAuthCallbackUrl(url);
      if (!code) return;

      await Browser.close().catch(() => undefined);
      await exchangeHandler(code, pendingNextPath);
    });

    if (cancelled) {
      await handle.remove();
      return;
    }
    remove = () => {
      void handle.remove();
    };
  })();

  return () => {
    cancelled = true;
    remove?.();
  };
}
