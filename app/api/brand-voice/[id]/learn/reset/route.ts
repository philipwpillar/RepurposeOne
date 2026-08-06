import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * Reset learning for a brand voice: delete all voice_rules rows.
 * Does not touch samples, description, or voice_range.
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

  const { error: deleteError } = await supabase
    .from("voice_rules")
    .delete()
    .eq("brand_voice_id", brandVoiceId)
    .eq("user_id", user.id);

  if (deleteError) {
    console.error("Voice learn reset failed:", deleteError);
    return NextResponse.json(
      { error: deleteError.message, code: "internal_error" },
      { status: 500 }
    );
  }

  const { error: stampError } = await supabase
    .from("brand_voices")
    .update({ rules_derived_at: null })
    .eq("id", brandVoiceId)
    .eq("user_id", user.id);

  if (stampError) {
    console.error("Voice learn reset stamp failed:", stampError);
  }

  return NextResponse.json({ ok: true });
}
