"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

const MESSAGES: Record<string, { text: string; className: string }> = {
  success: {
    text: "Subscription active — your new plan limits are now in effect.",
    className: "border-green-200 bg-green-50 text-green-950",
  },
  cancelled: {
    text: "Checkout was cancelled. No charges were made.",
    className: "border-amber-200 bg-amber-50 text-amber-950",
  },
};

export function CheckoutBanner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const checkout = searchParams.get("checkout");
  const [dismissed, setDismissed] = useState(false);

  if (!checkout || dismissed) return null;

  const message = MESSAGES[checkout];
  if (!message) return null;

  function dismiss() {
    setDismissed(true);
    const url = new URL(window.location.href);
    url.searchParams.delete("checkout");
    router.replace(url.pathname + url.search, { scroll: false });
  }

  return (
    <div
      className={`flex items-start justify-between gap-4 rounded-md border px-4 py-3 text-sm ${message.className}`}
    >
      <p>{message.text}</p>
      <Button
        variant="ghost"
        size="sm"
        className="h-auto shrink-0 px-2 py-1"
        onClick={dismiss}
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
