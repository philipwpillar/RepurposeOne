import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const HOLDING_BYPASS_COOKIE = "vo-preview";

const HOLDING_ALLOWLIST = [
  "/holding",
  "/auth/callback",
  "/api/cron",
  "/opengraph-image",
  "/twitter-image",
  "/icon",
  "/apple-icon",
  "/robots.txt",
  "/sitemap.xml",
  "/manifest.webmanifest",
];

const BYPASS_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: true,
  sameSite: "lax" as const,
  maxAge: 60 * 60 * 24 * 30,
  path: "/",
};

export async function middleware(request: NextRequest) {
  if (process.env.HOLDING_MODE === "true") {
    const { pathname, searchParams } = request.nextUrl;
    const token = process.env.HOLDING_BYPASS_TOKEN;

    // Query-param bypass must NOT use a 3xx redirect to set the cookie.
    // WKWebView (Capacitor) often drops Set-Cookie on redirect responses, so
    // the follow-up request has no vo-preview cookie and lands on /holding.
    const previewMatch = Boolean(
      token && searchParams.get("preview") === token
    );
    const cookieMatch =
      Boolean(token) &&
      request.cookies.get(HOLDING_BYPASS_COOKIE)?.value === token;
    const bypassed = previewMatch || cookieMatch;
    const allowed = HOLDING_ALLOWLIST.some((p) => pathname.startsWith(p));

    if (!bypassed && !allowed) {
      return NextResponse.rewrite(new URL("/holding", request.url));
    }

    const res = await updateSession(request);
    if (previewMatch && token) {
      res.cookies.set(HOLDING_BYPASS_COOKIE, token, BYPASS_COOKIE_OPTIONS);
    }
    return res;
  }

  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static files and images.
     * API routes are included so auth cookies refresh on generate calls.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
