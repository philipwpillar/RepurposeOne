import { NextResponse, type NextRequest } from "next/server";
import { isNativeUserAgent, NATIVE_HEADER } from "@/lib/native-ua";
import { updateSession } from "@/lib/supabase/middleware";

const HOLDING_BYPASS_COOKIE = "vo-preview";

/**
 * Paths that must never be rewritten by holding mode and never incur a
 * Supabase session round-trip. Each authenticates itself:
 *   /api/stripe/webhook - Stripe signature verification
 *   /api/cron           - CRON_SECRET bearer token
 *
 * Prefix-matched. Do not shorten to the stripe API root: that would also
 * expose checkout and portal, which must stay behind holding.
 */
const SESSION_EXEMPT_PREFIXES = ["/api/stripe/webhook", "/api/cron"];

const HOLDING_ALLOWLIST = [
  "/holding",
  "/auth/callback",
  "/api/cron", // redundant with SESSION_EXEMPT_PREFIXES; kept as belt-and-braces
  "/privacy",
  "/terms",
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

function withNativeHeader(request: NextRequest): Headers {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(
    NATIVE_HEADER,
    isNativeUserAgent(request.headers.get("user-agent")) ? "1" : "0"
  );
  return requestHeaders;
}

export async function middleware(request: NextRequest) {
  const requestHeaders = withNativeHeader(request);
  const { pathname } = request.nextUrl;

  if (SESSION_EXEMPT_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  if (process.env.HOLDING_MODE === "true") {
    const { searchParams } = request.nextUrl;
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
      // Rewrite still needs the native header on the request for RSC.
      const rewriteHeaders = withNativeHeader(request);
      const rewriteResponse = NextResponse.rewrite(new URL("/holding", request.url), {
        request: { headers: rewriteHeaders },
      });
      return rewriteResponse;
    }

    const res = await updateSession(request, requestHeaders);
    if (previewMatch && token) {
      res.cookies.set(HOLDING_BYPASS_COOKIE, token, BYPASS_COOKIE_OPTIONS);
    }
    return res;
  }

  return await updateSession(request, requestHeaders);
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
