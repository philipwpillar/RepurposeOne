import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { generateRepurpose, generateRepurposeFromImage } from "@/lib/ai/generate";
import { fetchVoiceExemplarsText } from "@/lib/ai/exemplars";
import { AI_CONFIG, planAllowsVision } from "@/lib/config";
import {
  computeSourceHash,
  GenerationIdValidationError,
  resolveGenerationId,
} from "@/lib/repurpose/generation-id";
import { resolveBrandVoice } from "@/lib/repurpose/brand-voice";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  checkRateLimit,
  checkUsageLimit,
  getUpgradeMessage,
  getUserPlan,
  QuotaExceededError,
  reservePendingRepurpose,
} from "@/lib/usage";
import {
  GenerateRequestSchema,
  type GenerateErrorResponse,
} from "@/types";

function errorResponse(
  status: number,
  body: GenerateErrorResponse
): NextResponse {
  return NextResponse.json(body, { status });
}

function toUserFacingGenerationError(err: unknown): string {
  if (!(err instanceof Error)) {
    return "Generation failed unexpectedly. Please try again - this attempt won't count toward your monthly limit.";
  }

  const msg = err.message.toLowerCase();

  if (msg.includes("timeout") || msg.includes("timed out")) {
    return "Generation timed out. Try again with shorter content - this attempt won't count toward your monthly limit.";
  }

  if (msg.includes("rate") && msg.includes("limit")) {
    return "The AI service is temporarily busy. Please wait a minute and try again.";
  }

  if (msg.includes("invalid") || msg.includes("validation") || msg.includes("parse")) {
    return "The AI returned an unexpected format. Please try again - this attempt won't count toward your monthly limit.";
  }

  return "We couldn't generate your content. Please try again - this attempt won't count toward your monthly limit.";
}

/**
 * POST /api/generate
 *
 * Hardened generation endpoint:
 * 1. Authenticate
 * 2. Validate input
 * 3. Check burst rate limit (recent complete + pending rows)
 * 4. Check plan usage (complete rows only - no AI call if over limit)
 * 4. Insert pending repurpose
 * 5. Call AI + validate output with Zod
 * 6. Update to complete or failed
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

  const parsed = GenerateRequestSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(400, {
      error: parsed.error.issues.map((i) => i.message).join("; "),
      code: "validation_error",
    });
  }

  const requestData = parsed.data;
  const {
    input_type,
    brand_voice_id,
    brand_voice,
    target_format,
    target_tweets,
    target_words,
    generation_id,
  } = requestData;

  const isImageRequest = input_type === "image";

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

  if (isImageRequest) {
    if (!planAllowsVision(plan)) {
      return errorResponse(403, {
        error:
          "Photo repurpose is available on Creator, Pro, or Pro Plus plans. Upgrade to continue.",
        code: "plan_required",
        upgrade_message: getUpgradeMessage(plan),
      });
    }

    if (requestData.image_base64.length > AI_CONFIG.maxImageBase64Chars) {
      return errorResponse(400, {
        error: "Image is too large after processing. Try a smaller photo.",
        code: "validation_error",
      });
    }
  }

  const input_content = isImageRequest
    ? requestData.photo_cta
      ? `${requestData.photo_context}\n\nCTA: ${requestData.photo_cta}`
      : requestData.photo_context
    : requestData.input_content;

  // --- Burst rate limit before any DB write or AI spend ---
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

  // --- Monthly usage check BEFORE any AI spend ---
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

  let resolvedVoice;
  try {
    resolvedVoice = await resolveBrandVoice(
      supabase,
      user.id,
      brand_voice_id,
      brand_voice
    );
  } catch (err) {
    return errorResponse(400, {
      error: err instanceof Error ? err.message : "Invalid brand voice",
      code: "validation_error",
    });
  }

  // Brief S2: inject rated/edited exemplars when available (never fail generation)
  const exemplarsText = await fetchVoiceExemplarsText(
    supabase,
    user.id,
    target_format
  );
  if (exemplarsText) {
    console.info(
      `[exemplars] injected for user=${user.id} format=${target_format} chars=${exemplarsText.length}`
    );
  }

  const sourceHash = computeSourceHash(input_content);

  let resolvedGenerationId: string | undefined;
  try {
    resolvedGenerationId = await resolveGenerationId(supabase, {
      userId: user.id,
      clientGenerationId: generation_id,
      sourceHash,
      targetFormat: target_format,
    });
  } catch (err) {
    if (err instanceof GenerationIdValidationError) {
      return errorResponse(400, {
        error: err.message,
        code: "validation_error",
      });
    }
    console.error("generation_id validation failed:", err);
    return errorResponse(500, {
      error: "Failed to validate generation group",
      code: "internal_error",
    });
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch (err) {
    console.error("Admin client unavailable:", err);
    return errorResponse(500, {
      error: "Failed to create repurpose record",
      code: "internal_error",
    });
  }

  // Insert pending row before AI call (atomic quota reservation)
  let repurpose: { id: string; source_hash: string | null };
  try {
    repurpose = await reservePendingRepurpose(admin, {
      userId: user.id,
      limit: usageCheck.usage.limit,
      inputType: input_type,
      inputContent: input_content,
      brandVoiceId: brand_voice_id ?? null,
      targetFormat: target_format,
      generationId: resolvedGenerationId,
    });
  } catch (err) {
    if (err instanceof QuotaExceededError) {
      return errorResponse(402, {
        error: "Monthly repurpose limit reached",
        code: "limit_exceeded",
        usage: usageCheck.usage,
        upgrade_message: getUpgradeMessage(usageCheck.usage.plan),
      });
    }
    console.error("Failed to insert repurpose:", err);
    return errorResponse(500, {
      error: "Failed to create repurpose record",
      code: "internal_error",
    });
  }

  try {
    const result = isImageRequest
      ? await generateRepurposeFromImage({
          imageBase64: requestData.image_base64,
          imageMime: requestData.image_mime,
          context: requestData.photo_context,
          cta: requestData.photo_cta,
          brandVoice: resolvedVoice,
          targetFormat: target_format,
          targetTweets: target_tweets,
          targetWords: target_words,
          exemplarsText: exemplarsText || undefined,
        })
      : await generateRepurpose({
          inputContent: input_content,
          brandVoice: resolvedVoice,
          targetFormat: target_format,
          targetTweets: target_tweets,
          targetWords: target_words,
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
      .eq("id", repurpose.id)
      .eq("user_id", user.id);

    if (updateError) {
      throw new Error(updateError.message);
    }

    // Re-fetch usage after successful generation
    const { usage } = await checkUsageLimit(supabase, user.id);

    return NextResponse.json({
      repurpose_id: repurpose.id,
      status: "complete" as const,
      output: result.output,
      usage: {
        ...usage,
        used: usage.used, // includes the row we just created
      },
      model: result.model,
      tokens_used: result.tokensUsed,
      source_hash: repurpose.source_hash,
    });
  } catch (err) {
    const message = toUserFacingGenerationError(err);

    await admin
      .from("repurposes")
      .update({
        status: "failed",
        error_message: err instanceof Error ? err.message : message,
      })
      .eq("id", repurpose.id)
      .eq("user_id", user.id);

    console.error(`Generation failed for ${repurpose.id}:`, err);
    Sentry.captureException(err);

    return errorResponse(500, {
      error: message,
      code: "generation_failed",
    });
  }
}
