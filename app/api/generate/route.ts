import { NextResponse } from "next/server";
import { generateRepurpose } from "@/lib/ai/generate";
import { createClient } from "@/lib/supabase/server";
import { checkUsageLimit, getUpgradeMessage } from "@/lib/usage";
import {
  GenerateRequestSchema,
  type BrandVoiceInput,
  type GenerateErrorResponse,
} from "@/types";

function errorResponse(
  status: number,
  body: GenerateErrorResponse
): NextResponse {
  return NextResponse.json(body, { status });
}

async function resolveBrandVoice(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  brandVoiceId?: string,
  inlineVoice?: BrandVoiceInput
): Promise<BrandVoiceInput> {
  if (inlineVoice) {
    return inlineVoice;
  }

  if (!brandVoiceId) {
    throw new Error("brand_voice_id or brand_voice is required");
  }

  const { data, error } = await supabase
    .from("brand_voices")
    .select("samples, description")
    .eq("id", brandVoiceId)
    .eq("user_id", userId)
    .single();

  if (error || !data) {
    throw new Error("Brand voice not found");
  }

  return {
    samples: data.samples ?? [],
    description: data.description ?? undefined,
  };
}

/**
 * POST /api/generate
 *
 * Hardened generation endpoint:
 * 1. Authenticate
 * 2. Validate input
 * 3. Check plan usage (count repurposes rows — no AI call if over limit)
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

  const {
    input_type,
    input_content,
    brand_voice_id,
    brand_voice,
    target_format,
    target_tweets,
  } = parsed.data;

  // --- Usage check BEFORE any AI spend ---
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

  let resolvedVoice: BrandVoiceInput;
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

  // Insert pending row before AI call (audit trail + status tracking)
  const { data: repurpose, error: insertError } = await supabase
    .from("repurposes")
    .insert({
      user_id: user.id,
      input_type,
      input_content,
      brand_voice_id: brand_voice_id ?? null,
      target_format,
      status: "pending",
    })
    .select("id")
    .single();

  if (insertError || !repurpose) {
    console.error("Failed to insert repurpose:", insertError);
    return errorResponse(500, {
      error: "Failed to create repurpose record",
      code: "internal_error",
    });
  }

  try {
    const result = await generateRepurpose({
      inputContent: input_content,
      brandVoice: resolvedVoice,
      targetFormat: target_format,
      targetTweets: target_tweets,
    });

    const { error: updateError } = await supabase
      .from("repurposes")
      .update({
        output: result.output,
        status: "complete",
        error_message: null,
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
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Generation failed unexpectedly";

    await supabase
      .from("repurposes")
      .update({
        status: "failed",
        error_message: message,
      })
      .eq("id", repurpose.id)
      .eq("user_id", user.id);

    console.error(`Generation failed for ${repurpose.id}:`, err);

    return errorResponse(500, {
      error: message,
      code: "generation_failed",
    });
  }
}
