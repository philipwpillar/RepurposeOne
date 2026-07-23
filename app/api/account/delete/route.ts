import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const BUNDLE_MEDIA_BUCKET = "bundle-media";

type DeleteAccountBody = {
  confirmation?: string;
};

/**
 * POST /api/account/delete
 *
 * Ordered: load Stripe + storage paths → cancel subs → delete storage →
 * auth.admin.deleteUser (DB cascades) → client signs out.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { error: "Authentication required", code: "unauthorized" },
      { status: 401 }
    );
  }

  let body: DeleteAccountBody = {};
  try {
    body = (await request.json()) as DeleteAccountBody;
  } catch {
    // empty body ok if confirmation missing — still 400 below
  }

  if (body.confirmation !== "DELETE") {
    return NextResponse.json(
      {
        error: 'Type DELETE to confirm account deletion',
        code: "validation_error",
      },
      { status: 400 }
    );
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch (err) {
    console.error("Admin client unavailable for account delete:", err);
    return NextResponse.json(
      { error: "Account deletion is not configured", code: "internal_error" },
      { status: 500 }
    );
  }

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("stripe_customer_id, stripe_subscription_id")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error("Failed to load profile for deletion:", profileError);
    return NextResponse.json(
      { error: "Failed to load account", code: "internal_error" },
      { status: 500 }
    );
  }

  const { data: assets } = await admin
    .from("bundle_assets")
    .select("storage_path")
    .eq("user_id", user.id);

  const { data: clips } = await admin
    .from("bundle_clips")
    .select("output_storage_path")
    .eq("user_id", user.id);

  const storagePaths = [
    ...new Set(
      [
        ...(assets ?? []).map((a) => a.storage_path as string | null),
        ...(clips ?? []).map((c) => c.output_storage_path as string | null),
      ].filter((p): p is string => Boolean(p))
    ),
  ];

  // Cancel Stripe subscriptions before deleting the user
  const customerId = profile?.stripe_customer_id ?? null;
  const subscriptionId = profile?.stripe_subscription_id ?? null;
  let cleanupStarted = false;

  try {
    if (subscriptionId) {
      try {
        const sub = await stripe.subscriptions.retrieve(subscriptionId);
        if (sub.status === "active" || sub.status === "trialing" || sub.status === "past_due") {
          await stripe.subscriptions.cancel(subscriptionId);
          cleanupStarted = true;
        }
      } catch (err) {
        console.error("Failed to cancel profile subscription:", err);
      }
    }

    if (customerId) {
      const list = await stripe.subscriptions.list({
        customer: customerId,
        status: "all",
        limit: 100,
      });
      for (const sub of list.data) {
        if (
          sub.status === "active" ||
          sub.status === "trialing" ||
          sub.status === "past_due"
        ) {
          try {
            await stripe.subscriptions.cancel(sub.id);
            cleanupStarted = true;
          } catch (err) {
            console.error(`Failed to cancel subscription ${sub.id}:`, err);
          }
        }
      }
    }
  } catch (err) {
    console.error("Stripe cancellation during account delete failed:", err);
    // Continue — do not block GDPR deletion on Stripe errors
  }

  // Delete private media before auth user (paths live on DB rows)
  if (storagePaths.length > 0) {
    cleanupStarted = true;
    const chunkSize = 100;
    for (let i = 0; i < storagePaths.length; i += chunkSize) {
      const chunk = storagePaths.slice(i, i + chunkSize);
      const { error: storageError } = await admin.storage
        .from(BUNDLE_MEDIA_BUCKET)
        .remove(chunk);
      if (storageError) {
        console.error("bundle-media delete failures:", storageError.message, chunk.length);
      }
    }
  }

  const { error: deleteUserError } = await admin.auth.admin.deleteUser(user.id);
  if (deleteUserError) {
    console.error("auth.admin.deleteUser failed:", deleteUserError);
    if (cleanupStarted) {
      return NextResponse.json(
        {
          error:
            "Billing and media cleanup may already have run, but we couldn't finish deleting your login. Retry deletion — if it keeps failing, contact support@voiceora.io.",
          code: "deletion_incomplete",
        },
        { status: 500 }
      );
    }
    return NextResponse.json(
      { error: "Failed to delete account", code: "internal_error" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
