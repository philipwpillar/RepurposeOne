import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { purgeExpiredVoiceLabHits } from "@/lib/landing/voice-lab-rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Pending rows older than this are treated as stranded and settled to failed. */
const PENDING_ORPHAN_MAX_AGE_MS = 10 * 60 * 1000;

/**
 * Backup only — the ffmpeg worker reclaims accurately at 3× its own
 * RENDER_TIMEOUT_MS. That variable lives on Railway, not Vercel, so deriving
 * it here would silently drift. Deliberately generous.
 */
const RENDERING_ORPHAN_MAX_AGE_MS = 60 * 60 * 1000;

/**
 * Distinguishable from generation failures / client aborts so ops can query:
 *   select * from repurposes where error_message like 'orphaned_pending:%'
 * Not exported — Next.js route modules may only export route handlers / config.
 */
const ORPHANED_PENDING_ERROR =
  "orphaned_pending: settled by sweeper after 10m";

const ORPHANED_BUNDLE_ERROR =
  "orphaned_pending: settled by sweeper after 10m";

const ORPHANED_RENDERING_ERROR =
  "orphaned_rendering: reclaimed by sweeper after render timeout margin";

function authorizeCron(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return false;

  const provided = header.slice("Bearer ".length);
  const expected = Buffer.from(secret);
  const actual = Buffer.from(provided);
  if (expected.length !== actual.length) return false;
  return timingSafeEqual(expected, actual);
}

/**
 * GET /api/cron/sweep-pending-repurposes
 *
 * Settles stranded `repurposes` / `bundles` orphans and reclaim stuck
 * `bundle_clips.rendering` rows, and purge expired `voice_lab_hits` (48h).
 * Vercel Hobby only allows daily crons —
 * schedule this endpoint more frequently via GitHub Actions (or Pro cron /
 * external scheduler) using Authorization: Bearer $CRON_SECRET.
 */
export async function GET(request: Request) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch (err) {
    console.error("sweep-pending-repurposes: admin client unavailable", err);
    return NextResponse.json(
      { error: "Admin client unavailable" },
      { status: 500 }
    );
  }

  const cutoffIso = new Date(Date.now() - PENDING_ORPHAN_MAX_AGE_MS).toISOString();

  const { data, error } = await admin
    .from("repurposes")
    .update({
      status: "failed",
      error_message: ORPHANED_PENDING_ERROR,
    })
    .eq("status", "pending")
    .lt("created_at", cutoffIso)
    .select("id");

  if (error) {
    console.error("sweep-pending-repurposes: update failed", error);
    return NextResponse.json(
      { error: "Failed to sweep pending reservations" },
      { status: 500 }
    );
  }

  const settled = data?.length ?? 0;
  if (settled > 0) {
    console.info(
      `sweep-pending-repurposes: settled ${settled} orphaned pending row(s) older than ${cutoffIso}`
    );
  }

  const { data: bundleData, error: bundleError } = await admin
    .from("bundles")
    .update({
      status: "failed",
      error_message: ORPHANED_BUNDLE_ERROR,
      updated_at: new Date().toISOString(),
    })
    .in("status", ["pending", "analyzing"])
    .lt("created_at", cutoffIso)
    .select("id");

  if (bundleError) {
    console.error("sweep-pending-repurposes: bundle update failed", bundleError);
    return NextResponse.json(
      { error: "Failed to sweep orphaned bundles" },
      { status: 500 }
    );
  }

  const bundlesSettled = bundleData?.length ?? 0;
  if (bundlesSettled > 0) {
    console.info(
      `sweep-pending-repurposes: settled ${bundlesSettled} orphaned bundle(s) older than ${cutoffIso}`
    );
  }

  // H2 backup (also runs in the ffmpeg worker lifecycle). Fixed 60m threshold —
  // do not derive from Railway's RENDER_TIMEOUT_MS (absent on Vercel).
  const renderingCutoff = new Date(
    Date.now() - RENDERING_ORPHAN_MAX_AGE_MS
  ).toISOString();

  const { data: stuckClips, error: stuckSelectError } = await admin
    .from("bundle_clips")
    .select("id, attempt_count, updated_at")
    .eq("render_status", "rendering")
    .lt("updated_at", renderingCutoff)
    .limit(200);

  if (stuckSelectError) {
    console.error(
      "sweep-pending-repurposes: stuck rendering select failed",
      stuckSelectError
    );
    return NextResponse.json(
      { error: "Failed to select stuck rendering clips" },
      { status: 500 }
    );
  }

  let clipsReclaimed = 0;
  for (const clip of stuckClips ?? []) {
    const terminal = (clip.attempt_count ?? 0) >= 2;
    const { data: updated, error: reclaimError } = await admin
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

    if (reclaimError) {
      console.error(
        `sweep-pending-repurposes: reclaim failed for ${clip.id}`,
        reclaimError
      );
      continue;
    }
    if (updated) clipsReclaimed += 1;
  }

  if (clipsReclaimed > 0) {
    console.info(
      `sweep-pending-repurposes: reclaimed ${clipsReclaimed} stuck rendering clip(s)`
    );
  }

  let voiceLabHitsPurged = 0;
  try {
    voiceLabHitsPurged = await purgeExpiredVoiceLabHits(admin);
    if (voiceLabHitsPurged > 0) {
      console.info(
        `sweep-pending-repurposes: purged ${voiceLabHitsPurged} voice_lab_hits row(s) older than 48h`
      );
    }
  } catch (purgeErr) {
    console.error(
      "sweep-pending-repurposes: voice_lab_hits purge failed",
      purgeErr
    );
    return NextResponse.json(
      { error: "Failed to purge voice_lab_hits" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    settled,
    bundles_settled: bundlesSettled,
    clips_reclaimed: clipsReclaimed,
    voice_lab_hits_purged: voiceLabHitsPurged,
    cutoff: cutoffIso,
    rendering_cutoff: renderingCutoff,
    error_message: ORPHANED_PENDING_ERROR,
  });
}
