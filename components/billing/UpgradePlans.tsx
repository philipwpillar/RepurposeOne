"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PAID_PLAN_CATALOG, type PaidPlanId } from "@/lib/billing/plan-catalog";
import { isNativePlatform } from "@/lib/platform";
import type { Plan } from "@/types";

const PLAN_RANK: Record<Plan, number> = {
  free: 0,
  creator: 1,
  pro: 2,
  pro_plus: 3,
};

type UpgradePlansProps = {
  currentPlan: Plan;
};

async function postCheckoutUrl(plan: PaidPlanId) {
  const response = await fetch("/api/stripe/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ plan }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error ?? "Request failed");
  }

  if (!data.url) {
    throw new Error("No redirect URL returned");
  }

  return data.url as string;
}

function PlanAction({
  plan,
  label,
  currentPlan,
  loadingPlan,
  onUpgrade,
}: {
  plan: PaidPlanId;
  label: string;
  currentPlan: Plan;
  loadingPlan: PaidPlanId | null;
  onUpgrade: (plan: PaidPlanId) => void;
}) {
  if (currentPlan === plan) {
    return <Badge className="w-full justify-center py-2">Current plan</Badge>;
  }

  const isDowngrade = PLAN_RANK[currentPlan] > PLAN_RANK[plan];

  if (isDowngrade) {
    return (
      <p className="text-center text-sm text-muted-foreground">
        Use Manage billing to change plans
      </p>
    );
  }

  return (
    <Button
      className="w-full"
      disabled={loadingPlan !== null}
      onClick={() => onUpgrade(plan)}
    >
      {loadingPlan === plan ? "Redirecting…" : label}
    </Button>
  );
}

export function UpgradePlans({ currentPlan }: UpgradePlansProps) {
  const [loadingPlan, setLoadingPlan] = useState<PaidPlanId | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Belt-and-braces for 3.1.3(f) if UA-based SSR strip is missing.
  if (isNativePlatform()) {
    return (
      <p className="text-sm text-muted-foreground">
        Plan: manage subscriptions on the web at voiceora.io.
      </p>
    );
  }

  async function handleUpgrade(plan: PaidPlanId) {
    setError(null);
    setLoadingPlan(plan);

    try {
      const url = await postCheckoutUrl(plan);
      window.location.href = url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed");
      setLoadingPlan(null);
    }
  }

  return (
    <div className="space-y-6">
      {error && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      )}

      {PAID_PLAN_CATALOG.map((entry) => (
        <Card key={entry.id}>
          <CardHeader>
            <CardTitle>
              {entry.title} - {entry.priceLabel}
            </CardTitle>
            <CardDescription>{entry.summary}</CardDescription>
          </CardHeader>
          <CardContent>
            <PlanAction
              plan={entry.id}
              label={entry.cta}
              currentPlan={currentPlan}
              loadingPlan={loadingPlan}
              onUpgrade={handleUpgrade}
            />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
