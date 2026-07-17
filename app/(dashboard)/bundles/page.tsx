import { createClient } from "@/lib/supabase/server";
import { planAllowsBundles } from "@/lib/config";
import { checkUsageLimit } from "@/lib/usage";
import BundleUpgradeGate from "./_components/BundleUpgradeGate";
import BundleWorkspace from "./_components/BundleWorkspace";
import type { PastBundleItem } from "./_components/PastBundlesList";

export default async function BundlesPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { usage } = await checkUsageLimit(supabase, user.id);

  if (!planAllowsBundles(usage.plan)) {
    return <BundleUpgradeGate />;
  }

  const { data: bundles } = await supabase
    .from("bundles")
    .select("id, title, context, status, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  const bundleIds = (bundles ?? []).map((b) => b.id);

  const [{ data: assets }, { data: linkedRepurposes }] = await Promise.all([
    bundleIds.length
      ? supabase
          .from("bundle_assets")
          .select("bundle_id, sort_order")
          .eq("user_id", user.id)
          .in("bundle_id", bundleIds)
          .order("sort_order", { ascending: true })
      : Promise.resolve({ data: [] as { bundle_id: string; sort_order: number }[] }),
    bundleIds.length
      ? supabase
          .from("repurposes")
          .select("bundle_id, source_hash, status")
          .eq("user_id", user.id)
          .in("bundle_id", bundleIds)
          .eq("status", "complete")
      : Promise.resolve({
          data: [] as {
            bundle_id: string;
            source_hash: string;
            status: string;
          }[],
        }),
  ]);

  const assetCountByBundle = new Map<string, number>();
  for (const asset of assets ?? []) {
    assetCountByBundle.set(
      asset.bundle_id,
      (assetCountByBundle.get(asset.bundle_id) ?? 0) + 1
    );
  }

  const hashByBundle = new Map<string, string>();
  for (const row of linkedRepurposes ?? []) {
    if (row.bundle_id && row.source_hash && !hashByBundle.has(row.bundle_id)) {
      hashByBundle.set(row.bundle_id, row.source_hash);
    }
  }

  const pastBundles: PastBundleItem[] = (bundles ?? []).map((b) => ({
    id: b.id,
    title: b.title,
    context: b.context,
    status: b.status,
    createdAt: b.created_at,
    assetCount: assetCountByBundle.get(b.id) ?? 0,
    sourceHash: hashByBundle.get(b.id) ?? null,
  }));

  return <BundleWorkspace pastBundles={pastBundles} />;
}
