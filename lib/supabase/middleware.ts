import { createServerClient, type SetAllCookies } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/studio",
  "/library",
  "/brand-voice",
  "/billing",
  "/account",
];
const AUTH_ROUTES = ["/sign-in", "/sign-up"];

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

function isAuthPath(pathname: string): boolean {
  return AUTH_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
}

/** Same-origin redirect only — return a resolved URL so callers never re-resolve. */
function safeRedirectUrl(
  candidate: string | null,
  requestUrl: string,
  origin: string
): URL {
  const fallback = new URL("/dashboard", requestUrl);
  if (!candidate || !candidate.startsWith("/") || candidate.startsWith("//")) {
    return fallback;
  }
  try {
    const resolved = new URL(candidate, requestUrl);
    if (resolved.origin !== origin) return fallback;
    // After normalisation, pathname can become "//evil.com" while origin still matches.
    if (resolved.pathname.startsWith("//")) return fallback;
    return resolved;
  } catch {
    return fallback;
  }
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: Parameters<SetAllCookies>[0]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  if (isProtectedPath(pathname) && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/sign-in";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  if (isAuthPath(pathname) && user) {
    return NextResponse.redirect(
      safeRedirectUrl(
        request.nextUrl.searchParams.get("redirect"),
        request.url,
        request.nextUrl.origin
      )
    );
  }

  return supabaseResponse;
}
