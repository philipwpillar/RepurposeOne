import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  BundleStatusResponseSchema,
  type BundleClipStatus,
} from "@/types";

/** Signed download URL TTL - matches prepare's short-lived upload URL pattern. */
const SIGNED_DOWNLOAD_TTL_SECONDS = 600;

type ClipRow = {
  id: string;
  asset_id: string;
  start_s: number;
  end_s: number;
  overlay_text: string | null;
  caption: string | null;
  tags: string[] | null;
  render_status: string;
  output_storage_path: string | null;
  error_message: string | null;
};

type VideoAssetRow = {
  id: string;
  sort_order: number;
};

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const idParsed = z.string().uuid().safeParse(id);
  if (!idParsed.success) {
    return NextResponse.json({ error: "Invalid bundle id" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 }
    );
  }

  const { data: bundle, error: bundleError } = await supabase
    .from("bundles")
    .select("id, status")
    .eq("id", idParsed.data)
    .eq("user_id", user.id)
    .single();

  if (bundleError || !bundle) {
    return NextResponse.json({ error: "Bundle not found" }, { status: 404 });
  }

  const { data: clipRows, error: clipsError } = await supabase
    .from("bundle_clips")
    .select(
      "id, asset_id, start_s, end_s, overlay_text, caption, tags, render_status, output_storage_path, error_message"
    )
    .eq("bundle_id", bundle.id)
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  if (clipsError) {
    console.error("Failed to load bundle_clips:", clipsError);
    return NextResponse.json(
      { error: "Failed to load clips" },
      { status: 500 }
    );
  }

  // video_index is not stored on bundle_clips - derive it as the clip's
  // asset position among this bundle's video-kind assets ordered by sort_order
  // (upload order), matching generate's videos[] indexing.
  const { data: videoAssets, error: assetsError } = await supabase
    .from("bundle_assets")
    .select("id, sort_order")
    .eq("bundle_id", bundle.id)
    .eq("user_id", user.id)
    .eq("kind", "video")
    .order("sort_order", { ascending: true });

  if (assetsError) {
    console.error("Failed to load video bundle_assets:", assetsError);
    return NextResponse.json(
      { error: "Failed to load video assets" },
      { status: 500 }
    );
  }

  const videoIndexByAssetId = new Map(
    ((videoAssets ?? []) as VideoAssetRow[]).map((asset, index) => [
      asset.id,
      index,
    ])
  );

  let admin;
  try {
    admin = createAdminClient();
  } catch (err) {
    console.error("Admin client unavailable for signed download URLs:", err);
    return NextResponse.json(
      { error: "Storage signing unavailable" },
      { status: 500 }
    );
  }

  const clips: BundleClipStatus[] = [];

  for (const row of (clipRows ?? []) as ClipRow[]) {
    const videoIndex = videoIndexByAssetId.get(row.asset_id);
    if (videoIndex === undefined) {
      console.warn(
        `bundle_clips ${row.id}: asset_id ${row.asset_id} not among video assets - video_index defaulting to 0`
      );
    }

    let downloadUrl: string | undefined;
    if (
      row.render_status === "complete" &&
      row.output_storage_path
    ) {
      const { data: signed, error: signError } = await admin.storage
        .from("bundle-media")
        .createSignedUrl(row.output_storage_path, SIGNED_DOWNLOAD_TTL_SECONDS);

      if (signError || !signed?.signedUrl) {
        console.error(
          `Failed to sign download URL for clip ${row.id}:`,
          signError
        );
      } else {
        downloadUrl = signed.signedUrl;
      }
    }
    // complete + null output_storage_path → expired (retention sweep); omit URL

    clips.push({
      clip_id: row.id,
      video_index: videoIndex ?? 0,
      start_s: Number(row.start_s),
      end_s: Number(row.end_s),
      overlay_text: row.overlay_text,
      caption: row.caption ?? "",
      tags: row.tags ?? [],
      render_status: row.render_status as BundleClipStatus["render_status"],
      error_message: row.error_message,
      ...(downloadUrl ? { download_url: downloadUrl } : {}),
    });
  }

  const response = {
    bundle: { id: bundle.id, status: bundle.status },
    clips,
  };

  const validated = BundleStatusResponseSchema.safeParse(response);
  if (!validated.success) {
    console.error(
      "Bundle status response failed validation:",
      validated.error.issues
    );
    return NextResponse.json(
      { error: "Invalid status payload" },
      { status: 500 }
    );
  }

  return NextResponse.json(validated.data);
}
