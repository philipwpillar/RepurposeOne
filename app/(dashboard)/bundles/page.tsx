import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { planAllowsBundles } from "@/lib/config";
import { checkUsageLimit } from "@/lib/usage";
import BundleUpgradeGate from "./_components/BundleUpgradeGate";
import BundleWorkspace from "./_components/BundleWorkspace";
import type { PastBundleItem } from "./_components/PastBundlesList";

const clipBundleParamSchema = z.string().uuid();

export default async function BundlesPage({
  searchParams,
}: {
  searchParams: Promise<{ clipBundle?: string }>;
}) {
  const supabase = await createClient();
  const params = await searchParams;

  let viewClipBundleId: string | undefined;
  if (params.clipBundle) {
    const parsed = clipBundleParamSchema.safeParse(params.clipBundle);
    if (parsed.success) {
      viewClipBundleId = parsed.data;
    }
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { usage } = await checkUsageLimit(supabase, user.id);

  if (!planAllowsBundles(usage.plan)) {
    return <BundleUpgradeGate />;
  }

  if (viewClipBundleId) {
    const { data: ownedBundle } = await supabase
      .from("bundles")
      .select("id")
      .eq("id", viewClipBundleId)
      .eq("user_id", user.id)
      .eq("status", "complete")
      .maybeSingle();

    if (!ownedBundle) {
      viewClipBundleId = undefined;
    }
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
          .select("bundle_id, kind, sort_order")
          .eq("user_id", user.id)
          .in("bundle_id", bundleIds)
          .order("sort_order", { ascending: true })
      : Promise.resolve({
          data: [] as {
            bundle_id: string;
            kind: string;
            sort_order: number;
          }[],
        }),
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

  const photoCountByBundle = new Map<string, number>();
  const videoCountByBundle = new Map<string, number>();
  for (const asset of assets ?? []) {
    if (asset.kind === "video") {
      videoCountByBundle.set(
        asset.bundle_id,
        (videoCountByBundle.get(asset.bundle_id) ?? 0) + 1
      );
    } else if (asset.kind === "photo") {
      photoCountByBundle.set(
        asset.bundle_id,
        (photoCountByBundle.get(asset.bundle_id) ?? 0) + 1
      );
    }
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
    photoCount: photoCountByBundle.get(b.id) ?? 0,
    videoCount: videoCountByBundle.get(b.id) ?? 0,
    sourceHash: hashByBundle.get(b.id) ?? null,
  }));

  return (
    <BundleWorkspace
      pastBundles={pastBundles}
      userPlan={usage.plan}
      viewClipBundleId={viewClipBundleId}
    />
  );
}
