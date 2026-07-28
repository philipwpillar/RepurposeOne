"use client";

import Link from "next/link";
import { Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export const ACTIVATION_DISMISS_KEY = "repurposeone.activation_dismissed";

interface ActivationBannerProps {
  onDismiss?: () => void;
}

export default function ActivationBanner({ onDismiss }: ActivationBannerProps) {
  function dismiss() {
    try {
      localStorage.setItem(ACTIVATION_DISMISS_KEY, "1");
    } catch {
      // ignore storage failures
    }
    onDismiss?.();
  }

  return (
    <div className="flex items-start gap-3 rounded-2xl border border-primary/20 bg-primary/5 px-4 py-4">
      <Sparkles className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" aria-hidden />
      <div className="flex-1 text-sm">
        <p className="font-medium text-foreground">
          Your voice is set up — now see it work
        </p>
        <p className="mt-1 text-muted-foreground">
          Paste any article into Studio and get drafts for X, LinkedIn, Instagram, and email in
          seconds.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Button asChild size="sm">
            <Link href="/studio?example=1">Try it now</Link>
          </Button>
          <button
            type="button"
            onClick={dismiss}
            className="text-xs font-medium text-muted-foreground underline underline-offset-2"
          >
            Dismiss
          </button>
        </div>
      </div>
      <button
        type="button"
        onClick={dismiss}
        className="rounded-lg p-1 text-muted-foreground hover:bg-muted"
        aria-label="Dismiss activation reminder"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
