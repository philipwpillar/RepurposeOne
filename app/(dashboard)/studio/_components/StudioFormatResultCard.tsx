"use client";

import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { TargetFormat } from "@/types";

export type FormatCardStatus = "idle" | "generating" | "ready" | "failed";

interface StudioFormatResultCardProps {
  format: TargetFormat;
  title: string;
  statusLabel: string;
  status: FormatCardStatus;
  icon: ReactNode;
  selected: boolean;
  expanded: boolean;
  onToggleExpand: () => void;
  onRegenerate: () => void;
  onStop?: () => void;
  regenerateDisabled?: boolean;
  children: ReactNode;
  footerExtra?: ReactNode;
  error?: ReactNode;
}

export function StudioFormatResultCard({
  format,
  title,
  statusLabel,
  status,
  icon,
  selected,
  expanded,
  onToggleExpand,
  onRegenerate,
  onStop,
  regenerateDisabled = false,
  children,
  footerExtra,
  error,
}: StudioFormatResultCardProps) {
  if (!selected) return null;

  const headerInner = (
    <>
      <div className="flex min-w-0 items-center gap-3">
        <span className="shrink-0" aria-hidden="true">
          {icon}
        </span>
        <div className="min-w-0">
          <div className="font-semibold text-foreground">{title}</div>
          <div
            className={cn(
              "text-xs",
              status === "failed"
                ? "text-destructive"
                : status === "generating"
                  ? "text-primary"
                  : "text-muted-foreground"
            )}
          >
            {statusLabel}
          </div>
        </div>
      </div>
      <ChevronDown
        className={cn(
          "h-4 w-4 shrink-0 text-muted-foreground transition-transform md:hidden",
          expanded && "rotate-180"
        )}
        aria-hidden="true"
      />
    </>
  );

  return (
    <article
      data-format={format}
      className="overflow-hidden rounded-2xl border border-border bg-card"
    >
      <button
        type="button"
        onClick={onToggleExpand}
        aria-expanded={expanded}
        className="flex w-full items-center justify-between gap-3 border-b border-border px-5 py-4 text-left md:hidden"
      >
        {headerInner}
      </button>
      <div className="hidden w-full items-center justify-between gap-3 border-b border-border px-5 py-4 md:flex">
        {headerInner}
      </div>

      <div className={cn(!expanded && "hidden md:block")}>
        <div className="space-y-4 p-5">
          {error}
          {children}
          {footerExtra}
        </div>

        <div className="flex gap-2 border-t border-border bg-secondary px-5 py-3">
          {status === "generating" && onStop ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="flex-1 rounded-xl"
              onClick={onStop}
            >
              Stop
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="flex-1 rounded-xl"
              onClick={onRegenerate}
              disabled={regenerateDisabled || status === "generating"}
            >
              {status === "generating" ? "Generating…" : "Regenerate"}
            </Button>
          )}
        </div>
      </div>
    </article>
  );
}
