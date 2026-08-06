import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { VoiceRuleStatusSchema } from "@/types";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ ruleId: string }> };

const BodySchema = z.object({
  status: VoiceRuleStatusSchema,
});

/**
 * Update a voice rule's status only (dismiss / pin / reactivate).
 * Column grants block rewriting rule text or evidence_ids.
 */
export async function PATCH(request: Request, context: RouteContext) {
  const { ruleId } = await context.params;

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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body", code: "validation_error" },
      { status: 400 }
    );
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid status", code: "validation_error" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("voice_rules")
    .update({ status: parsed.data.status })
    .eq("id", ruleId)
    .eq("user_id", user.id)
    .select("id, rule, evidence_ids, status, created_at, brand_voice_id")
    .maybeSingle();

  if (error) {
    console.error("Voice rule status update failed:", error);
    return NextResponse.json(
      { error: error.message, code: "internal_error" },
      { status: 500 }
    );
  }

  if (!data) {
    return NextResponse.json(
      { error: "Rule not found", code: "validation_error" },
      { status: 404 }
    );
  }

  return NextResponse.json({ rule: data });
}
