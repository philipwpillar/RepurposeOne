import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

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

  if (!profile?.stripe_customer_id) {
    return NextResponse.json(
      { error: "No billing account found — subscribe to a plan first" },
      { status: 400 }
    );
  }

  const origin = new URL(request.url).origin;

  const session = await stripe.billingPortal.sessions.create({
    customer: profile.stripe_customer_id,
    return_url: `${origin}/account`,
  });

  return NextResponse.json({ url: session.url });
}
