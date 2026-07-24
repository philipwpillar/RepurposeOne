"use client";

import { Check, Copy, X } from "lucide-react";
import type { CopyKey } from "./use-copy-to-clipboard";
import { cn } from "@/lib/utils";

interface CopyActionButtonProps {
  copyKey: CopyKey;
  label: string;
  copiedKey: CopyKey | null;
  errorKey: CopyKey | null;
  onCopy: () => void;
  disabled?: boolean;
  variant?: "studio" | "library";
  size?: "sm" | "icon";
  className?: string;
}

export function CopyActionButton({
  copyKey,
  label,
  copiedKey,
  errorKey,
  onCopy,
  disabled = false,
  variant = "studio",
  size = "sm",
  className = "",
}: CopyActionButtonProps) {
  const isCopied = copiedKey === copyKey;
  const isError = errorKey === copyKey;

  if (size === "icon") {
    return (
      <button
        type="button"
        onClick={onCopy}
        disabled={disabled}
        aria-label={isCopied ? "Copied" : isError ? "Copy failed" : label}
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
          <Copy className="h-4 w-4" />
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
      onClick={onCopy}
      disabled={disabled}
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
