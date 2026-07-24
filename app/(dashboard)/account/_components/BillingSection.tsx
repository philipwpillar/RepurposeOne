"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { Plan } from "@/types";

type BillingSectionProps = {
  currentPlan: Plan;
  paymentFailed: boolean;
};

export function BillingSection({
  currentPlan,
  paymentFailed,
}: BillingSectionProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasPaidPlan =
    currentPlan === "creator" ||
    currentPlan === "pro" ||
    currentPlan === "pro_plus";

  async function openPortal() {
    setError(null);
    setLoading(true);

    try {
      const response = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await response.json();
      if (!response.ok || !data.url) {
        throw new Error(data.error ?? "Could not open billing portal");
      }
      window.location.href = data.url as string;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not open billing portal"
      );
      setLoading(false);
    }
  }

  return (
    <section id="billing" className="space-y-4 scroll-mt-20">
      <div>
        <h2 className="text-lg font-semibold">Billing</h2>
        <p className="text-sm text-muted-foreground">
          Invoices, payment method, cancellations, and downgrades are managed
          in the Stripe customer portal.
        </p>
      </div>

      {paymentFailed ? (
        <div className="space-y-3 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3">
          <p className="text-sm text-destructive">
            Your latest payment failed. Update your payment method to avoid
            interruption.
          </p>
          {hasPaidPlan ? (
            <Button
              variant="destructive"
              size="sm"
              disabled={loading}
              onClick={() => void openPortal()}
            >
              {loading ? "Opening portal…" : "Update payment method"}
            </Button>
          ) : null}
        </div>
      ) : null}

      {hasPaidPlan ? (
        <Button
          variant="outline"
          disabled={loading}
          onClick={() => void openPortal()}
        >
          {loading ? "Opening portal…" : "Manage billing"}
        </Button>
      ) : (
        <p className="text-sm text-muted-foreground">
          Upgrade above to unlock invoices and the customer portal.
        </p>
      )}

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}
