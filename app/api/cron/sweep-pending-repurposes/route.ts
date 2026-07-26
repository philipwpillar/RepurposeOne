import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Pending rows older than this are treated as stranded and settled to failed. */
const PENDING_ORPHAN_MAX_AGE_MS = 10 * 60 * 1000;

/**
 * Distinguishable from generation failures / client aborts so ops can query:
 *   select * from repurposes where error_message like 'orphaned_pending:%'
 * Not exported — Next.js route modules may only export route handlers / config.
 */
const ORPHANED_PENDING_ERROR =
  "orphaned_pending: settled by sweeper after 10m";

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
 * Settles stranded `repurposes` rows left in `pending` (e.g. client disconnect
 * on the non-streaming path before the row was updated to complete/failed).
 * Pending rows count toward monthly quota via DISTINCT generation_id — this
 * sweeper does not change that SQL; it only moves aged orphans to `failed`
 * so they stop consuming quota.
 *
 * Auth: Authorization: Bearer $CRON_SECRET (Vercel Cron injects this).
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

  return NextResponse.json({
    ok: true,
    settled,
    cutoff: cutoffIso,
    error_message: ORPHANED_PENDING_ERROR,
  });
}
