import { NextResponse } from "next/server";
import { formatISO } from "date-fns";
import { runPhotoBundleGeneration } from "@/lib/ai/bundle-generate";
import { fetchVoiceExemplarsText } from "@/lib/ai/exemplars";
import { generateRepurpose } from "@/lib/ai/generate";
import {
  AI_CONFIG,
  BUNDLE_MONTHLY_LIMIT,
  planAllowsBundles,
} from "@/lib/config";
import type { PhotoMimeType } from "@/lib/image/constants";
import { resolveDefaultBrandVoice } from "@/lib/repurpose/brand-voice";
import { createClient } from "@/lib/supabase/server";
import {
  checkRateLimit,
  checkUsageLimit,
  getCurrentBillingPeriod,
  getUpgradeMessage,
  getUserPlan,
} from "@/lib/usage";
import {
  BundleGenerateRequestSchema,
  type BundleGenerateErrorResponse,
  type BundleRepurposeResult,
  type TargetFormat,
} from "@/types";

export const maxDuration = 120;

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

/**
 * POST /api/bundles/generate
 *
 * Photo-pack Moment Bundle (Brief 1b):
 * auth → plan → rate → generation cap → N2 bundle cap → analyze → format fan-out.
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

  for (const photo of requestData.photos) {
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

  // N2 — monthly bundle cap (failed excluded; in-flight count)
  const { start, end } = getCurrentBillingPeriod();
  const { data: bundleCount, error: bundleCountError } = await supabase.rpc(
    "count_monthly_bundles",
    {
      p_user_id: user.id,
      p_start: formatISO(start),
      p_end: formatISO(end),
    }
  );

  if (bundleCountError) {
    console.error("Bundle cap check failed:", bundleCountError);
    return errorResponse(500, {
      error: "Failed to check bundle limits",
      code: "internal_error",
    });
  }

  if ((bundleCount ?? 0) >= BUNDLE_MONTHLY_LIMIT) {
    return errorResponse(402, {
      error: `Monthly Moment Bundle limit reached (${BUNDLE_MONTHLY_LIMIT}/month on Pro Plus).`,
      code: "bundle_limit_reached",
      usage: usageCheck.usage,
      upgrade_message: getUpgradeMessage(plan),
    });
  }

  const { voice: resolvedVoice, brandVoiceId } =
    await resolveDefaultBrandVoice(supabase, user.id);

  const { data: bundle, error: bundleInsertError } = await supabase
    .from("bundles")
    .insert({
      user_id: user.id,
      title: requestData.title ?? null,
      context: requestData.context,
      status: "analyzing",
    })
    .select("id, generation_id")
    .single();

  if (bundleInsertError || !bundle) {
    console.error("Failed to insert bundle:", bundleInsertError);
    return errorResponse(500, {
      error: "Failed to create bundle record",
      code: "internal_error",
    });
  }

  const assetRows = requestData.photos.map((photo, index) => ({
    user_id: user.id,
    bundle_id: bundle.id,
    kind: "photo" as const,
    storage_path: null,
    mime_type: mimeFromFilename(photo.filename),
    sort_order: index,
    metadata: photo.filename ? { filename: photo.filename } : {},
  }));

  const { data: assets, error: assetsInsertError } = await supabase
    .from("bundle_assets")
    .insert(assetRows)
    .select("id, sort_order, metadata");

  if (assetsInsertError || !assets) {
    console.error("Failed to insert bundle assets:", assetsInsertError);
    await supabase
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

  let orchestration;
  try {
    orchestration = await runPhotoBundleGeneration({
      photos: requestData.photos.map((photo) => ({
        data: photo.data,
        filename: photo.filename,
        mime: mimeFromFilename(photo.filename),
      })),
      context: requestData.context,
      brandVoice: resolvedVoice,
    });
  } catch (err) {
    const message = toUserFacingBundleError(err);
    await supabase
      .from("bundles")
      .update({
        status: "failed",
        error_message: err instanceof Error ? err.message : message,
        updated_at: new Date().toISOString(),
      })
      .eq("id", bundle.id)
      .eq("user_id", user.id);

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
    const prevMeta =
      asset.metadata && typeof asset.metadata === "object"
        ? (asset.metadata as Record<string, unknown>)
        : {};

    await supabase
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

    const prevMeta =
      asset.metadata && typeof asset.metadata === "object"
        ? (asset.metadata as Record<string, unknown>)
        : {};

    await supabase
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

  const inputContent = `${pack.post_brief}\n\n${requestData.context}`;
  const formatTokenTotals = {
    tokensUsed: 0,
    promptTokens: 0,
    completionTokens: 0,
  };
  const repurposeResults: BundleRepurposeResult[] = [];

  for (const targetFormat of formats) {
    const exemplarsText = await fetchVoiceExemplarsText(
      supabase,
      user.id,
      targetFormat
    );

    const { data: repurpose, error: insertError } = await supabase
      .from("repurposes")
      .insert({
        user_id: user.id,
        input_type: "paste",
        input_content: inputContent,
        brand_voice_id: brandVoiceId,
        target_format: targetFormat,
        status: "pending",
        generation_id: bundle.generation_id,
        bundle_id: bundle.id,
      })
      .select("id")
      .single();

    if (insertError || !repurpose) {
      console.error(
        `Failed to insert repurpose for format ${targetFormat}:`,
        insertError
      );
      continue;
    }

    try {
      const result = await generateRepurpose({
        inputContent,
        brandVoice: resolvedVoice,
        targetFormat,
        exemplarsText: exemplarsText || undefined,
      });

      formatTokenTotals.tokensUsed += result.tokensUsed ?? 0;
      formatTokenTotals.promptTokens += result.promptTokens ?? 0;
      formatTokenTotals.completionTokens += result.completionTokens ?? 0;

      const { error: updateError } = await supabase
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
        .eq("id", repurpose.id)
        .eq("user_id", user.id);

      if (updateError) {
        throw new Error(updateError.message);
      }

      repurposeResults.push({
        id: repurpose.id,
        target_format: targetFormat,
        status: "complete",
        output: result.output,
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Format generation failed";
      await supabase
        .from("repurposes")
        .update({
          status: "failed",
          error_message: message,
        })
        .eq("id", repurpose.id)
        .eq("user_id", user.id);

      console.error(
        `Bundle format ${targetFormat} failed for ${bundle.id}:`,
        err
      );

      repurposeResults.push({
        id: repurpose.id,
        target_format: targetFormat,
        status: "failed",
        output: null,
      });
    }
  }

  const totalTokensUsed =
    tokenTotals.tokensUsed + formatTokenTotals.tokensUsed;
  const totalPromptTokens =
    tokenTotals.promptTokens + formatTokenTotals.promptTokens;
  const totalCompletionTokens =
    tokenTotals.completionTokens + formatTokenTotals.completionTokens;

  await supabase
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
    pack,
    repurposes: repurposeResults,
    usage,
  });
}
