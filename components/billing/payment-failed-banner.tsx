"use client";

import { useState } from "react";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

/**
 * Non-dismissible - no X, no localStorage. Cleared only when Stripe clears
 * payment_failed_* on the profile via webhook.
 */
export function PaymentFailedBanner({ native = false }: { native?: boolean }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function openPortal() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await response.json();
      if (!response.ok || !data.url) {
        throw new Error(data.error ?? "Could not open billing portal");
      }
      window.location.href = data.url as string;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not open billing portal");
      setLoading(false);
    }
  }

  if (native) {
    return (
      <Alert variant="destructive" className="mb-4 md:mb-6">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Subscription issue</AlertTitle>
        <AlertDescription>
          <p>There&apos;s a problem with your subscription.</p>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert variant="destructive" className="mb-4 md:mb-6">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Payment failed</AlertTitle>
      <AlertDescription className="space-y-3">
        <p>
          We couldn&apos;t process your latest payment. Update your payment
          method to avoid interruption.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            size="sm"
            variant="destructive"
            disabled={loading}
            onClick={openPortal}
          >
            {loading ? "Opening…" : "Update payment method"}
          </Button>
          {error ? <span className="text-xs">{error}</span> : null}
        </div>
      </AlertDescription>
    </Alert>
  );
}
