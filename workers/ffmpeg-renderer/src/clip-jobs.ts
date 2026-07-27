import type { SupabaseClient } from "@supabase/supabase-js";
import type { WorkerConfig } from "./config";
import type { BundleAssetRow, BundleClipRow } from "./types";

function metaObject(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function truncateErrorTail(message: string, maxLen = 500): string {
  if (message.length <= maxLen) return message;
  return message.slice(-maxLen);
}

export async function claimNextClip(
  supabase: SupabaseClient
): Promise<BundleClipRow | null> {
  const { data: candidates, error: selectError } = await supabase
    .from("bundle_clips")
    .select("*")
    .eq("render_status", "pending")
    .lt("attempt_count", 2)
    .order("updated_at", { ascending: true })
    .limit(1);

  if (selectError) {
    throw new Error(`Failed to select pending clip: ${selectError.message}`);
  }

  const candidate = candidates?.[0] as BundleClipRow | undefined;
  if (!candidate) return null;

  const { data: claimed, error: claimError } = await supabase
    .from("bundle_clips")
    .update({
      render_status: "rendering",
      attempt_count: candidate.attempt_count + 1,
      updated_at: new Date().toISOString(),
    })
    .eq("id", candidate.id)
    .eq("render_status", "pending")
    .select("*")
    .maybeSingle();

  if (claimError) {
    throw new Error(`Failed to claim clip ${candidate.id}: ${claimError.message}`);
  }

  return (claimed as BundleClipRow | null) ?? null;
}

export async function loadClipAsset(
  supabase: SupabaseClient,
  clip: BundleClipRow
): Promise<BundleAssetRow | null> {
  const { data, error } = await supabase
    .from("bundle_assets")
    .select("id, user_id, bundle_id, kind, storage_path, metadata")
    .eq("id", clip.asset_id)
    .eq("bundle_id", clip.bundle_id)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load asset ${clip.asset_id}: ${error.message}`);
  }

  return (data as BundleAssetRow | null) ?? null;
}

export async function markClipFailed(
  supabase: SupabaseClient,
  clipId: string,
  message: string
): Promise<void> {
  const { error } = await supabase
    .from("bundle_clips")
    .update({
      render_status: "failed",
      error_message: truncateErrorTail(message),
      updated_at: new Date().toISOString(),
    })
    .eq("id", clipId);

  if (error) {
    throw new Error(`Failed to mark clip ${clipId} failed: ${error.message}`);
  }
}

export async function markClipComplete(
  supabase: SupabaseClient,
  clipId: string,
  outputStoragePath: string
): Promise<void> {
  const { error } = await supabase
    .from("bundle_clips")
    .update({
      render_status: "complete",
      output_storage_path: outputStoragePath,
      error_message: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", clipId);

  if (error) {
    throw new Error(`Failed to mark clip ${clipId} complete: ${error.message}`);
  }
}

export async function handleRenderFailure(
  supabase: SupabaseClient,
  clip: BundleClipRow,
  message: string
): Promise<void> {
  if (clip.attempt_count >= 2) {
    await markClipFailed(supabase, clip.id, message);
    return;
  }

  const { error } = await supabase
    .from("bundle_clips")
    .update({
      render_status: "pending",
      error_message: truncateErrorTail(message),
      updated_at: new Date().toISOString(),
    })
    .eq("id", clip.id);

  if (error) {
    throw new Error(`Failed to reset clip ${clip.id} to pending: ${error.message}`);
  }
}

export async function preflightClip(
  supabase: SupabaseClient,
  clip: BundleClipRow,
  asset: BundleAssetRow | null
): Promise<string | null> {
  if (!asset) {
    return "Source video asset not found for clip";
  }

  if (asset.kind !== "video") {
    return "Clip asset is not a video";
  }

  const metadata = metaObject(asset.metadata);
  if (metadata.upload_verified !== true) {
    return "Source video upload was not verified — cannot render";
  }

  return null;
}

export async function processClaimedClip(params: {
  supabase: SupabaseClient;
  config: WorkerConfig;
  clip: BundleClipRow;
  renderClip: typeof import("./render").renderClip;
}): Promise<boolean> {
  const { supabase, config, clip, renderClip } = params;
  const asset = await loadClipAsset(supabase, clip);
  const preflightError = await preflightClip(supabase, clip, asset);

  if (preflightError) {
    await markClipFailed(supabase, clip.id, preflightError);
    console.info(`[clip ${clip.id}] preflight failed: ${preflightError}`);
    return false;
  }

  if (!asset) {
    return false;
  }

  try {
    const outputPath = await renderClip({ supabase, config, clip, asset });
    await markClipComplete(supabase, clip.id, outputPath);
    console.info(`[clip ${clip.id}] render complete → ${outputPath}`);
    return true;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Render failed";
    await handleRenderFailure(supabase, clip, message);
    console.error(`[clip ${clip.id}] render error: ${message}`);
    return false;
  }
}
