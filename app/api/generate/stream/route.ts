import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { streamObject } from "ai";
import { after, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { fetchVoiceExemplarsText } from "@/lib/ai/exemplars";
import {
  buildBrandVoiceBlock,
  buildGenerationPrompt,
} from "@/lib/ai/prompts";
import { stripEmDashes } from "@/lib/ai/strip-em-dashes";
import {
  AI_CONFIG,
  OPENROUTER_ALLOWED_PROVIDERS,
  getModelForFormat,
} from "@/lib/config";
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
  EmailOutputSchema,
  InstagramOutputSchema,
  LinkedInOutputSchema,
  TextGenerateRequestSchema,
  XThreadOutputSchema,
  type GenerateErrorResponse,
  type RepurposeOutput,
  type TargetFormat,
} from "@/types";

export const maxDuration = 60;

/**
 * NDJSON stream protocol (one JSON object per line):
 *   { type: "meta", repurpose_id, source_hash, model }
 *   { type: "partial", object }   — DeepPartial output as fields arrive
 *   { type: "done", output, usage, model, tokens_used }
 *   { type: "error", error, code? }
 *
 * Gate errors (401/402/429/…) return normal JSON — the stream never opens.
 */

function errorResponse(
  status: number,
  body: GenerateErrorResponse
): NextResponse {
  return NextResponse.json(body, { status });
}

function schemaForFormat(format: TargetFormat) {
  switch (format) {
    case "x_thread":
      return XThreadOutputSchema;
    case "linkedin":
      return LinkedInOutputSchema;
    case "instagram":
      return InstagramOutputSchema;
    case "email":
      return EmailOutputSchema;
  }
}

function createOpenRouter() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not configured");
  }

  return createOpenAICompatible({
    name: "openrouter",
    baseURL: "https://openrouter.ai/api/v1",
    apiKey,
    includeUsage: true,
    supportsStructuredOutputs: true,
    fetch: async (url, init) => {
      const body = JSON.parse(String(init?.body ?? "{}")) as Record<
        string,
        unknown
      >;
      body.provider = { only: [...OPENROUTER_ALLOWED_PROVIDERS] };
      body.reasoning = { enabled: false };
      return fetch(url, {
        ...init,
        body: JSON.stringify(body),
      });
    },
  });
}

/**
 * POST /api/generate/stream
 *
 * Parallel streaming path. Same quota sequence as /api/generate:
 * auth → validate → rate → usage → reservePendingRepurpose → only then AI.
 * Text (paste) only — photo/vision stays on the non-streaming route.
 */
