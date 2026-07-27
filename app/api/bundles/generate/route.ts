import { NextResponse } from "next/server";
import { runBundleGeneration } from "@/lib/ai/bundle-generate";
import { fetchVoiceExemplarsText } from "@/lib/ai/exemplars";
import { generateRepurpose } from "@/lib/ai/generate";
import {
  AI_CONFIG,
  BUNDLE_MONTHLY_LIMIT,
  planAllowsBundles,
} from "@/lib/config";
import type { PhotoMimeType } from "@/lib/image/constants";
import { resolveDefaultBrandVoice } from "@/lib/repurpose/brand-voice";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  checkBundleGenerateRateLimit,
  checkRateLimit,
  checkUsageLimit,
  getUpgradeMessage,
  getUserPlan,
  QuotaExceededError,
  reserveBundleUnderCap,
  reservePendingRepurpose,
} from "@/lib/usage";
import { bundleMediaObjectExists } from "@/lib/video/storage-verify";
import {
  BundleGenerateRequestSchema,
  type BundleClipSpec,
  type BundleGenerateErrorResponse,
  type BundleRepurposeResult,
  type TargetFormat,
} from "@/types";

export const maxDuration = 280;

/** ~4MB raw body — headroom under Vercel limits for 8 photos + ≤8 sheets. */
const MAX_BODY_BYTES = 4_000_000;

const ALL_FORMATS: TargetFormat[] = [
  "x_thread",
  "linkedin",
  "instagram",
  "email",
];

function errorResponse(
  status: number,
  body: BundleGenerateErrorResponse
): NextResponse {
  return NextResponse.json(body, { status });
}

function toUserFacingBundleError(err: unknown): string {
  if (!(err instanceof Error)) {
    return "Bundle generation failed unexpectedly. Please try again — this attempt won't count toward your monthly limit.";
  }

  const msg = err.message.toLowerCase();

  if (msg.includes("timeout") || msg.includes("timed out")) {
    return "Bundle generation timed out. Try again with fewer photos — this attempt won't count toward your monthly limit.";
  }

  if (msg.includes("429") || msg.includes("provider returned error")) {
    return "The AI service is temporarily busy. Please wait a minute and try again.";
  }

  if (msg.includes("rate") && msg.includes("limit")) {
    return "The AI service is temporarily busy. Please wait a minute and try again.";
  }

  if (
    msg.includes("invalid") ||
    msg.includes("validation") ||
    msg.includes("parse")
  ) {
    return "The AI returned an unexpected format. Please try again — this attempt won't count toward your monthly limit.";
  }

  return "We couldn't generate your Moment Bundle. Please try again — this attempt won't count toward your monthly limit.";
}

function mimeFromFilename(filename?: string): PhotoMimeType {
  const lower = (filename ?? "").toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  return "image/jpeg";
}

function metaObject(metadata: unknown): Record<string, unknown> {
  return metadata && typeof metadata === "object"
    ? { ...(metadata as Record<string, unknown>) }
    : {};
}

