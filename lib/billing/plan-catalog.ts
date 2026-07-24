import { BUNDLE_MONTHLY_LIMIT, PLAN_LIMITS } from "@/lib/config";
import type { Plan } from "@/types";

/** Single source for plan prices and comparison copy (Account + upgrade gates). */
export const PLAN_PRICES = {
  creator: 19,
  pro: 44,
  pro_plus: 59,
} as const;

export type PaidPlanId = keyof typeof PLAN_PRICES;

export type PlanCatalogEntry = {
  id: PaidPlanId;
  title: string;
  priceLabel: string;
  summary: string;
  cta: string;
};

export const PAID_PLAN_CATALOG: PlanCatalogEntry[] = [
  {
    id: "creator",
    title: "Creator",
    priceLabel: `£${PLAN_PRICES.creator}/mo`,
    summary: `${PLAN_LIMITS.creator.toLocaleString()} generations per month · photo repurpose in Studio`,
    cta: "Upgrade to Creator",
  },
  {
    id: "pro",
    title: "Pro",
    priceLabel: `£${PLAN_PRICES.pro}/mo`,
    summary: `${PLAN_LIMITS.pro.toLocaleString()} generations per month`,
    cta: "Upgrade to Pro",
  },
  {
    id: "pro_plus",
    title: "Pro Plus",
    priceLabel: `£${PLAN_PRICES.pro_plus}/mo`,
    summary: `Everything in Pro, plus Moment Bundles (up to ${BUNDLE_MONTHLY_LIMIT}/mo) and a higher burst limit. Rendered video clips coming soon.`,
    cta: "Upgrade to Pro Plus",
  },
];

export function planPriceLabel(plan: PaidPlanId): string {
  return `£${PLAN_PRICES[plan]}/mo`;
}

/** Short line for upgrade gates — keep in sync with Account cards. */
export function nextPlanHint(plan: Plan): string {
  if (plan === "free") {
    return `Upgrade to Creator (${planPriceLabel("creator")}) for ${PLAN_LIMITS.creator} generations/month.`;
  }
  if (plan === "creator") {
    return `Upgrade to Pro (${planPriceLabel("pro")}) for ${PLAN_LIMITS.pro.toLocaleString()} generations/month.`;
  }
  if (plan === "pro") {
    return `Upgrade to Pro Plus (${planPriceLabel("pro_plus")}) for Moment Bundles and a higher burst limit.`;
  }
  return "You've reached your Pro Plus plan limit for this month.";
}
