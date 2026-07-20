"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { X } from "lucide-react";

const DISMISS_KEY = "repurposeone.voice_nudge_dismissed";

export default function VoiceSetupBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      setVisible(localStorage.getItem(DISMISS_KEY) !== "1");
    } catch {
      setVisible(true);
    }
  }, []);

  if (!visible) {
    return null;
  }

  function dismiss() {
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // ignore storage failures
    }
    setVisible(false);
  }

  return (
    <div className="mb-6 flex items-start gap-3 rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3">
      <i className="fas fa-magic mt-0.5 text-primary" aria-hidden />
      <div className="flex-1 text-sm">
        <p className="font-medium text-foreground">
          Set up your Brand Voice before your first generation
        </p>
        <p className="mt-1 text-muted-foreground">
          Without a voice profile, outputs use a generic default — they won&apos;t
          sound like you.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Link
            href="/brand-voice"
            className="inline-flex items-center rounded-xl bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
          >
            Set up Brand Voice →
          </Link>
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
        aria-label="Dismiss brand voice reminder"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
