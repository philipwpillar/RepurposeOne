export type RenderStatus = "pending" | "rendering" | "complete" | "failed";

export interface BundleClipRow {
  id: string;
  user_id: string;
  bundle_id: string;
  asset_id: string;
  start_s: number;
  end_s: number;
  overlay_text: string;
  render_status: RenderStatus;
  output_storage_path: string | null;
  error_message: string | null;
  attempt_count: number;
  updated_at: string;
}

export interface BundleAssetRow {
  id: string;
  user_id: string;
  bundle_id: string;
  kind: string;
  storage_path: string | null;
  metadata: Record<string, unknown> | null;
}

export interface HealthSnapshot {
  uptimeSeconds: number;
  lastPollAt: string | null;
  clipsRendered: number;
  lastError: string | null;
}
