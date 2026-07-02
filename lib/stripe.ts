import Stripe from "stripe";
import type { Plan } from "@/types";

let stripeInstance: Stripe | undefined;

function getStripeClient(): Stripe {
  if (!stripeInstance) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error("STRIPE_SECRET_KEY is not configured");
    }
    stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return stripeInstance;
}

/** Lazy singleton — defers init until first use so `next build` works without Stripe env vars. */
export const stripe = new Proxy({} as Stripe, {
  get(_target, prop, receiver) {
    const client = getStripeClient();
    const value = Reflect.get(client, prop, receiver);
    return typeof value === "function" ? value.bind(client) : value;
  },
});

export function getStripePriceId(plan: "creator" | "pro"): string {
  const priceId =
    plan === "creator"
      ? process.env.STRIPE_PRICE_ID_CREATOR
      : process.env.STRIPE_PRICE_ID_PRO;

  if (!priceId) {
    throw new Error(`Stripe price ID for ${plan} is not configured`);
  }

  return priceId;
}

export function planFromPriceId(priceId: string): Plan | null {
  if (priceId === process.env.STRIPE_PRICE_ID_CREATOR) return "creator";
  if (priceId === process.env.STRIPE_PRICE_ID_PRO) return "pro";
  return null;
}

export function planFromSubscription(
  subscription: Stripe.Subscription
): Plan | null {
  const priceId = subscription.items.data[0]?.price.id;
  if (!priceId) return null;
  return planFromPriceId(priceId);
}

export function isActiveSubscriptionStatus(status: Stripe.Subscription.Status) {
  return status === "active" || status === "trialing";
}
