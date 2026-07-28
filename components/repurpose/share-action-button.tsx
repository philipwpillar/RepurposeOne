"use client";

import { useCallback, useState } from "react";
import { Check, Share2, X } from "lucide-react";
import {
  buildLinkedInShareUrl,
  buildXIntentUrl,
  canUseLinkedInIntent,
  isNativeShareAvailable,
  linkedInFeedUrl,
} from "@/lib/share/share-targets";
import { hapticImpact } from "@/lib/haptics";
import { useCopyToClipboard } from "./use-copy-to-clipboard";
import { cn } from "@/lib/utils";

type ShareTarget = "x" | "linkedin";

interface ShareActionButtonProps {
  target: ShareTarget;
  getText: () => string;
  variant?: "studio" | "library";
  size?: "sm" | "icon";
  className?: string;
}

const LABELS: Record<ShareTarget, string> = {
  x: "Share to X",
  linkedin: "Share to LinkedIn",
};

export function ShareActionButton({
  target,
  getText,
  variant = "studio",
  size = "sm",
  className = "",
}: ShareActionButtonProps) {
  const { copy, copiedKey, errorKey } = useCopyToClipboard();
  const [busy, setBusy] = useState(false);
  const fallbackKey = `share-fallback:${target}`;

  const handleShare = useCallback(async () => {
    const text = getText();
    if (!text || busy) return;

    setBusy(true);
    try {
      void hapticImpact("Medium");
      if (isNativeShareAvailable()) {
        const { Share } = await import("@capacitor/share");
        await Share.share({ text });
        return;
      }

      if (target === "linkedin" && !canUseLinkedInIntent(text)) {
        await copy(text, fallbackKey);
        window.open(linkedInFeedUrl(), "_blank", "noopener");
        return;
      }

      const intentUrl =
        target === "x" ? buildXIntentUrl(text) : buildLinkedInShareUrl(text);
      window.open(intentUrl, "_blank", "noopener");
    } catch (err) {
      console.error("Share failed:", err);
    } finally {
      setBusy(false);
    }
  }, [busy, copy, fallbackKey, getText, target]);

  const isCopied = copiedKey === fallbackKey;
  const isError = errorKey === fallbackKey;
  const label = LABELS[target];

  if (size === "icon") {
    return (
      <button
        type="button"
        onClick={() => void handleShare()}
        disabled={busy}
        aria-label={isCopied ? "Copied" : isError ? "Share failed" : label}
        className={cn(
          "opacity-0 transition-opacity group-hover:opacity-100 disabled:opacity-50",
          className
        )}
      >
        {isCopied ? (
          <Check className="h-4 w-4 text-success" />
        ) : isError ? (
          <X className="h-4 w-4 text-destructive" />
        ) : (
          <Share2 className="h-4 w-4" />
        )}
      </button>
    );
  }

  const baseClass =
    variant === "studio"
      ? "inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-2xl border border-border disabled:opacity-50"
      : "inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium disabled:opacity-50";

  return (
    <button
      type="button"
      onClick={() => void handleShare()}
      disabled={busy}
      className={cn(baseClass, className)}
    >
      {isError ? (
        <>
          <X className="h-3 w-3" aria-hidden="true" />
          Failed
        </>
      ) : isCopied ? (
        <>
          <Check className="h-3 w-3" aria-hidden="true" />
          Copied!
        </>
      ) : (
        label
      )}
    </button>
  );
}
