import type { SupabaseClient } from "@supabase/supabase-js";
import type { WorkerConfig } from "./config";

const CLIP_RETENTION_DAYS = 30;
const TERMINAL_STATUSES = ["complete", "failed"] as const;

function metaObject(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

async function deleteStorageObject(
  supabase: SupabaseClient,
  config: WorkerConfig,
  storagePath: string,
  reason: string
): Promise<void> {
  const { error } = await supabase.storage
    .from(config.bucket)
    .remove([storagePath]);

  if (error) {
    console.error(`[lifecycle] delete failed (${reason}) ${storagePath}: ${error.message}`);
    return;
  }

  console.info(`[lifecycle] deleted ${storagePath} (${reason})`);
}

export async function runLifecycleSweep(
  supabase: SupabaseClient,
  config: WorkerConfig
): Promise<void> {
  await sweepExpiredClips(supabase, config);
  await sweepAbandonedSources(supabase, config);
  await sweepCompletedBundleSources(supabase, config);
}

async function sweepExpiredClips(
  supabase: SupabaseClient,
  config: WorkerConfig
): Promise<void> {
  const cutoff = new Date(
    Date.now() - CLIP_RETENTION_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();

  const { data: clips, error } = await supabase
    .from("bundle_clips")
    .select("id, output_storage_path")
    .eq("render_status", "complete")
    .not("output_storage_path", "is", null)
    .lt("updated_at", cutoff);

  if (error) {
    console.error(`[lifecycle] expired clip query failed: ${error.message}`);
    return;
  }

  for (const clip of clips ?? []) {
    if (!clip.output_storage_path) continue;
    await deleteStorageObject(
      supabase,
      config,
      clip.output_storage_path,
      "30-day clip retention"
    );

    const { error: updateError } = await supabase
      .from("bundle_clips")
      .update({
        output_storage_path: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", clip.id);

    if (updateError) {
      console.error(
        `[lifecycle] failed to null output_storage_path for clip ${clip.id}: ${updateError.message}`
      );
    }
  }
}

async function sweepAbandonedSources(
  supabase: SupabaseClient,
  config: WorkerConfig
): Promise<void> {
  const cutoff = new Date(
    Date.now() - config.sourceGraceHours * 60 * 60 * 1000
  ).toISOString();

  const { data: bundles, error } = await supabase
    .from("bundles")
    .select("id, user_id, status, created_at")
    .in("status", ["pending", "failed"])
    .lt("created_at", cutoff);

  if (error) {
    console.error(`[lifecycle] abandoned bundle query failed: ${error.message}`);
    return;
  }

  for (const bundle of bundles ?? []) {
    const { data: assets, error: assetsError } = await supabase
      .from("bundle_assets")
      .select("id, storage_path, metadata")
      .eq("bundle_id", bundle.id)
      .eq("kind", "video");

    if (assetsError) {
      console.error(
        `[lifecycle] assets query failed for bundle ${bundle.id}: ${assetsError.message}`
      );
      continue;
    }

    for (const asset of assets ?? []) {
      const metadata = metaObject(asset.metadata);
      if (metadata.source_deleted === true || !asset.storage_path) continue;

      await deleteStorageObject(
        supabase,
        config,
        asset.storage_path,
        `abandoned bundle grace (${config.sourceGraceHours}h)`
      );

      await supabase
        .from("bundle_assets")
        .update({
          metadata: { ...metadata, source_deleted: true },
        })
        .eq("id", asset.id);
    }
  }
}

async function sweepCompletedBundleSources(
  supabase: SupabaseClient,
  config: WorkerConfig
): Promise<void> {
  const { data: videoAssets, error } = await supabase
    .from("bundle_assets")
    .select("id, bundle_id, storage_path, metadata")
    .eq("kind", "video")
    .not("storage_path", "is", null);

  if (error) {
    console.error(`[lifecycle] video asset query failed: ${error.message}`);
    return;
  }

  for (const asset of videoAssets ?? []) {
    const metadata = metaObject(asset.metadata);
    if (metadata.source_deleted === true || !asset.storage_path) continue;

    const { data: clips, error: clipsError } = await supabase
      .from("bundle_clips")
      .select("render_status")
      .eq("asset_id", asset.id);

    if (clipsError) {
      console.error(
        `[lifecycle] clips query failed for asset ${asset.id}: ${clipsError.message}`
      );
      continue;
    }

    if (!clips?.length) continue;

    const allTerminal = clips.every((clip) =>
      TERMINAL_STATUSES.includes(
        clip.render_status as (typeof TERMINAL_STATUSES)[number]
      )
    );

    if (!allTerminal) continue;

    await deleteStorageObject(
      supabase,
      config,
      asset.storage_path,
      "all clips terminal"
    );

    await supabase
      .from("bundle_assets")
      .update({
        metadata: { ...metadata, source_deleted: true },
      })
      .eq("id", asset.id);
  }
}
