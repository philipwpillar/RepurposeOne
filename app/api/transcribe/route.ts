import { NextResponse } from "next/server";
import { VOICE_MAX_BYTES, VOICE_TOO_LARGE_MESSAGE } from "@/lib/audio/constants";
import { AudioTranscribeError } from "@/lib/audio/errors";
import { transcribeAudioWithDeepInfra } from "@/lib/audio/transcribe";
import { planAllowsBundles } from "@/lib/config";
import { createClient } from "@/lib/supabase/server";
import { stripDataUrlPrefix } from "@/lib/utils/data-url";
import {
  checkRateLimit,
  getUpgradeMessage,
  getUserPlan,
} from "@/lib/usage";
import {
  TranscribeRequestSchema,
  type TranscribeErrorResponse,
  type TranscribeResponse,
} from "@/types";

/**
 * Headroom over DEEPINFRA_ASR_TIMEOUT_MS (50s). Within Vercel Pro's 300s ceiling
 * (same caveat as bundles/generate maxDuration = 280).
 */
export const maxDuration = 60;

function errorResponse(
  status: number,
  body: TranscribeErrorResponse
): NextResponse {
  return NextResponse.json(body, { status });
}

/**
 * POST /api/transcribe
 *
 * Brief 2b: ephemeral ASR for voice notes via direct DeepInfra Whisper.
 * No Storage, no DB rows, not a counted generation.
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
        "Voice transcription is available on Pro Plus. Upgrade to use voice notes.",
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
      error: "Too many requests. Please wait a moment and try again.",
      code: "rate_limited",
      retry_after_seconds: rateCheck.retryAfterSeconds,
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

  const parsed = TranscribeRequestSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(400, {
      error: parsed.error.issues.map((i) => i.message).join("; "),
      code: "validation_error",
    });
  }

  const rawAudio = stripDataUrlPrefix(parsed.data.audio);
  let bytes: Uint8Array;
  try {
    bytes = Uint8Array.from(Buffer.from(rawAudio, "base64"));
  } catch {
    return errorResponse(400, {
      error: "Invalid audio encoding",
      code: "validation_error",
    });
  }

  if (bytes.byteLength === 0) {
    return errorResponse(400, {
      error: "Audio payload is empty",
      code: "validation_error",
    });
  }

  if (bytes.byteLength > VOICE_MAX_BYTES) {
    return errorResponse(413, {
      error: VOICE_TOO_LARGE_MESSAGE,
      code: "payload_too_large",
    });
  }

  try {
    const transcript = await transcribeAudioWithDeepInfra({
      bytes,
      mimeType: parsed.data.mimeType,
    });

    return NextResponse.json({
      transcript,
    } satisfies TranscribeResponse);
  } catch (err) {
    if (err instanceof Error && err.message.includes("DEEPINFRA_API_KEY")) {
      console.error("DeepInfra API key missing");
      return errorResponse(500, {
        error: "Transcription is not configured",
        code: "internal_error",
      });
    }

    if (err instanceof AudioTranscribeError) {
      console.error(`Transcription failed (${err.code})`);
      const status = err.code === "transcription_timeout" ? 504 : 502;
      return errorResponse(status, {
        error: err.message,
        code: "transcription_failed",
      });
    }

    console.error("Unexpected transcription error");
    return errorResponse(502, {
      error: "Transcription failed. Please try again.",
      code: "transcription_failed",
    });
  }
}
