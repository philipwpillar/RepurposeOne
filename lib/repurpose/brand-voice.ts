import type { SupabaseClient } from "@supabase/supabase-js";
import type { BrandVoiceInput } from "@/types";

export async function resolveBrandVoice(
  supabase: SupabaseClient,
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

const FALLBACK_VOICE: BrandVoiceInput = {
  samples: [],
  description: "Clear, professional, conversational.",
};

/**
 * Moment Bundle v1: always use the user's default brand voice.
 * Returns voice input plus optional row id for audit on repurposes.
 */
export async function resolveDefaultBrandVoice(
  supabase: SupabaseClient,
  userId: string
): Promise<{ voice: BrandVoiceInput; brandVoiceId: string | null }> {
  const { data, error } = await supabase
    .from("brand_voices")
    .select("id, samples, description")
    .eq("user_id", userId)
    .eq("is_default", true)
    .maybeSingle();

  if (error || !data) {
    return { voice: FALLBACK_VOICE, brandVoiceId: null };
  }

  return {
    voice: {
      samples: data.samples ?? [],
      description: data.description ?? undefined,
    },
    brandVoiceId: data.id,
  };
}
