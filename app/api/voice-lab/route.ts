import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { z } from "zod";
import { generateRepurpose } from "@/lib/ai/generate";
import { formatXThreadForCopy } from "@/lib/format-output";
import {
  VOICE_LAB_MAX_CHARS,
  VOICE_LAB_MIN_CHARS,
  VOICE_LAB_SAMPLE_VOICES,
} from "@/lib/landing/voice-lab-config";
import {
  voiceLabTokensForWords,
  voiceLabTweetsForWords,
} from "@/lib/repurpose/length-presets";
import {
  checkVoiceLabRateLimit,
  hashVoiceLabClientIp,
  resolveVoiceLabClientIp,
} from "@/lib/landing/voice-lab-rate-limit";
import { verifyTurnstileToken } from "@/lib/landing/turnstile";
import { createAdminClient } from "@/lib/supabase/admin";
import { VoiceVariantSchema, type XThreadOutput } from "@/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const VoiceLabRequestSchema = z.object({
  text: z.string().trim().min(VOICE_LAB_MIN_CHARS).max(VOICE_LAB_MAX_CHARS),
  voice: z.number().int().min(0).max(2),
  target_words: z
    .union([z.literal(20), z.literal(50), z.literal(75)])
    .default(50),
  voice_variant: VoiceVariantSchema.default("signature"),
  turnstileToken: z.string().optional(),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = VoiceLabRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const { text, voice, target_words, voice_variant, turnstileToken } = parsed.data;
  const clientIp = resolveVoiceLabClientIp(request);
  if (!clientIp) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const salt = process.env.VOICE_LAB_IP_SALT;
  if (!salt) {
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }

  const ipHash = hashVoiceLabClientIp(clientIp, salt);

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }

  try {
    const { allowed } = await checkVoiceLabRateLimit(admin, ipHash);
    if (!allowed) {
      return NextResponse.json({ error: "rate_limited" }, { status: 429 });
    }
  } catch (err) {
    Sentry.captureException(err);
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }

  const turnstileOk = await verifyTurnstileToken(turnstileToken, clientIp);
  if (!turnstileOk) {
    return NextResponse.json({ error: "turnstile_failed" }, { status: 403 });
  }

  try {
    const result = await generateRepurpose({
      inputContent: text.slice(0, VOICE_LAB_MAX_CHARS),
      brandVoice: VOICE_LAB_SAMPLE_VOICES[voice]!,
      voiceVariant: voice_variant,
      targetFormat: "x_thread",
      targetTweets: voiceLabTweetsForWords(target_words),
      targetWords: target_words,
      modelTier: "fast",
      maxTokens: voiceLabTokensForWords(target_words),
    });

    if (result.output.format !== "x_thread") {
      throw new Error("Unexpected output format");
    }

    const thread = result.output as XThreadOutput;

    return NextResponse.json({
      format: "x_thread",
      voice,
      text: formatXThreadForCopy(thread),
    });
  } catch (err) {
    Sentry.captureException(err);
    return NextResponse.json({ error: "generation_failed" }, { status: 502 });
  }
}
