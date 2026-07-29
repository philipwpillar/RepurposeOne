"use client";

import { App } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isNativePlatform } from "@/lib/platform";

/** Must match CFBundleURLTypes in ios/App/App/Info.plist and Supabase redirect allowlist. */
export const NATIVE_OAUTH_REDIRECT = "com.voiceora.io://auth/callback";

/**
 * PKCE verifier is written by signInWithOAuth inside the Capacitor webview
 * (server.url: https://voiceora.io). Exchange must happen in that same webview
 * so @supabase/ssr cookies land on voiceora.io — not via app/auth/callback/route.ts
 * and not inside SFSafariViewController alone.
 */
export async function startNativeGoogleOAuth(
  supabase: SupabaseClient,
  nextPath: string
): Promise<{ error?: string }> {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${NATIVE_OAUTH_REDIRECT}?next=${encodeURIComponent(nextPath)}`,
      skipBrowserRedirect: true,
    },
  });

  if (error) return { error: error.message };
  if (!data.url) return { error: "Google sign-in did not return a URL." };

  await Browser.open({ url: data.url });
  return {};
}

export function parseNativeOAuthCallbackUrl(rawUrl: string): {
  code: string | null;
  next: string;
} {
  try {
    const url = new URL(rawUrl);
    const code = url.searchParams.get("code");
    const next = url.searchParams.get("next") ?? "/dashboard";
    const safeNext = next.startsWith("/") ? next : "/dashboard";
    return { code, next: safeNext };
  } catch {
    return { code: null, next: "/dashboard" };
  }
}

export type NativeOAuthExchangeHandler = (
  code: string,
  nextPath: string
) => Promise<void>;

let exchangeHandler: NativeOAuthExchangeHandler | null = null;

export function setNativeOAuthExchangeHandler(
  handler: NativeOAuthExchangeHandler | null
) {
  exchangeHandler = handler;
}

export function registerNativeOAuthDeepLinkListener(): () => void {
  if (!isNativePlatform()) return () => {};

  const listenerPromise = App.addListener("appUrlOpen", async ({ url }) => {
    if (!url.startsWith(NATIVE_OAUTH_REDIRECT)) return;
    if (!exchangeHandler) return;

    const { code, next } = parseNativeOAuthCallbackUrl(url);
    if (!code) return;

    await Browser.close().catch(() => undefined);
    await exchangeHandler(code, next);
  });

  return () => {
    void listenerPromise.then((handle) => handle.remove());
  };
}
