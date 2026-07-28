import { UpgradePrompt } from "@/components/repurpose/upgrade-prompt";
import { PageHeader } from "@/components/ui/page-header";

export default function BundleUpgradeGate() {
  return (
    <div className="mx-auto max-w-lg space-y-6">
      <PageHeader
        title="Moment Bundles"
        description="Upload photos → get per-photo captions, a recommended posting order, and drafts for X, LinkedIn, Instagram, and email — in one run."
      />

      <UpgradePrompt gate="bundles" plan="pro" />
    </div>
  );
}
