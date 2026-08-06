import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { deriveAndPersistVoiceRules } from "@/lib/ai/voice-derive";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 60;

type RouteContext = { params: Promise<{ id: string }> };

/**
 * On-demand: "Refresh what Voiceora has learned" for one brand voice.
 */
export async function POST(_request: Request, context: RouteContext) {
  const { id: brandVoiceId } = await context.params;

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { error: "Authentication required", code: "unauthorized" },
      { status: 401 }
    );
  }

  const { data: voice, error: voiceError } = await supabase
    .from("brand_voices")
    .select("id")
    .eq("id", brandVoiceId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (voiceError || !voice) {
    return NextResponse.json(
      { error: "Brand voice not found", code: "validation_error" },
      { status: 404 }
    );
  }

  try {
    const admin = createAdminClient();
    const result = await deriveAndPersistVoiceRules(
      admin,
      user.id,
      brandVoiceId,
      { force: true }
    );

    const { data: rules } = await supabase
      .from("voice_rules")
      .select("id, rule, evidence_ids, status, created_at")
      .eq("brand_voice_id", brandVoiceId)
      .eq("user_id", user.id)
      .in("status", ["active", "pinned"])
      .order("created_at", { ascending: true });

    return NextResponse.json({
      ok: true,
      inserted: result.inserted,
      skipped_rate_limit: result.skippedRateLimit,
      skipped_insufficient_evidence: result.skippedInsufficientEvidence,
      rules: rules ?? [],
    });
  } catch (err) {
    Sentry.captureException(err);
    console.error("Voice learn refresh failed:", err);
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Derivation failed",
        code: "generation_failed",
      },
      { status: 500 }
    );
  }
}
