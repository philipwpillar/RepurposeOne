"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  registerNativeOAuthDeepLinkListener,
  setNativeOAuthExchangeHandler,
} from "@/lib/auth/native-oauth";
import { safeRedirectPath } from "@/lib/safe-redirect";

/** Mount once on auth (and app) surfaces so native Google OAuth can complete PKCE. */
export function NativeOAuthListener() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();

    setNativeOAuthExchangeHandler(async (code, nextPath) => {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) return;
      router.push(safeRedirectPath(nextPath));
      router.refresh();
    });

    const removeListener = registerNativeOAuthDeepLinkListener();

    return () => {
      setNativeOAuthExchangeHandler(null);
      removeListener();
    };
  }, [router]);

  return null;
}
