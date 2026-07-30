import type { BrandVoiceInput, TargetFormat } from "@/types";

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
    label: "Your voice",
    description: "Match the rhythm and structure of your samples.",
    promptFragment: `Delivery for this piece: neutral. Match the rhythm and structure of
the voice samples as closely as possible. Do not lean toward any
particular register.`,
    lengthDefault: 100,
  },
  {
    id: "explain",
    label: "Teach",
    description: "Guide the reader through a clear mechanism or sequence.",
    promptFragment: `Delivery for this piece:
- Address the reader as "you". Do not use first-person plural.
- Average sentence 15 to 22 words. No sentence fragments.
- Open with the problem or the question, not with a claim.
- Include at least one concrete mechanism, number, or step sequence.
- State the conclusion last.`,
    lengthDefault: 100,
  },
  {
    id: "provoke",
    label: "Take",
    description: "Lead with one direct position and justify it briefly.",
    promptFragment: `Delivery for this piece:
- Open with the position, in one sentence, before any justification.
- Average sentence 8 to 14 words. Fragments allowed.
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

export function buildVoiceIdentityBlock(input: BrandVoiceInput): string {
  return `Voice identity (follow strictly - this is your primary tone anchor):\n${input.description?.trim() || "No description provided."}\n${VOICE_IDENTITY_PRECEDENCE}`;
}

export function buildVoiceSamplesBlock(input: BrandVoiceInput): string {
  if (!input.samples?.length) return "";
  return (
    "Writing samples:\n" +
    input.samples.map((sample, index) => `--- Sample ${index + 1} ---\n${sample}`).join("\n\n")
  );
}

export function assembleVoiceLayers(
  input: BrandVoiceInput,
  variantId: VoiceVariantId,
  exemplarsText?: string
): string {
  const sampleLayers = [buildVoiceSamplesBlock(input), exemplarsText?.trim()]
    .filter(Boolean)
    .join("\n\n");

  return [
    buildVoiceIdentityBlock(input),
    `Delivery variant:\n${VOICE_VARIANT_BY_ID[variantId].promptFragment}`,
    sampleLayers,
  ]
    .filter(Boolean)
    .join("\n\n");
}
