import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { generateBrandVoiceDraft } from "@/lib/ai/brand-voice-wizard";
import {
  BRAND_VOICE_WIZARD_DAILY_LIMIT,
  checkBrandVoiceWizardRateLimit,
} from "@/lib/brand-voice/wizard-rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { BrandVoiceWizardRequestSchema } from "@/types";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
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

  const parsed = BrandVoiceWizardRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: parsed.error.issues.map((issue) => issue.message).join("; "),
        code: "validation_error",
      },
      { status: 400 }
    );
  }

  try {
    const admin = createAdminClient();
    const rateCheck = await checkBrandVoiceWizardRateLimit(admin, user.id);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          error: `You can create up to ${rateCheck.limit} guided drafts per day. Try again later.`,
          code: "rate_limited",
        },
        { status: 429 }
      );
    }
  } catch (err) {
    Sentry.captureException(err);
    return NextResponse.json(
      {
        error: "The guided draft service is temporarily unavailable.",
        code: "internal_error",
      },
      { status: 503 }
    );
  }

  try {
    const result = await generateBrandVoiceDraft(parsed.data);
    return NextResponse.json({
      draft: result.draft,
      model: result.model,
      model_tier: "fast",
      daily_limit: BRAND_VOICE_WIZARD_DAILY_LIMIT,
    });
  } catch (err) {
    Sentry.captureException(err);
    return NextResponse.json(
      {
        error: "We could not create a draft. Please try again.",
        code: "generation_failed",
      },
      { status: 502 }
    );
  }
}
