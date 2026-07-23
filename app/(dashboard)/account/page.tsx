import { Suspense } from "react";
import { formatISO } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { planAllowsBundles } from "@/lib/config";
import {
  checkUsageLimit,
  getCurrentBillingPeriod,
} from "@/lib/usage";
import { CheckoutBanner } from "@/components/billing/checkout-banner";
import { UpgradePlans } from "@/components/billing/UpgradePlans";
import { ProfileSection } from "./_components/ProfileSection";
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
      .select("id, samples, description, is_default")
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

  return (
    <div className="mx-auto max-w-lg space-y-10">
      <Suspense fallback={null}>
        <CheckoutBanner />
      </Suspense>

      <div>
        <h1 className="text-2xl font-bold">Account</h1>
        <p className="text-muted-foreground">
          Profile, plan, billing, and account controls in one place.
        </p>
      </div>

      <ProfileSection
        email={user.email}
        displayName={displayName}
        avatarUrl={avatarUrl}
        signedInVia={signedInViaLabel(user.identities)}
      />

      <UsageSection usage={usage} bundleUsed={bundleUsed} />

      <section id="plans" className="space-y-4 scroll-mt-20">
        <div>
          <h2 className="text-lg font-semibold">Upgrade</h2>
          <p className="text-sm text-muted-foreground">
            {usage.plan === "free"
              ? "Choose a plan to unlock more repurposes each month."
              : `You're on the ${usage.plan === "pro_plus" ? "Pro Plus" : usage.plan} plan.`}
          </p>
        </div>
        <UpgradePlans currentPlan={usage.plan} />
      </section>

      <BillingSection
        currentPlan={usage.plan}
        paymentFailed={Boolean(profile?.payment_failed_at)}
      />

      <BrandVoiceSummary
        description={defaultVoice?.description ?? null}
        sampleCount={defaultVoice?.samples?.length ?? 0}
        voiceCount={voices?.length ?? 0}
      />

      <section
        id="danger"
        className="space-y-4 scroll-mt-20 rounded-2xl border border-destructive/30 bg-destructive/5 p-5"
      >
        <div>
          <h2 className="text-lg font-semibold text-destructive">
            Delete account
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