/**
 * POST /api/bundles/generate
 *
 * Moment Bundle (Brief 1b photos + Brief 2c/3a video):
 * auth → plan → rate → generation cap → N2 (new bundles only) → analyze →
 * optional clip persistence for verified uploads → format fan-out.
 * Photo-only requests without bundle_id behave as in 1c.
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

  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (contentLength > MAX_BODY_BYTES) {
    return errorResponse(413, {
      error:
        "Request is too large. Use fewer photos/videos or shorter clips, then try again.",
      code: "validation_error",
    });
  }

  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch {
    return errorResponse(400, {
      error: "Invalid request body",
      code: "validation_error",
    });
  }

  if (rawBody.length > MAX_BODY_BYTES) {
    return errorResponse(413, {
      error:
        "Request is too large. Use fewer photos/videos or shorter clips, then try again.",
      code: "validation_error",
    });
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return errorResponse(400, {
      error: "Invalid JSON body",
      code: "validation_error",
    });
  }

  const parsed = BundleGenerateRequestSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(400, {
      error: parsed.error.issues.map((i) => i.message).join("; "),
      code: "validation_error",
    });
  }

  const requestData = parsed.data;
  const formats = requestData.formats?.length
    ? requestData.formats
    : ALL_FORMATS;
  const photos = requestData.photos ?? [];
  const videos = requestData.videos ?? [];
  const preparedBundleId = requestData.bundle_id;

  if (preparedBundleId) {
    if (videos.length === 0) {
      return errorResponse(400, {
        error: "Prepared bundles require at least one video with asset_id",
        code: "validation_error",
      });
    }
    for (const video of videos) {
      if (!video.asset_id) {
        return errorResponse(400, {
          error: "Each video must include asset_id when bundle_id is set",
          code: "validation_error",
        });
      }
    }
  }

  for (const photo of photos) {
    if (photo.data.length > AI_CONFIG.maxImageBase64Chars) {
      return errorResponse(400, {
        error: "Image is too large after processing. Try a smaller photo.",
        code: "validation_error",
      });
    }
  }

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
    rateCheck = await checkRateLimit(supabase, user.id, plan);
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

  let bundleRateCheck;
  try {
    bundleRateCheck = await checkBundleGenerateRateLimit(
      supabase,
      user.id,
      plan
    );
  } catch (err) {
    console.error("Bundle generate rate limit check failed:", err);
    return errorResponse(500, {
      error: "Failed to check rate limits",
      code: "internal_error",
    });
  }

  if (!bundleRateCheck.allowed) {
    return errorResponse(429, {
      error: `Too many Moment Bundle requests. Please wait ${Math.ceil(bundleRateCheck.retryAfterSeconds / 60)} minutes before trying again.`,
      code: "rate_limited",
      retry_after_seconds: bundleRateCheck.retryAfterSeconds,
    });
  }

  let usageCheck;
  try {
    usageCheck = await checkUsageLimit(supabase, user.id);
  } catch (err) {
    console.error("Usage check failed:", err);
    return errorResponse(500, {
      error: "Failed to check usage limits",
      code: "internal_error",
    });
  }

  if (!usageCheck.allowed) {
    return errorResponse(402, {
      error: "Monthly repurpose limit reached",
      code: "limit_exceeded",
      usage: usageCheck.usage,
      upgrade_message: getUpgradeMessage(usageCheck.usage.plan),
    });
  }

  const { voice: resolvedVoice, brandVoiceId } =
    await resolveDefaultBrandVoice(supabase, user.id);

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

  let bundle: { id: string; generation_id: string };

  if (preparedBundleId) {
    const { data: existing, error: loadError } = await supabase
      .from("bundles")
      .select("id, generation_id, status, user_id")
      .eq("id", preparedBundleId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (loadError) {
      console.error("Failed to load prepared bundle:", loadError);
      return errorResponse(500, {
        error: "Failed to load prepared bundle",
        code: "internal_error",
      });
    }

    if (!existing) {
      return errorResponse(409, {
        error: "Prepared bundle not found or not owned by you",
        code: "conflict",
      });
    }

    if (existing.status !== "pending") {
      return errorResponse(409, {
        error: `Prepared bundle is not pending (status: ${existing.status})`,
        code: "conflict",
      });
    }

    const assetIds = videos.map((v) => v.asset_id as string);
    const { data: ownedAssets, error: assetCheckError } = await supabase
      .from("bundle_assets")
      .select("id")
      .eq("bundle_id", existing.id)
      .eq("user_id", user.id)
      .eq("kind", "video")
      .in("id", assetIds);

    if (assetCheckError) {
      console.error("Failed to verify video assets:", assetCheckError);
      return errorResponse(500, {
        error: "Failed to verify video assets",
        code: "internal_error",
      });
    }

    const owned = new Set((ownedAssets ?? []).map((a) => a.id));
    for (const id of assetIds) {
      if (!owned.has(id)) {
        return errorResponse(400, {
          error: "One or more asset_id values do not belong to this bundle",
          code: "validation_error",
        });
      }
    }

    const { data: updated, error: updateError } = await admin
      .from("bundles")
      .update({
        title: requestData.title ?? null,
        context: requestData.context,
        status: "analyzing",
        error_message: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id)
      .eq("user_id", user.id)
      .eq("status", "pending")
      .select("id, generation_id")
      .maybeSingle();

    if (updateError) {
      console.error("Failed to claim prepared bundle:", updateError);
      return errorResponse(500, {
        error: "Failed to claim prepared bundle",
        code: "internal_error",
      });
    }

    if (!updated) {
      return errorResponse(409, {
        error: "Prepared bundle is no longer pending",
        code: "conflict",
      });
    }

    bundle = updated;
  } else {
    // N2 — atomically reserve under monthly cap for new (non-prepared) bundles
    try {
      bundle = await reserveBundleUnderCap(admin, {
        userId: user.id,
        limit: BUNDLE_MONTHLY_LIMIT,
        status: "analyzing",
        title: requestData.title ?? null,
        context: requestData.context,
      });
    } catch (err) {
      if (err instanceof QuotaExceededError) {
        return errorResponse(402, {
          error: `Monthly Moment Bundle limit reached (${BUNDLE_MONTHLY_LIMIT}/month on Pro Plus).`,
          code: "bundle_limit_reached",
          usage: usageCheck.usage,
          upgrade_message: getUpgradeMessage(plan),
        });
      }
      console.error("Failed to insert bundle:", err);
      return errorResponse(500, {
        error: "Failed to create bundle record",
        code: "internal_error",
      });
    }
  }

  const assetRows = photos.map((photo, index) => ({
    user_id: user.id,
    bundle_id: bundle.id,
    kind: "photo" as const,
    storage_path: null,
    mime_type: mimeFromFilename(photo.filename),
    sort_order: index,
    metadata: photo.filename ? { filename: photo.filename } : {},
  }));

  let assets: Array<{
    id: string;
    sort_order: number;
    metadata: unknown;
  }> = [];

  if (assetRows.length > 0) {
    const { data: insertedAssets, error: assetsInsertError } = await admin
      .from("bundle_assets")
      .insert(assetRows)
      .select("id, sort_order, metadata");

    if (assetsInsertError || !insertedAssets) {
      console.error("Failed to insert bundle assets:", assetsInsertError);
      await admin
        .from("bundles")
        .update({
          status: "failed",
          error_message: "Failed to create bundle assets",
          updated_at: new Date().toISOString(),
        })
        .eq("id", bundle.id)
        .eq("user_id", user.id);

      return errorResponse(500, {
        error: "Failed to create bundle assets",
        code: "internal_error",
      });
    }
    assets = insertedAssets;
  }

  // Reserve generation quota under advisory lock BEFORE vision spend.
  // Shared generation_id preserves DISTINCT billing unit (idempotent count).
  const reservedByFormat = new Map<TargetFormat, string>();
  const reservedIds: string[] = [];

  const failReservedAndBundle = async (message: string) => {
    if (reservedIds.length > 0) {
      await admin
        .from("repurposes")
        .update({
          status: "failed",
          error_message: message,
        })
        .in("id", reservedIds)
        .eq("user_id", user.id);
    }
    await admin
      .from("bundles")
      .update({
        status: "failed",
        error_message: message,
        updated_at: new Date().toISOString(),
      })
      .eq("id", bundle.id)
      .eq("user_id", user.id);
  };

  try {
    for (const targetFormat of formats) {
      const reserved = await reservePendingRepurpose(admin, {
        userId: user.id,
        limit: usageCheck.usage.limit,
        inputType: "paste",
        inputContent: requestData.context,
        brandVoiceId,
        targetFormat,
        generationId: bundle.generation_id,
      });
      reservedIds.push(reserved.id);
      reservedByFormat.set(targetFormat, reserved.id);
    }

    if (reservedIds.length > 0) {
      const { error: linkError } = await admin
        .from("repurposes")
        .update({ bundle_id: bundle.id })
        .in("id", reservedIds)
        .eq("user_id", user.id);
      if (linkError) {
        throw new Error(linkError.message);
      }
    }
  } catch (err) {
    if (err instanceof QuotaExceededError) {
      await failReservedAndBundle("quota_exceeded");
      return errorResponse(402, {
        error: "Monthly repurpose limit reached",
        code: "limit_exceeded",
        usage: usageCheck.usage,
        upgrade_message: getUpgradeMessage(usageCheck.usage.plan),
      });
    }
    console.error("Failed to reserve bundle format rows:", err);
    await failReservedAndBundle(
      err instanceof Error ? err.message : "Failed to reserve formats"
    );
    return errorResponse(500, {
      error: "Failed to reserve generation quota",
      code: "internal_error",
    });
  }

  let orchestration;
  try {
    orchestration = await runBundleGeneration({
      photos: photos.map((photo) => ({
        data: photo.data,
        filename: photo.filename,
        mime: mimeFromFilename(photo.filename),
      })),
      videos,
      context: requestData.context,
      brandVoice: resolvedVoice,
    });
  } catch (err) {
    const message = toUserFacingBundleError(err);
    await failReservedAndBundle(
      err instanceof Error ? err.message : message
    );

    console.error(`Bundle analysis failed for ${bundle.id}:`, err);

    return errorResponse(502, {
      error: message,
      code: "generation_failed",
    });
  }

  const { pack, tokenTotals, visionModel } = orchestration;
  const assetsByUploadIndex = new Map(
    assets.map((a) => [a.sort_order as number, a])
  );

  // Persist captions + alt_text; reorder sort_order from posting_order
  for (let position = 0; position < pack.posting_order.length; position++) {
    const photoIndex = pack.posting_order[position];
    const asset = assetsByUploadIndex.get(photoIndex);
    if (!asset) continue;

    const caption = pack.photo_captions.find(
      (c) => c.photo_index === photoIndex
    );
    const prevMeta = metaObject(asset.metadata);

    await admin
      .from("bundle_assets")
      .update({
        sort_order: position,
        metadata: {
          ...prevMeta,
          ...(caption
            ? { caption: caption.caption, alt_text: caption.alt_text }
            : {}),
        },
      })
      .eq("id", asset.id)
      .eq("user_id", user.id);
  }

  // Also update captions for any photo not listed in posting_order
  for (const caption of pack.photo_captions) {
    const asset = assetsByUploadIndex.get(caption.photo_index);
    if (!asset) continue;
    if (pack.posting_order.includes(caption.photo_index)) continue;

    const prevMeta = metaObject(asset.metadata);

    await admin
      .from("bundle_assets")
      .update({
        metadata: {
          ...prevMeta,
          caption: caption.caption,
          alt_text: caption.alt_text,
        },
      })
      .eq("id", asset.id)
      .eq("user_id", user.id);
  }

  // Brief 3a: verify uploads then persist bundle_clips for verified sources only
  let responseClipSpecs: BundleClipSpec[] = pack.clip_specs;

  if (preparedBundleId) {
    const videoAssetIds = [
      ...new Set(
        videos
          .map((v) => v.asset_id)
          .filter((id): id is string => typeof id === "string")
      ),
    ];

    const { data: videoAssets, error: videoAssetsError } = await supabase
      .from("bundle_assets")
      .select("id, storage_path, metadata")
      .eq("bundle_id", bundle.id)
      .eq("user_id", user.id)
      .eq("kind", "video")
      .in("id", videoAssetIds);

    if (videoAssetsError) {
      console.error(
        "Failed to load video assets for clip persist:",
        videoAssetsError
      );
    }

    const assetById = new Map(
      (videoAssets ?? []).map((a) => [
        a.id as string,
        {
          id: a.id as string,
          storage_path: a.storage_path as string | null,
          metadata: a.metadata,
        },
      ])
    );

    const verifiedAssetIds = new Set<string>();

    for (const assetId of videoAssetIds) {
      const asset = assetById.get(assetId);
      const prevMeta = metaObject(asset?.metadata);
      const exists =
        asset?.storage_path
          ? await bundleMediaObjectExists(admin, asset.storage_path)
          : false;

      if (asset) {
        await admin
          .from("bundle_assets")
          .update({
            metadata: {
              ...prevMeta,
              upload_verified: exists,
            },
          })
          .eq("id", asset.id)
          .eq("user_id", user.id);
      }

      if (exists) {
        verifiedAssetIds.add(assetId);
      } else {
        console.info(
          `[bundle] video asset ${assetId} missing from storage — clips not persisted`
        );
      }
    }

    if (pack.clip_specs.length > 0) {
      const clipRows: Array<{
        user_id: string;
        bundle_id: string;
        asset_id: string;
        start_s: number;
        end_s: number;
        overlay_text: string;
        caption: string;
        tags: string[];
        render_status: "pending";
      }> = [];

      const clipSpecIndexes: number[] = [];

      pack.clip_specs.forEach((spec, index) => {
        const assetId = videos[spec.video_index]?.asset_id;
        if (!assetId || !verifiedAssetIds.has(assetId)) {
          if (!assetId) {
            console.info(
              `[bundle] clip_spec video_index ${spec.video_index} has no uploaded asset — not persisted`
            );
          }
          return;
        }

        clipSpecIndexes.push(index);
        clipRows.push({
          user_id: user.id,
          bundle_id: bundle.id,
          asset_id: assetId,
          start_s: spec.start_s,
          end_s: spec.end_s,
          overlay_text: spec.overlay_text,
          caption: spec.caption,
          tags: spec.tags,
          render_status: "pending",
        });
      });

      if (clipRows.length > 0) {
        const { data: insertedClips, error: clipsInsertError } = await admin
          .from("bundle_clips")
          .insert(clipRows)
          .select("id");

        if (clipsInsertError || !insertedClips) {
          console.error("Failed to insert bundle_clips:", clipsInsertError);
          await failReservedAndBundle(
            clipsInsertError?.message ?? "Failed to persist bundle clips"
          );
          return errorResponse(502, {
            error:
              "We couldn't save your clip suggestions. Please try again — this attempt won't count toward your monthly limit.",
            code: "generation_failed",
          });
        }

        responseClipSpecs = pack.clip_specs.map((spec, index) => {
          const rowPos = clipSpecIndexes.indexOf(index);
          if (rowPos < 0) return spec;
          const clipId = insertedClips[rowPos]?.id as string | undefined;
          return clipId ? { ...spec, clip_id: clipId } : spec;
        });
      }
    }
  } else if (pack.clip_specs.length > 0) {
    for (const spec of pack.clip_specs) {
      if (!videos[spec.video_index]?.asset_id) {
        console.info(
          `[bundle] clip_spec video_index ${spec.video_index} has no uploaded asset — not persisted`
        );
      }
    }
  }

  const inputContent = `${pack.post_brief}\n\n${requestData.context}`;

  if (reservedIds.length > 0) {
    await admin
      .from("repurposes")
      .update({ input_content: inputContent })
      .in("id", reservedIds)
      .eq("user_id", user.id);
  }

  const formatOutcomes = await Promise.all(
    formats.map(async (targetFormat) => {
      const exemplarsText = await fetchVoiceExemplarsText(
        supabase,
        user.id,
        targetFormat
      );

      const repurposeId = reservedByFormat.get(targetFormat);
      if (!repurposeId) {
        console.error(
          `Missing reserved repurpose for format ${targetFormat} on bundle ${bundle.id}`
        );
        return null;
      }

      try {
        const result = await generateRepurpose({
          inputContent,
          brandVoice: resolvedVoice,
          targetFormat,
          exemplarsText: exemplarsText || undefined,
        });

        const { error: updateError } = await admin
          .from("repurposes")
          .update({
            output: result.output,
            status: "complete",
            error_message: null,
            tokens_used: result.tokensUsed ?? null,
            prompt_tokens: result.promptTokens ?? null,
            completion_tokens: result.completionTokens ?? null,
            model: result.model,
          })
          .eq("id", repurposeId)
          .eq("user_id", user.id);

        if (updateError) {
          throw new Error(updateError.message);
        }

        return {
          result: {
            id: repurposeId,
            target_format: targetFormat,
            status: "complete" as const,
            output: result.output,
          },
          tokens: {
            tokensUsed: result.tokensUsed ?? 0,
            promptTokens: result.promptTokens ?? 0,
            completionTokens: result.completionTokens ?? 0,
          },
        };
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Format generation failed";
        await admin
          .from("repurposes")
          .update({
            status: "failed",
            error_message: message,
          })
          .eq("id", repurposeId)
          .eq("user_id", user.id);

        console.error(
          `Bundle format ${targetFormat} failed for ${bundle.id}:`,
          err
        );

        return {
          result: {
            id: repurposeId,
            target_format: targetFormat,
            status: "failed" as const,
            output: null,
          },
          tokens: {
            tokensUsed: 0,
            promptTokens: 0,
            completionTokens: 0,
          },
        };
      }
    })
  );

  const formatTokenTotals = {
    tokensUsed: 0,
    promptTokens: 0,
    completionTokens: 0,
  };
  const repurposeResults: BundleRepurposeResult[] = [];

  for (const outcome of formatOutcomes) {
    if (!outcome) continue;
    repurposeResults.push(outcome.result);
    formatTokenTotals.tokensUsed += outcome.tokens.tokensUsed;
    formatTokenTotals.promptTokens += outcome.tokens.promptTokens;
    formatTokenTotals.completionTokens += outcome.tokens.completionTokens;
  }

  const totalTokensUsed =
    tokenTotals.tokensUsed + formatTokenTotals.tokensUsed;
  const totalPromptTokens =
    tokenTotals.promptTokens + formatTokenTotals.promptTokens;
  const totalCompletionTokens =
    tokenTotals.completionTokens + formatTokenTotals.completionTokens;

  await admin
    .from("bundles")
    .update({
      status: "complete",
      error_message: null,
      tokens_used: totalTokensUsed,
      prompt_tokens: totalPromptTokens,
      completion_tokens: totalCompletionTokens,
      model: visionModel,
      updated_at: new Date().toISOString(),
    })
    .eq("id", bundle.id)
    .eq("user_id", user.id);

  const { usage } = await checkUsageLimit(supabase, user.id);

  return NextResponse.json({
    bundle_id: bundle.id,
    pack: {
      ...pack,
      clip_specs: responseClipSpecs,
    },
    repurposes: repurposeResults,
    usage,
  });
}
