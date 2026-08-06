import type { SupabaseClient } from "@supabase/supabase-js";
import {
  VoiceRangeSchema,
  type BrandVoiceInput,
  type LearnedVoiceRule,
  type ResolvedBrandVoice,
  type VoiceRange,
} from "@/types";

function parseVoiceRange(raw: unknown): VoiceRange | null {
  if (raw == null) return null;
  const parsed = VoiceRangeSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

async function fetchLearnedRules(
  supabase: SupabaseClient,
  userId: string,
  brandVoiceId: string
): Promise<LearnedVoiceRule[]> {
  const { data, error } = await supabase
    .from("voice_rules")
    .select("rule, status")
    .eq("user_id", userId)
    .eq("brand_voice_id", brandVoiceId)
    .in("status", ["active", "pinned"])
    .order("created_at", { ascending: true });

  if (error) {
    // Fail open: generation works without rules if table missing or query fails.
    console.error("Learned rules fetch failed:", error);
    return [];
  }

  return (data ?? [])
    .filter((r) => r.status === "active" || r.status === "pinned")
    .map((r) => ({
      rule: String(r.rule),
      status: r.status as "active" | "pinned",
    }));
}

export async function resolveBrandVoice(
  supabase: SupabaseClient,
  userId: string,
  brandVoiceId?: string,
  inlineVoice?: BrandVoiceInput
): Promise<ResolvedBrandVoice> {
  if (inlineVoice) {
    return inlineVoice;
  }

  if (!brandVoiceId) {
    throw new Error("brand_voice_id or brand_voice is required");
  }

  const { data, error } = await supabase
    .from("brand_voices")
    .select("samples, description, voice_range")
    .eq("id", brandVoiceId)
    .eq("user_id", userId)
    .single();

  if (error || !data) {
    throw new Error("Brand voice not found");
  }

  const learned_rules = await fetchLearnedRules(
    supabase,
    userId,
    brandVoiceId
  );

  return {
    samples: data.samples ?? [],
    description: data.description ?? undefined,
    voice_range: parseVoiceRange(data.voice_range),
    learned_rules: learned_rules.length ? learned_rules : null,
  };
}

const FALLBACK_VOICE: ResolvedBrandVoice = {
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
): Promise<{ voice: ResolvedBrandVoice; brandVoiceId: string | null }> {
  const { data, error } = await supabase
    .from("brand_voices")
    .select("id, samples, description, voice_range")
    .eq("user_id", userId)
    .eq("is_default", true)
    .maybeSingle();

  if (error || !data) {
    return { voice: FALLBACK_VOICE, brandVoiceId: null };
  }

  const learned_rules = await fetchLearnedRules(supabase, userId, data.id);

  return {
    voice: {
      samples: data.samples ?? [],
      description: data.description ?? undefined,
      voice_range: parseVoiceRange(data.voice_range),
      learned_rules: learned_rules.length ? learned_rules : null,
    },
    brandVoiceId: data.id,
  };
}
