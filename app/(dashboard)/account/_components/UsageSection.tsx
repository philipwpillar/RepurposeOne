import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { BUNDLE_MONTHLY_LIMIT } from "@/lib/config";
import type { UsageInfo } from "@/types";

type UsageSectionProps = {
  usage: UsageInfo;
  bundleUsed: number | null;
};

function planLabel(plan: UsageInfo["plan"]) {
  if (plan === "pro_plus") return "Pro Plus";
  return plan.charAt(0).toUpperCase() + plan.slice(1);
}

export function UsageSection({ usage, bundleUsed }: UsageSectionProps) {
  const remaining = Math.max(0, usage.limit - usage.used);

  return (
    <section id="usage" className="space-y-4 scroll-mt-20">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Plan &amp; usage</h2>
          <p className="text-sm text-muted-foreground">
            Calendar-month usage for your current plan.
          </p>
        </div>
        <Badge className="capitalize">{planLabel(usage.plan)}</Badge>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-border p-4">
          <p className="text-xs text-muted-foreground">Successful this month</p>
          <p className="mt-1 text-xl font-semibold">
            {usage.used} / {usage.limit}
          </p>
        </div>
        <div className="rounded-2xl border border-border p-4">
          <p className="text-xs text-muted-foreground">Remaining</p>
          <p className="mt-1 text-xl font-semibold">{remaining}</p>
        </div>
        {bundleUsed !== null ? (
          <div className="rounded-2xl border border-border p-4">
            <p className="text-xs text-muted-foreground">Moment Bundles</p>
            <p className="mt-1 text-xl font-semibold">
              {bundleUsed} / {BUNDLE_MONTHLY_LIMIT}
            </p>
          </div>
        ) : (
          <div className="rounded-2xl border border-border p-4">
            <p className="text-xs text-muted-foreground">Library</p>
            <Link
              href="/library"
              className="mt-1 inline-block text-sm font-medium text-primary hover:text-primary/80"
            >
              View past work →
            </Link>
          </div>
        )}
      </div>

      {bundleUsed !== null ? (
        <Link
          href="/library"
          className="text-sm font-medium text-primary hover:text-primary/80"
        >
          View past work in Library →
        </Link>
      ) : null}
    </section>
  );
}
