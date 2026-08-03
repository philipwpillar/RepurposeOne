import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { BUNDLE_MONTHLY_LIMIT } from "@/lib/config";
import { formatUsageReset } from "@/lib/billing/format-usage-period";
import { planLabel } from "@/lib/plan-label";
import type { UsageInfo } from "@/types";

type UsageSectionProps = {
  usage: UsageInfo;
  bundleUsed: number | null;
  native?: boolean;
};

export function UsageSection({
  usage,
  bundleUsed,
  native = false,
}: UsageSectionProps) {
  const remaining = Math.max(0, usage.limit - usage.used);
  const resetsOn = formatUsageReset(usage.period_end);
  const pct = Math.min(100, Math.round((usage.used / Math.max(1, usage.limit)) * 100));

  return (
    <section id="usage" className="space-y-4 scroll-mt-20">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Plan &amp; usage</h2>
          <p className="text-sm text-muted-foreground">
            Generations are successful runs this calendar month - not tokens.
          </p>
        </div>
        <Badge>{planLabel(usage.plan)}</Badge>
      </div>

      <div className="space-y-2 rounded-2xl border border-border p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-sm font-medium text-foreground">
            {usage.used} / {usage.limit} generations
          </p>
          <p className="text-xs text-muted-foreground">
            {remaining} remaining · resets {resetsOn}
          </p>
        </div>
        <div
          className="h-1.5 overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuenow={usage.used}
          aria-valuemin={0}
          aria-valuemax={usage.limit}
          aria-label="Monthly generation usage"
        >
          <div
            className="h-full rounded-full bg-primary transition-[width]"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {bundleUsed !== null ? (
          <div className="rounded-2xl border border-border p-4">
            <p className="text-xs text-muted-foreground">Moment Bundles</p>
            <p className="mt-1 text-xl font-semibold">
              {bundleUsed} / {BUNDLE_MONTHLY_LIMIT}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Resets {resetsOn}
            </p>
          </div>
        ) : (
          <div className="rounded-2xl border border-border p-4">
            <p className="text-xs text-muted-foreground">Moment Bundles</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Available on Pro Plus
            </p>
            {!native ? (
              <Link
                href="#plans"
                className="mt-2 inline-block text-sm font-medium text-primary hover:text-primary/80"
              >
                View plans →
              </Link>
            ) : null}
          </div>
        )}
        <div className="rounded-2xl border border-border p-4">
          <p className="text-xs text-muted-foreground">Library</p>
          <Link
            href="/library"
            className="mt-1 inline-block text-sm font-medium text-primary hover:text-primary/80"
          >
            View past work →
          </Link>
        </div>
      </div>
    </section>
  );
}
