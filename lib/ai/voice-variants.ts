import type { ResolvedBrandVoice, TargetFormat } from "@/types";

export const VOICE_VARIANT_IDS = ["signature", "explain", "provoke"] as const;

export type VoiceVariantId = (typeof VOICE_VARIANT_IDS)[number];

export interface VoiceVariant {
  id: VoiceVariantId;
  label: string;
  description: string;
  promptFragment: string;
  lengthDefault: number;
}

export const VOICE_VARIANTS: readonly VoiceVariant[] = [
  {
    id: "signature",
    label: "I'll State Facts",
    description:
      "Sound like your samples. Neutral delivery, not a lesson and not a hot take.",
    promptFragment: `Delivery for this piece: neutral.
- Match the vocabulary and self-reference habits of the voice samples.
- Average sentence 12 to 16 words. Full sentences preferred.
- Open with context or observation, not with a hard claim and not with a tutorial question.
- Prefer your own wording for the source idea - do not reuse sample phrases verbatim.
- Do not lean toward I'll Explain or I'll Give my Opinion.`,


    lengthDefault: 100,
  },
  {
    id: "explain",
    label: "I'll Explain",
    description: "Walk the reader through how it works, step by step.",
    promptFragment: `Delivery for this piece:
- Address the reader as "you". Do not use first-person plural.
- Average sentence 16 to 22 words. No sentence fragments.
- Open with the problem or the question, not with a claim.
- Include at least one concrete mechanism, number, or step sequence.
- State the conclusion last.`,

    lengthDefault: 100,
  },
  {
    id: "provoke",
    label: "I'll Give my Opinion",
    description: "Lead with one clear position, then justify it briefly.",
    promptFragment: `Delivery for this piece:
- Open with the position, in one sentence, before any justification.
- Average sentence 8 to 12 words. Fragments allowed. Prefer shorter than I'll Explain.
- Zero hedging: no "might", "perhaps", "in my opinion", "arguably".
- Exactly one claim. Do not enumerate.
- Name the thing you disagree with explicitly.`,

    lengthDefault: 50,
  },
] as const;

export const VOICE_VARIANT_BY_ID = Object.fromEntries(
  VOICE_VARIANTS.map((variant) => [variant.id, variant])
) as Record<VoiceVariantId, VoiceVariant>;

export const DEFAULT_VOICE_VARIANT_BY_FORMAT: Record<
  TargetFormat,
  VoiceVariantId
> = {
  x_thread: "provoke",
  linkedin: "explain",
  instagram: "signature",
  email: "explain",
};

export const VOICE_IDENTITY_PRECEDENCE =
  "The voice identity above is fixed. Follow it strictly - this is your primary tone anchor. Later instructions may adjust delivery but must not change vocabulary, self-reference, audience-reference, formatting conventions, or stated positions.";

export function buildVoiceIdentityBlock(input: ResolvedBrandVoice): string {
  const description =
    input.description?.trim() || "No description provided.";
  const summary = input.voice_range?.summary?.trim();
  const identityBody = summary
    ? `${description}\nVoice range: ${summary}`
    : description;
  return `Voice identity (follow strictly - this is your primary tone anchor):\n${identityBody}\n${VOICE_IDENTITY_PRECEDENCE}`;
}

/**
 * Learned preference rules - always below VOICE_IDENTITY_PRECEDENCE.
 * Samples take precedence in every conflict.
 */
export function buildLearnedRulesBlock(input: ResolvedBrandVoice): string {
  const rules = (input.learned_rules ?? []).filter(
    (r) =>
      (r.status === "active" || r.status === "pinned") &&
      typeof r.rule === "string" &&
      r.rule.trim()
  );
  if (!rules.length) return "";

  const lines = rules.map((r, i) => `${i + 1}. ${r.rule.trim()}`).join("\n");
  return (
    "Learned preferences (observed from how this user edits their drafts; " +
    "apply where they do not conflict with the writing samples; " +
    "the samples take precedence in every conflict):\n" +
    lines
  );
}

export function buildVoiceSamplesBlock(input: ResolvedBrandVoice): string {
  if (!input.samples?.length) return "";
  return (
    "Writing samples:\n" +
    input.samples.map((sample, index) => `--- Sample ${index + 1} ---\n${sample}`).join("\n\n")
  );
}

export function assembleVoiceLayers(
  input: ResolvedBrandVoice,
  variantId: VoiceVariantId,
  exemplarsText?: string
): string {
  const sampleLayers = [buildVoiceSamplesBlock(input), exemplarsText?.trim()]
    .filter(Boolean)
    .join("\n\n");

  return [
    buildVoiceIdentityBlock(input),
    buildLearnedRulesBlock(input),
    `Delivery variant:\n${VOICE_VARIANT_BY_ID[variantId].promptFragment}`,
    sampleLayers,
  ]
    .filter(Boolean)
    .join("\n\n");
}
