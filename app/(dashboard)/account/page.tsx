import { Suspense } from "react";
import Link from "next/link";
import { formatISO } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { planAllowsBundles } from "@/lib/config";
import {
  checkUsageLimit,
  getCurrentBillingPeriod,
} from "@/lib/usage";
import { formatUsageReset } from "@/lib/billing/format-usage-period";
import { CheckoutBanner } from "@/components/billing/checkout-banner";
import { UpgradePlans } from "@/components/billing/UpgradePlans";
import { PageHeader } from "@/components/ui/page-header";
import { isNativeRequest } from "@/lib/native-request";
import { planLabel } from "@/lib/plan-label";
import { ProfileSection } from "./_components/ProfileSection";
import { AppearanceSection } from "./_components/AppearanceSection";
import { UsageSection } from "./_components/UsageSection";
import { BillingSection } from "./_components/BillingSection";
import { BrandVoiceSummary } from "./_components/BrandVoiceSummary";
import { DeleteAccountForm } from "./_components/DeleteAccountForm";

function signedInViaLabel(
  identities: { provider?: string }[] | undefined
): string {
  const providers = new Set(
    (identities ?? [])
      .map((identity) => identity.provider)
      .filter((provider): provider is string => Boolean(provider))
  );

  if (providers.has("google")) return "Google";
  if (providers.has("email")) return "email";
  if (providers.size === 1) {
    return [...providers][0] ?? "your account";
  }
  if (providers.size > 1) return "linked accounts";
  return "your account";
}

const SECTION_NAV = [
  { href: "#appearance", label: "Appearance" },
  { href: "#profile", label: "Profile" },
  { href: "#usage", label: "Usage" },
  { href: "#plans", label: "Plans", purchase: true },
  { href: "#billing", label: "Billing", purchase: true },
  { href: "#voice", label: "Voice" },
  { href: "#danger", label: "Delete" },
] as const;

export default async function AccountPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { start, end } = getCurrentBillingPeriod();

  const [{ usage }, { data: profile }, { data: voices }] = await Promise.all([
    checkUsageLimit(supabase, user.id),
    supabase
      .from("profiles")
      .select("payment_failed_at")
      .eq("id", user.id)
      .single(),
    supabase
      .from("brand_voices")
      .select("id, name, samples, description, is_default")
      .eq("user_id", user.id)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false }),
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

  const displayName =
    (typeof user.user_metadata?.full_name === "string" &&
      user.user_metadata.full_name) ||
    (typeof user.user_metadata?.name === "string" && user.user_metadata.name) ||
    user.email?.split("@")[0] ||
    "Account";

  const avatarUrl =
    typeof user.user_metadata?.avatar_url === "string"
      ? user.user_metadata.avatar_url
      : typeof user.user_metadata?.picture === "string"
        ? user.user_metadata.picture
        : undefined;

  const defaultVoice =
    voices?.find((voice) => voice.is_default) ?? voices?.[0] ?? null;

  const remaining = Math.max(0, usage.limit - usage.used);
  const resetsOn = formatUsageReset(usage.period_end);
  const paymentFailed = Boolean(profile?.payment_failed_at);
  const native = await isNativeRequest();
  const sectionNav = SECTION_NAV.filter((item) =>
    native ? !("purchase" in item && item.purchase) : true
  );

  return (
    <div className="mx-auto max-w-lg space-y-10">
      {!native ? (
        <Suspense fallback={null}>
          <CheckoutBanner />
        </Suspense>
      ) : null}

      <PageHeader
        title="Account"
        description="Profile, plan, billing, and account controls in one place."
      />

      <div className="rounded-2xl border border-border bg-card px-4 py-3">
        <p className="text-sm text-foreground">
          <span className="font-semibold">{planLabel(usage.plan)}</span>
          <span className="text-muted-foreground">
            {" "}
            · {usage.used}/{usage.limit} generations · {remaining} left · resets{" "}
            {resetsOn}
          </span>
        </p>
        {paymentFailed ? (
          native ? (
            <p className="mt-1 text-xs text-destructive">
              There&apos;s a problem with your subscription.
            </p>
          ) : (
            <p className="mt-1 text-xs text-destructive">
              Payment failed -{" "}
              <Link href="#billing" className="underline underline-offset-2">
                update payment method
              </Link>
            </p>
          )
        ) : null}
      </div>

      <nav
        aria-label="Account sections"
        className="flex flex-wrap gap-2 border-b border-border pb-3"
      >
        {sectionNav.map((item) => (
          <a
            key={item.href}
            href={item.href}
            className="rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
          >
            {item.label}
          </a>
        ))}
      </nav>

      <AppearanceSection />

      <ProfileSection
        email={user.email}
        displayName={displayName}
        avatarUrl={avatarUrl}
        signedInVia={signedInViaLabel(user.identities)}
      />

      <p className="text-sm text-muted-foreground">
        For account help, email{" "}
        <a
          href="mailto:support@voiceora.io"
          className="text-foreground underline underline-offset-2 hover:text-foreground/80"
        >
          support@voiceora.io
        </a>
        .
      </p>

      <UsageSection usage={usage} bundleUsed={bundleUsed} native={native} />

      {native ? (
        <section id="plans" className="space-y-2 scroll-mt-20">
          <h2 className="text-section">Plan</h2>
          <p className="text-sm text-muted-foreground">
            Plan: {planLabel(usage.plan)}
          </p>
        </section>
      ) : (
        <section id="plans" className="space-y-4 scroll-mt-20">
          <div>
            <h2 className="text-section">Plans</h2>
            <p className="text-sm text-muted-foreground">
              {usage.plan === "free"
                ? "Choose a plan to unlock more generations each month."
                : `You're on ${planLabel(usage.plan)}. Upgrade for more capacity or Moment Bundles.`}
            </p>
          </div>
          <UpgradePlans currentPlan={usage.plan} />
        </section>
      )}

      <BillingSection
        currentPlan={usage.plan}
        paymentFailed={paymentFailed}
        native={native}
      />

      <BrandVoiceSummary
        name={defaultVoice?.name ?? null}
        description={defaultVoice?.description ?? null}
        sampleCount={defaultVoice?.samples?.length ?? 0}
        voiceCount={voices?.length ?? 0}
      />

      <section
        id="danger"
        className="space-y-4 scroll-mt-20 rounded-2xl border-2 border-destructive/40 bg-destructive/5 p-5"
      >
        <div>
          <h2 className="text-section text-destructive">
            Delete Account
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            This permanently deletes your Voiceora account, brand voices,
            library, and Moment Bundle data. Active subscriptions are cancelled
            immediately. Stripe may retain payment records required by law.
            This cannot be undone.
          </p>
        </div>
        <DeleteAccountForm />
      </section>
    </div>
  );
}
