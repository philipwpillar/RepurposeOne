import { createServerClient, type SetAllCookies } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { safeRedirectUrl } from "@/lib/safe-redirect";

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/studio",
  "/library",
  "/brand-voice",
  "/billing",
  "/account",
  "/bundles",
  "/onboarding",
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

/**
 * Optional `requestHeaders` must be forwarded on every `NextResponse.next`
 * construction (initial + cookie setAll) or custom headers never reach RSC.
 */
export async function updateSession(
  request: NextRequest,
  requestHeaders?: Headers
) {
  const nextOpts = requestHeaders
    ? { request: { headers: requestHeaders } }
    : { request };

  let supabaseResponse = NextResponse.next(nextOpts);

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
          supabaseResponse = NextResponse.next(nextOpts);
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
