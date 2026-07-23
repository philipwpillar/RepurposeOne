import { NextResponse } from "next/server";
import { BUNDLE_MONTHLY_LIMIT, planAllowsBundles } from "@/lib/config";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  checkBundlePrepareRateLimit,
  getUpgradeMessage,
  getUserPlan,
  QuotaExceededError,
  reserveBundleUnderCap,
} from "@/lib/usage";
import {
  buildSourceStoragePath,
  videoMimeFromFilename,
} from "@/lib/video/storage-path";
import {
  BundlePrepareRequestSchema,
  type BundlePrepareErrorResponse,
} from "@/types";

function errorResponse(
  status: number,
  body: BundlePrepareErrorResponse
): NextResponse {
  return NextResponse.json(body, { status });
}

/**
 * POST /api/bundles/prepare
 *
 * Brief 3a: create a pending bundle + video asset rows, then issue signed
 * upload URLs (service role). Client PUTs raw files directly to Storage.
 * Gates: auth → plan → rate → N2 (pending counts toward cap). No generation
 * usage check — preparing does not bill.
 */
export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return errorResponse(401, {
      error: "Authentication required",
      code: "unauthorized",
    });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse(400, {
      error: "Invalid JSON body",
      code: "validation_error",
    });
  }

  const parsed = BundlePrepareRequestSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(400, {
      error: parsed.error.issues.map((i) => i.message).join("; "),
      code: "validation_error",
    });
  }

  const { videos } = parsed.data;

  let plan;
  try {
    plan = await getUserPlan(supabase, user.id);
  } catch (err) {
    console.error("Failed to load user plan:", err);
    return errorResponse(500, {
      error: "Failed to load plan",
      code: "internal_error",
    });
  }

  if (!planAllowsBundles(plan)) {
    return errorResponse(403, {
      error:
        "Moment Bundles are available on Pro Plus. Upgrade to create photo packs.",
      code: "plan_required",
      upgrade_message: getUpgradeMessage(plan),
    });
  }

  let rateCheck;
  try {
    rateCheck = await checkBundlePrepareRateLimit(supabase, user.id, plan);
  } catch (err) {
    console.error("Rate limit check failed:", err);
    return errorResponse(500, {
      error: "Failed to check rate limits",
      code: "internal_error",
    });
  }

  if (!rateCheck.allowed) {
    return errorResponse(429, {
      error: `Too many generation requests. Please wait ${Math.ceil(rateCheck.retryAfterSeconds / 60)} minutes before trying again.`,
      code: "rate_limited",
      retry_after_seconds: rateCheck.retryAfterSeconds,
    });
  }

  // N2 — atomically reserve a pending bundle under the monthly cap
  let admin;
  try {
    admin = createAdminClient();
  } catch (err) {
    console.error("Admin client unavailable:", err);
    return errorResponse(500, {
      error: "Failed to create bundle record",
      code: "internal_error",
    });
  }

  let bundle: { id: string };
  try {
    bundle = await reserveBundleUnderCap(admin, {
      userId: user.id,
      limit: BUNDLE_MONTHLY_LIMIT,
      status: "pending",
      title: null,
      context: null,
    });
  } catch (err) {
    if (err instanceof QuotaExceededError) {
      return errorResponse(402, {
        error: `Monthly Moment Bundle limit reached (${BUNDLE_MONTHLY_LIMIT}/month on Pro Plus).`,
        code: "bundle_limit_reached",
        upgrade_message: getUpgradeMessage(plan),
      });
    }
    console.error("Failed to insert pending bundle:", err);
    return errorResponse(500, {
      error: "Failed to create bundle record",
      code: "internal_error",
    });
  }

  const assetRows = videos.map((video, index) => {
    const assetId = crypto.randomUUID();
    const storagePath = buildSourceStoragePath({
      userId: user.id,
      bundleId: bundle.id,
      assetId,
      filename: video.filename,
    });
    return {
      id: assetId,
      user_id: user.id,
      bundle_id: bundle.id,
      kind: "video" as const,
      storage_path: storagePath,
      mime_type: videoMimeFromFilename(video.filename),
      duration_s: video.duration_s,
      sort_order: index,
      metadata: {
        filename: video.filename,
        size_bytes: video.size_bytes,
      },
    };
  });

  const { data: insertedAssets, error: assetsInsertError } = await admin
    .from("bundle_assets")
    .insert(assetRows)
    .select("id, storage_path");

  if (assetsInsertError || !insertedAssets) {
    console.error("Failed to insert video assets:", assetsInsertError);
    await admin
      .from("bundles")
      .update({
        status: "failed",
        error_message: "Failed to create video assets",
        updated_at: new Date().toISOString(),
      })
      .eq("id", bundle.id)
      .eq("user_id", user.id);

    return errorResponse(500, {
      error: "Failed to create video assets",
      code: "internal_error",
    });
  }

  // Preserve request order (insert select order is not guaranteed).
  const byId = new Map(insertedAssets.map((a) => [a.id, a]));
  const orderedAssets: Array<{ id: string; storage_path: string }> = [];
  for (const row of assetRows) {
    const inserted = byId.get(row.id);
    if (!inserted?.storage_path) {
      console.error("Missing inserted asset after prepare:", row.id);
      await admin
        .from("bundles")
        .update({
          status: "failed",
          error_message: "Failed to create video assets",
          updated_at: new Date().toISOString(),
        })
        .eq("id", bundle.id)
        .eq("user_id", user.id);

      return errorResponse(500, {
        error: "Failed to create video assets",
        code: "internal_error",
      });
    }
    orderedAssets.push({
      id: inserted.id,
      storage_path: inserted.storage_path,
    });
  }

  const uploads: Array<{
    asset_id: string;
    storage_path: string;
    signed_url: string;
    token: string;
  }> = [];

  try {
    for (const asset of orderedAssets) {
      const { data, error } = await admin.storage
        .from("bundle-media")
        .createSignedUploadUrl(asset.storage_path);

      if (error || !data?.signedUrl || !data.token) {
        throw error ?? new Error("createSignedUploadUrl returned empty");
      }

      uploads.push({
        asset_id: asset.id,
        storage_path: asset.storage_path,
        signed_url: data.signedUrl,
        token: data.token,
      });
    }
  } catch (err) {
    console.error("Failed to create signed upload URLs:", err);
    await admin
      .from("bundles")
      .update({
        status: "failed",
        error_message: "Failed to create signed upload URLs",
        updated_at: new Date().toISOString(),
      })
      .eq("id", bundle.id)
      .eq("user_id", user.id);

    return errorResponse(500, {
      error: "Failed to prepare video uploads",
      code: "internal_error",
    });
  }

  return NextResponse.json({
    bundle_id: bundle.id,
    uploads,
  });
}
