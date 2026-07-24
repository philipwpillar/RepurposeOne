import { UpgradePrompt } from "@/components/repurpose/upgrade-prompt";
import { PageHeader } from "@/components/ui/page-header";

export default function BundleUpgradeGate() {
  return (
    <div className="mx-auto max-w-lg space-y-6">
      <PageHeader
        title="Moment Bundles"
        description="Turn a set of photos into captions, a posting order, and four platform posts — in one run."
      />

      <UpgradePrompt gate="bundles" plan="pro" />
    </div>
  );
}
