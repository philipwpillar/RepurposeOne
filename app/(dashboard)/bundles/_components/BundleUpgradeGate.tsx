import Link from "next/link";
import { Lock } from "lucide-react";
import { BUNDLE_MONTHLY_LIMIT } from "@/lib/config";

export default function BundleUpgradeGate() {
  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">
          <span className="aurora-text">Moment Bundles</span>
        </h1>
        <p className="mt-2 text-muted-foreground">
          Turn a set of photos into captions, a posting order, and four platform
          posts — in one run.
        </p>
      </div>

      <div className="flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-4">
        <Lock className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-700" />
        <div className="flex-1 text-sm">
          <p className="font-medium text-amber-900">
            Moment Bundles are on Pro Plus
          </p>
          <p className="mt-1 text-amber-800/90">
            Pro Plus includes up to {BUNDLE_MONTHLY_LIMIT} Moment Bundles per
            month. Rendered clips are coming soon.
          </p>
          <Link
            href="/billing"
            className="mt-3 inline-block text-xs font-medium text-amber-900 underline underline-offset-2"
          >
            Upgrade to Pro Plus →
          </Link>
        </div>
      </div>
    </div>
  );
}
