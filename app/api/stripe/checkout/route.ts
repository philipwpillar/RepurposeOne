import { NextResponse } from "next/server";
import { z } from "zod";
import {
  isNativeApiRequest,
  nativePurchaseForbiddenResponse,
} from "@/lib/native-request";
import { getStripePriceId, stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const CheckoutRequestSchema = z.object({
  plan: z.enum(["creator", "pro", "pro_plus"]),
});

export async function POST(request: Request) {
  if (isNativeApiRequest(request)) {
    return nativePurchaseForbiddenResponse();
  }

  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = CheckoutRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join("; ") },
      { status: 400 }
    );
  }

  const { plan } = parsed.data;
  const origin = new URL(request.url).origin;

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .single();

  if (profileError) {
    console.error("Failed to fetch profile:", profileError);
    return NextResponse.json(
      { error: "Failed to load billing profile" },
      { status: 500 }
    );
  }

  let customerId = profile?.stripe_customer_id;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { supabase_user_id: user.id },
    });

    customerId = customer.id;

    const admin = createAdminClient();
    const { error: updateError } = await admin
      .from("profiles")
      .update({ stripe_customer_id: customerId })
      .eq("id", user.id);

    if (updateError) {
      console.error("Failed to save stripe_customer_id:", updateError);
      return NextResponse.json(
        { error: "Failed to set up billing account" },
        { status: 500 }
      );
    }
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: getStripePriceId(plan), quantity: 1 }],
    client_reference_id: user.id,
    metadata: { supabase_user_id: user.id },
    success_url: `${origin}/account?checkout=success`,
    cancel_url: `${origin}/account?checkout=cancelled`,
  });

  if (!session.url) {
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }

  return NextResponse.json({ url: session.url });
}
