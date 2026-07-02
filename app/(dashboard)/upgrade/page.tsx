import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { getUserPlan } from "@/lib/usage";
import { CheckoutBanner } from "@/components/billing/checkout-banner";
import { UpgradePlans } from "./_components/UpgradePlans";

export default async function UpgradePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const currentPlan = await getUserPlan(supabase, user.id);

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <Suspense fallback={null}>
        <CheckoutBanner />
      </Suspense>

      <div>
        <h1 className="text-2xl font-bold">Upgrade your plan</h1>
        <p className="text-muted-foreground">
          {currentPlan === "free"
            ? "Choose a plan to unlock more repurposes each month."
            : `You're on the ${currentPlan} plan.`}
        </p>
      </div>

      <UpgradePlans currentPlan={currentPlan} />
    </div>
  );
}
