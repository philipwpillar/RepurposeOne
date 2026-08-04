import Link from "next/link";
import { AlertCircle, Lock } from "lucide-react";
import { BUNDLE_MONTHLY_LIMIT } from "@/lib/config";
import { planPriceLabel } from "@/lib/billing/plan-catalog";
import { getUpgradeMessage } from "@/lib/usage";
import type { Plan } from "@/types";

export type UpgradeGate =
  | "monthly_limit"
  | "vision"
  | "bundles"
  | "bundle_monthly_cap"
  | "rate_limit";

interface UpgradePromptProps {
  gate: UpgradeGate;
  plan: Plan;
  message?: string;
  billingHint?: boolean;
  className?: string;
  /** When true (iOS shell), fact-only copy with no prices or purchase CTAs. */
  native?: boolean;
}

const ACCOUNT_PLANS_HREF = "/account#plans";

const GATE_COPY: Record<
  Exclude<UpgradeGate, "monthly_limit" | "rate_limit">,
  { title: string; body: string; cta: string }
> = {
  vision: {
    title: `Photo repurpose is on Creator (${planPriceLabel("creator")}) and above`,
    body: "Upgrade to generate captions from your photos.",
    cta: "View plans →",
  },
  bundles: {
    title: "Moment Bundles are on Pro Plus",
    body: `Pro Plus (${planPriceLabel("pro_plus")}) includes up to ${BUNDLE_MONTHLY_LIMIT} Moment Bundle photo packs per month. Rendered video clips coming soon.`,
    cta: "Upgrade to Pro Plus →",
  },
  bundle_monthly_cap: {
    title: "Monthly bundle limit reached",
    body: `You've used all ${BUNDLE_MONTHLY_LIMIT} Moment Bundles this month on Pro Plus.`,
    cta: "View plans →",
  },
};

/** Approved App Store 3.1.3(f) copy - states the fact, gives no destination. */
const NATIVE_GATE_COPY: Record<
  UpgradeGate,
  { title: string; body: string }
> = {
  bundles: {
    title: "Moment Bundles are available on the Pro Plus plan.",
    body: "This feature isn't included on your current plan.",
  },
  vision: {
    title: "Photo repurpose is available on Creator and above.",
    body: "This feature isn't included on your current plan.",
  },
  monthly_limit: {
    title: "You've reached this month's generation limit.",
    body: "Your usage resets at the start of the next billing period.",
  },
  bundle_monthly_cap: {
    title: "Monthly bundle limit reached",
    body: `You've used all ${BUNDLE_MONTHLY_LIMIT} Moment Bundles this month on Pro Plus.`,
  },
  rate_limit: {
    title: "Slow down - too many requests",
    body: "Please wait a few minutes before generating again.",
  },
};

function promptCopy(
  gate: UpgradeGate,
  plan: Plan,
  native: boolean
): { title: string; body: string; cta?: string } {
  if (native) {
    return NATIVE_GATE_COPY[gate];
  }

  if (gate === "monthly_limit") {
    return {
      title: "Monthly generation limit reached",
      body: getUpgradeMessage(plan),
      cta: "Upgrade plan →",
    };
  }

  if (gate === "rate_limit") {
    return {
      title: "Slow down - too many requests",
      body: "Please wait a few minutes before generating again.",
    };
  }

  return GATE_COPY[gate];
}

export function UpgradePrompt({
  gate,
  plan,
  message,
  billingHint,
  className,
  native = false,
}: UpgradePromptProps) {
  const copy = promptCopy(gate, plan, native);
  const Icon = gate === "rate_limit" ? AlertCircle : Lock;
  const body = native ? copy.body : (message ?? copy.body);

  return (
    <div
      className={
        className ??
        "mb-5 flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3"
      }
    >
      <Icon className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-700" />
      <div className="flex-1 text-sm">
        <p className="font-medium text-amber-900">{copy.title}</p>
        <p className="mt-1 text-amber-800/90">{body}</p>
        {billingHint ? (
          <p className="mt-1 text-xs text-amber-800/75">
            This attempt wasn&apos;t billed - you can retry safely.
          </p>
        ) : null}
        {!native && copy.cta ? (
          <Link
            href={ACCOUNT_PLANS_HREF}
            className="mt-2 inline-block text-xs font-medium text-amber-900 underline underline-offset-2"
          >
            {copy.cta}
          </Link>
        ) : null}
      </div>
    </div>
  );
}
