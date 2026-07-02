"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Plan } from "@/types";

type PaidPlan = "creator" | "pro";

type UpgradePlansProps = {
  currentPlan: Plan;
};

async function postStripeUrl(endpoint: string, body?: { plan: PaidPlan }) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
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
  plan: PaidPlan;
  label: string;
  currentPlan: Plan;
  loadingPlan: PaidPlan | "portal" | null;
  onUpgrade: (plan: PaidPlan) => void;
}) {
  if (currentPlan === plan) {
    return <Badge className="w-full justify-center py-2">Current plan</Badge>;
  }

  const isDowngrade = currentPlan === "pro" && plan === "creator";

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
  const [loadingPlan, setLoadingPlan] = useState<PaidPlan | "portal" | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);

  const hasPaidPlan = currentPlan === "creator" || currentPlan === "pro";

  async function handleUpgrade(plan: PaidPlan) {
    setError(null);
    setLoadingPlan(plan);

    try {
      const url = await postStripeUrl("/api/stripe/checkout", { plan });
      window.location.href = url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed");
      setLoadingPlan(null);
    }
  }

  async function handleManageBilling() {
    setError(null);
    setLoadingPlan("portal");

    try {
      const url = await postStripeUrl("/api/stripe/portal");
      window.location.href = url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not open billing portal");
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

      <Card>
        <CardHeader>
          <CardTitle>Creator — £19/mo</CardTitle>
          <CardDescription>100 repurposes per month</CardDescription>
        </CardHeader>
        <CardContent>
          <PlanAction
            plan="creator"
            label="Upgrade to Creator"
            currentPlan={currentPlan}
            loadingPlan={loadingPlan}
            onUpgrade={handleUpgrade}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pro — £39/mo</CardTitle>
          <CardDescription>1,000 repurposes per month</CardDescription>
        </CardHeader>
        <CardContent>
          <PlanAction
            plan="pro"
            label="Upgrade to Pro"
            currentPlan={currentPlan}
            loadingPlan={loadingPlan}
            onUpgrade={handleUpgrade}
          />
        </CardContent>
      </Card>

      {hasPaidPlan && (
        <Button
          variant="outline"
          className="w-full"
          disabled={loadingPlan !== null}
          onClick={handleManageBilling}
        >
          {loadingPlan === "portal" ? "Opening portal…" : "Manage billing"}
        </Button>
      )}

      <Button asChild variant="ghost">
        <Link href="/dashboard">Back to dashboard</Link>
      </Button>
    </div>
  );
}
