import type { SupabaseClient } from "@supabase/supabase-js";
import type { WorkerConfig } from "./config";

const CLIP_RETENTION_DAYS = 30;
const LIFECYCLE_BATCH_SIZE = 100;
const TERMINAL_STATUSES = ["complete", "failed"] as const;
const ORPHANED_RENDERING_ERROR =
  "orphaned_rendering: reclaimed by worker after render timeout margin";

function metaObject(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

/** Reclaim age = 3× render timeout so an in-flight job is never stolen mid-render. */
export function reclaimRenderingAfterMs(renderTimeoutMs: number): number {
  return renderTimeoutMs * 3;
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
  await reclaimStuckRendering(supabase, config);
  await sweepExpiredClips(supabase, config);
  await sweepAbandonedSources(supabase, config);
  await sweepCompletedBundleSources(supabase, config);
}

/**
 * H2: clips left in `rendering` after a worker crash never return to the
 * pending claim queue. CAS on updated_at so an active renderer that just
 * bumped the row is not reclaimed.
 */
async function reclaimStuckRendering(
  supabase: SupabaseClient,
  config: WorkerConfig
): Promise<void> {
  const cutoff = new Date(
    Date.now() - reclaimRenderingAfterMs(config.renderTimeoutMs)
  ).toISOString();

  for (;;) {
    const { data: clips, error } = await supabase
      .from("bundle_clips")
      .select("id, attempt_count, updated_at")
      .eq("render_status", "rendering")
      .lt("updated_at", cutoff)
      .order("updated_at", { ascending: true })
      .limit(LIFECYCLE_BATCH_SIZE);

    if (error) {
      console.error(`[lifecycle] stuck rendering query failed: ${error.message}`);
      return;
    }

    if (!clips?.length) return;

    for (const clip of clips) {
      const terminal = clip.attempt_count >= 2;
      const { data: updated, error: updateError } = await supabase
        .from("bundle_clips")
        .update({
          render_status: terminal ? "failed" : "pending",
          error_message: ORPHANED_RENDERING_ERROR,
          updated_at: new Date().toISOString(),
        })
        .eq("id", clip.id)
        .eq("render_status", "rendering")
        .eq("updated_at", clip.updated_at)
        .select("id")
        .maybeSingle();

      if (updateError) {
        console.error(
          `[lifecycle] reclaim failed for clip ${clip.id}: ${updateError.message}`
        );
        continue;
      }

      if (updated) {
        console.info(
          `[lifecycle] reclaimed stuck rendering clip ${clip.id} → ${terminal ? "failed" : "pending"}`
        );
      }
    }

    if (clips.length < LIFECYCLE_BATCH_SIZE) return;
  }
}

async function sweepExpiredClips(
  supabase: SupabaseClient,
  config: WorkerConfig
): Promise<void> {
  const cutoff = new Date(
    Date.now() - CLIP_RETENTION_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();

  for (;;) {
    const { data: clips, error } = await supabase
      .from("bundle_clips")
      .select("id, output_storage_path")
      .eq("render_status", "complete")
      .not("output_storage_path", "is", null)
      .lt("updated_at", cutoff)
      .order("updated_at", { ascending: true })
      .limit(LIFECYCLE_BATCH_SIZE);

    if (error) {
      console.error(`[lifecycle] expired clip query failed: ${error.message}`);
      return;
    }

    if (!clips?.length) return;

    for (const clip of clips) {
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

    if (clips.length < LIFECYCLE_BATCH_SIZE) return;
  }
}

async function sweepAbandonedSources(
  supabase: SupabaseClient,
  config: WorkerConfig
): Promise<void> {
  const cutoff = new Date(
    Date.now() - config.sourceGraceHours * 60 * 60 * 1000
  ).toISOString();

  for (;;) {
    const { data: bundles, error } = await supabase
      .from("bundles")
      .select("id, user_id, status, created_at")
      .in("status", ["pending", "failed"])
      .lt("created_at", cutoff)
      .order("created_at", { ascending: true })
      .limit(LIFECYCLE_BATCH_SIZE);

    if (error) {
      console.error(`[lifecycle] abandoned bundle query failed: ${error.message}`);
      return;
    }

    if (!bundles?.length) return;

    for (const bundle of bundles) {
      const { data: assets, error: assetsError } = await supabase
        .from("bundle_assets")
        .select("id, storage_path, metadata")
        .eq("bundle_id", bundle.id)
        .eq("kind", "video")
        .limit(LIFECYCLE_BATCH_SIZE);

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

    if (bundles.length < LIFECYCLE_BATCH_SIZE) return;
  }
}

async function sweepCompletedBundleSources(
  supabase: SupabaseClient,
  config: WorkerConfig
): Promise<void> {
  let offset = 0;

  for (;;) {
    const { data: videoAssets, error } = await supabase
      .from("bundle_assets")
      .select("id, bundle_id, storage_path, metadata")
      .eq("kind", "video")
      .not("storage_path", "is", null)
      .order("id", { ascending: true })
      .range(offset, offset + LIFECYCLE_BATCH_SIZE - 1);

    if (error) {
      console.error(`[lifecycle] video asset query failed: ${error.message}`);
      return;
    }

    if (!videoAssets?.length) return;

    for (const asset of videoAssets) {
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

    if (videoAssets.length < LIFECYCLE_BATCH_SIZE) return;
    offset += LIFECYCLE_BATCH_SIZE;
  }
}
