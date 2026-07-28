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

export async function middleware(request: NextRequest) {
  if (process.env.HOLDING_MODE === "true") {
    const { pathname, searchParams } = request.nextUrl;
    const token = process.env.HOLDING_BYPASS_TOKEN;

    // One-time bypass: /?preview=<token> sets a cookie, then strips the param.
    if (token && searchParams.get("preview") === token) {
      const url = request.nextUrl.clone();
      url.searchParams.delete("preview");
      const res = NextResponse.redirect(url);
      res.cookies.set(HOLDING_BYPASS_COOKIE, token, {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 30,
        path: "/",
      });
      return res;
    }

    const bypassed =
      Boolean(token) &&
      request.cookies.get(HOLDING_BYPASS_COOKIE)?.value === token;
    const allowed = HOLDING_ALLOWLIST.some((p) => pathname.startsWith(p));

    if (!bypassed && !allowed) {
      return NextResponse.rewrite(new URL("/holding", request.url));
    }
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
