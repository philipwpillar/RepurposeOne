import { NextResponse } from "next/server";
import type Stripe from "stripe";
import {
  isActiveSubscriptionStatus,
  planFromSubscription,
  stripe,
} from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Plan } from "@/types";

type ProfileBillingUpdates = {
  stripe_customer_id?: string;
  stripe_subscription_id?: string | null;
  plan?: Plan;
  payment_failed_at?: string | null;
  payment_failed_invoice_id?: string | null;
};

function getSupabaseUserId(session: Stripe.Checkout.Session): string | null {
  return session.client_reference_id ?? session.metadata?.supabase_user_id ?? null;
}

function getStripeCustomerId(
  customer: string | Stripe.Customer | Stripe.DeletedCustomer | null
): string | null {
  if (!customer) return null;
  return typeof customer === "string" ? customer : customer.id;
}

async function updateProfileByUserId(
  userId: string,
  updates: ProfileBillingUpdates
) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .update(updates)
    .eq("id", userId)
    .select("id");

  if (error) {
    console.error(`Failed to update profile for user ${userId}:`, error);
    throw error;
  }

  if (!data?.length) {
    console.info(
      `updateProfileByUserId: no profile for user ${userId} (already deleted?)`
    );
  }
}

async function updateProfileByCustomerId(
  customerId: string,
  updates: ProfileBillingUpdates
) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .update(updates)
    .eq("stripe_customer_id", customerId)
    .select("id");

  if (error) {
    console.error(`Failed to update profile for customer ${customerId}:`, error);
    throw error;
  }

  if (!data?.length) {
    console.info(
      `updateProfileByCustomerId: no profile for customer ${customerId} (already deleted?)`
    );
  }
}

async function clearPaymentFailedIfInvoiceMatches(
  customerId: string,
  invoiceId: string
) {
  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({
      payment_failed_at: null,
      payment_failed_invoice_id: null,
    })
    .eq("stripe_customer_id", customerId)
    .eq("payment_failed_invoice_id", invoiceId);

  if (error) {
    console.error(
      `Failed to clear payment failure for customer ${customerId}:`,
      error
    );
    throw error;
  }
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  const userId = getSupabaseUserId(session);
  if (!userId) {
    console.error("checkout.session.completed: missing supabase_user_id");
    return;
  }

  const customerId = getStripeCustomerId(session.customer);
  const subscriptionId =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription?.id;

  if (!subscriptionId) {
    console.error("checkout.session.completed: missing subscription id");
    return;
  }

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const plan = planFromSubscription(subscription);

  if (!plan) {
    console.error(
      "checkout.session.completed: unknown price id",
      subscription.items.data[0]?.price.id
    );
    return;
  }

  await updateProfileByUserId(userId, {
    ...(customerId ? { stripe_customer_id: customerId } : {}),
    stripe_subscription_id: subscriptionId,
    plan,
    payment_failed_at: null,
    payment_failed_invoice_id: null,
  });
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const customerId = getStripeCustomerId(subscription.customer);
  if (!customerId) return;

  if (isActiveSubscriptionStatus(subscription.status)) {
    const plan = planFromSubscription(subscription);
    if (!plan) {
      console.error(
        "customer.subscription.updated: unknown price id",
        subscription.items.data[0]?.price.id
      );
      return;
    }

    await updateProfileByCustomerId(customerId, {
      stripe_subscription_id: subscription.id,
      plan,
      payment_failed_at: null,
      payment_failed_invoice_id: null,
    });
    return;
  }

  if (
    subscription.status === "canceled" ||
    subscription.status === "unpaid" ||
    subscription.status === "incomplete_expired"
  ) {
    await updateProfileByCustomerId(customerId, {
      plan: "free",
    });
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId = getStripeCustomerId(subscription.customer);
  if (!customerId) return;

  await updateProfileByCustomerId(customerId, {
    plan: "free",
    stripe_subscription_id: null,
  });
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = getStripeCustomerId(invoice.customer);
  if (!customerId) {
    console.error("invoice.payment_failed: missing customer id", invoice.id);
    return;
  }

  console.error("invoice.payment_failed:", customerId, invoice.id);

  await updateProfileByCustomerId(customerId, {
    payment_failed_at: new Date().toISOString(),
    payment_failed_invoice_id: invoice.id,
  });
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  const customerId = getStripeCustomerId(invoice.customer);
  if (!customerId) return;

  await clearPaymentFailedIfInvoiceMatches(customerId, invoice.id);
}

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutSessionCompleted(
          event.data.object as Stripe.Checkout.Session
        );
        break;
      case "customer.subscription.updated":
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      case "invoice.payment_failed":
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;
      case "invoice.paid":
        await handleInvoicePaid(event.data.object as Stripe.Invoice);
        break;
    }
  } catch (err) {
    console.error(`Webhook handler failed for ${event.type}:`, err);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
