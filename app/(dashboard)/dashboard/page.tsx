import Link from "next/link";
import { Suspense } from "react";
import { format, formatISO } from "date-fns";
import { ArrowRight, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  BUNDLE_MONTHLY_LIMIT,
  planAllowsBundles,
} from "@/lib/config";
import {
  checkUsageLimit,
  getCurrentBillingPeriod,
} from "@/lib/usage";
import { formatUsageReset } from "@/lib/billing/format-usage-period";
import { CheckoutBanner } from "@/components/billing/checkout-banner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import DashboardRecentEmpty from "./_components/DashboardRecentEmpty";
import {
  buildDashboardNextActions,
  DashboardNextActions,
} from "./_components/DashboardNextActions";
import { formatLabel, getOutputPreview } from "@/lib/format-output";
import type { RepurposeOutput } from "@/types";

function getPreview(output: RepurposeOutput | null): string {
  if (!output) return "No preview available";
  return getOutputPreview(output);
}

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { start, end } = getCurrentBillingPeriod();

  const [{ usage }, { data: profile }, { data: voices }, { data: recent }] =
    await Promise.all([
      checkUsageLimit(supabase, user.id),
      supabase
        .from("profiles")
        .select("onboarding_completed_at, payment_failed_at")
        .eq("id", user.id)
        .single(),
      supabase
        .from("brand_voices")
        .select("id")
        .eq("user_id", user.id)
        .limit(1),
      supabase
        .from("repurposes")
        .select("id, target_format, output, created_at, source_hash")
        .eq("user_id", user.id)
        .eq("status", "complete")
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

  let bundleUsed: number | null = null;
  if (planAllowsBundles(usage.plan)) {
    const { data, error } = await supabase.rpc("count_monthly_bundles", {
      p_user_id: user.id,
      p_start: formatISO(start),
      p_end: formatISO(end),
    });
    if (!error) {
      bundleUsed = typeof data === "number" ? data : 0;
    }
  }

  const atLimit = usage.used >= usage.limit;
  const remaining = Math.max(0, usage.limit - usage.used);
  const hasRecent = Boolean(recent?.length);
  const hasVoice = Boolean(voices?.length);
  const paymentFailed = Boolean(profile?.payment_failed_at);
  const onboardingComplete = Boolean(profile?.onboarding_completed_at);
  const resetsOn = formatUsageReset(usage.period_end);

  const nextActions = buildDashboardNextActions({
    paymentFailed,
    atLimit,
    hasVoice,
    hasRecent,
    onboardingComplete,
  });

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <Suspense fallback={null}>
        <CheckoutBanner />
      </Suspense>

      <PageHeader
        title="Dashboard"
        description="What to do next — create, review, or fix billing and limits."
        actions={
          <Button asChild size="lg">
            <Link href={atLimit ? "/account#plans" : "/studio"}>
              <Plus />
              {atLimit ? "Upgrade to continue" : "New Repurpose"}
            </Link>
          </Button>
        }
      />

      <DashboardNextActions
        actions={nextActions}
        plan={usage.plan}
        used={usage.used}
        limit={usage.limit}
        remaining={remaining}
        resetsOn={resetsOn}
        bundleUsed={bundleUsed}
        bundleLimit={bundleUsed !== null ? BUNDLE_MONTHLY_LIMIT : null}
      />

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recent work</h2>
          <Button asChild variant="ghost" size="sm">
            <Link href="/library">
              View all
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        {!recent?.length ? (
          <DashboardRecentEmpty bannerEligible={onboardingComplete && hasVoice} />
        ) : (
          <div className="space-y-3">
            {recent.map((item) => (
              <Link
                key={item.id}
                href={`/library/${item.source_hash}/${item.id}`}
                className="block"
              >
                <Card className="transition-colors hover:bg-muted/30">
                  <CardContent className="flex items-start justify-between gap-4 py-4">
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="secondary">
                          {formatLabel(item.target_format)}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(item.created_at), "MMM d, yyyy")}
                        </span>
                      </div>
                      <p className="line-clamp-2 text-sm text-muted-foreground">
                        {getPreview(item.output as RepurposeOutput | null)}
                      </p>
                    </div>
                    <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
