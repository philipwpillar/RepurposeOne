"use client";

import { planAllowsVision } from "@/lib/config";
import { UpgradePrompt } from "@/components/repurpose/upgrade-prompt";
import type { Plan } from "@/types";

interface PhotoUpgradeGateProps {
  plan: Plan;
}

/** Thin wrapper - same vision gate copy as Studio UpgradePrompt. */
export default function PhotoUpgradeGate({ plan }: PhotoUpgradeGateProps) {
  if (planAllowsVision(plan)) {
    return null;
  }

  return <UpgradePrompt gate="vision" plan={plan} />;
}