export async function POST(request: Request) {
  if (AI_CONFIG.provider !== "openrouter") {
    return errorResponse(500, {
      error: `Unsupported AI_PROVIDER "${AI_CONFIG.provider}" — only "openrouter" is configured for production.`,
      code: "internal_error",
    });
  }

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

  // Reject image payloads explicitly — streaming is text-only.
  if (
    body &&
    typeof body === "object" &&
    "input_type" in body &&
    (body as { input_type?: string }).input_type === "image"
  ) {
    return errorResponse(400, {
      error: "Streaming generation does not support photo input",
      code: "validation_error",
    });
  }

  const parsed = TextGenerateRequestSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(400, {
      error: parsed.error.issues.map((i) => i.message).join("; "),
      code: "validation_error",
    });
  }

  const requestData = parsed.data;
  const {
    input_type,
    input_content,
    brand_voice_id,
    brand_voice,
    target_format,
    target_tweets,
    target_words,
    generation_id,
    refinement,
  } = requestData;

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

  const exemplarsText = await fetchVoiceExemplarsText(
    supabase,
    user.id,
    target_format
  );

  const truncatedContent = input_content.slice(0, AI_CONFIG.maxInputChars);
  const sourceHash = computeSourceHash(truncatedContent);

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
      inputContent: truncatedContent,
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

  const model = getModelForFormat(target_format);
  const brandVoiceText = buildBrandVoiceBlock(resolvedVoice);
  const { system, user: userPrompt } = buildGenerationPrompt({
    brandVoiceText,
    sourceText: truncatedContent,
    targetFormat: target_format,
    targetTweets: target_tweets,
    targetWords: target_words,
    exemplarsText: exemplarsText || undefined,
    refinement,
  });

  const schema = schemaForFormat(target_format);
  const openrouter = createOpenRouter();

  let settled = false;
  const markFailed = async (message: string) => {
    if (settled) return;
    settled = true;
    await admin
      .from("repurposes")
      .update({
        status: "failed",
        error_message: message,
      })
      .eq("id", repurpose.id)
      .eq("user_id", user.id);
  };

  const onAbort = () => {
    // Survive Vercel teardown when the client disconnects mid-stream.
    after(() => markFailed("aborted"));
  };
  if (request.signal.aborted) {
    await markFailed("aborted");
    return errorResponse(400, {
      error: "Generation aborted",
      code: "generation_failed",
    });
  }
  request.signal.addEventListener("abort", onAbort, { once: true });

  // streamObject MUST stay in this file (AC line-order gate anchors on `streamObject(`).
  const result = streamObject({
    model: openrouter(model),
    schema,
    system,
    prompt: userPrompt,
    temperature: AI_CONFIG.temperature,
    abortSignal: request.signal,
    onError: async ({ error }) => {
      const message =
        error instanceof Error ? error.message : "Generation failed";
      console.error(`Stream generation error for ${repurpose.id}:`, error);
      await markFailed(message);
    },
    onFinish: async ({ object, usage, error }) => {
      request.signal.removeEventListener("abort", onAbort);

      if (error || !object) {
        await markFailed(
          error instanceof Error
            ? error.message
            : "AI output failed validation"
        );
        return;
      }

      if (settled) return;
      settled = true;

      const cleaned = stripEmDashes(object as RepurposeOutput);

      const { error: updateError } = await admin
        .from("repurposes")
        .update({
          output: cleaned,
          status: "complete",
          error_message: null,
          tokens_used: usage.totalTokens ?? null,
          prompt_tokens: usage.inputTokens ?? null,
          completion_tokens: usage.outputTokens ?? null,
          model,
        })
        .eq("id", repurpose.id)
        .eq("user_id", user.id);

      if (updateError) {
        settled = false;
        await markFailed(updateError.message);
      }
    },
  });

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (payload: unknown) => {
        controller.enqueue(encoder.encode(`${JSON.stringify(payload)}\n`));
      };

      try {
        send({
          type: "meta",
          repurpose_id: repurpose.id,
          source_hash: repurpose.source_hash,
          model,
        });

        for await (const partial of result.partialObjectStream) {
          if (request.signal.aborted) break;
          send({ type: "partial", object: stripEmDashes(partial) });
        }

        if (request.signal.aborted) {
          await markFailed("aborted");
          send({
            type: "error",
            error: "Generation aborted",
            code: "generation_failed",
          });
          controller.close();
          return;
        }

        const object = await result.object;
        const cleaned = stripEmDashes(object);
        const { usage } = await checkUsageLimit(supabase, user.id);
        const tokenUsage = await result.usage;

        send({
          type: "done",
          output: cleaned,
          usage,
          model,
          tokens_used: tokenUsage.totalTokens ?? undefined,
          repurpose_id: repurpose.id,
          source_hash: repurpose.source_hash,
        });
        controller.close();
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Generation failed";
        console.error(`Stream generation failed for ${repurpose.id}:`, err);
        Sentry.captureException(err);
        await markFailed(message);
        try {
          send({
            type: "error",
            error:
              "We couldn't generate your content. Please try again — this attempt won't count toward your monthly limit.",
            code: "generation_failed",
          });
        } catch {
          // controller may already be closed
        }
        controller.close();
      }
    },
    cancel() {
      after(() => markFailed("aborted"));
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Repurpose-Id": repurpose.id,
      "X-Accel-Buffering": "no",
    },
  });
}
