import { UpgradePrompt } from "@/components/repurpose/upgrade-prompt";
import type { Plan } from "@/types";

interface PhotoUpgradeGateProps {
  plan: Plan;
  native?: boolean;
}

/** Thin wrapper - same vision gate copy as Studio UpgradePrompt. */
export default function PhotoUpgradeGate({
  plan,
  native = false,
}: PhotoUpgradeGateProps) {
  return <UpgradePrompt gate="vision" plan={plan} native={native} />;
}
