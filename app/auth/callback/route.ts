import { NextResponse } from "next/server";
import { safeRedirectUrl } from "@/lib/safe-redirect";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const { searchParams, origin } = url;
  const code = searchParams.get("code");
  const next = searchParams.get("next");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(safeRedirectUrl(next, request.url, origin));
    }
  }

  return NextResponse.redirect(
    `${origin}/sign-in?error=Could not authenticate. Please try again.`
  );
}
