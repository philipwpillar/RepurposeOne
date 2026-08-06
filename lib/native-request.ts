import { headers } from "next/headers";
import { NextResponse } from "next/server";
import {
  isNativeUserAgent,
  NATIVE_HEADER,
} from "@/lib/native-ua";

export {
  NATIVE_HEADER,
  NATIVE_UA_TOKEN,
  isNativeUserAgent,
} from "@/lib/native-ua";

export async function isNativeRequest(): Promise<boolean> {
  return (await headers()).get(NATIVE_HEADER) === "1";
}

/**
 * True when the request came from the Capacitor iOS shell.
 * Prefer the middleware stamp; fall back to UA so API routes stay safe
 * even if the header is missing.
 */
export function isNativeApiRequest(request: Request): boolean {
  const stamped = request.headers.get(NATIVE_HEADER);
  if (stamped === "1") return true;
  if (stamped === "0") return false;
  return isNativeUserAgent(request.headers.get("user-agent"));
}

/** App Store 3.1.3(f): no Stripe Checkout / Billing Portal from the iOS app. */
export function nativePurchaseForbiddenResponse(): NextResponse {
  return NextResponse.json(
    { error: "Purchases are not available in the iOS app" },
    { status: 403 }
  );
}
