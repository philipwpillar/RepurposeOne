/** Honest voice attribution labels — no fidelity / match-quality claims. */

export type VoiceAttributionInput = {
  description?: string | null;
  is_default?: boolean | null;
  samples?: string[] | null;
} | null;

export function voiceAttributionLabel(
  voice: VoiceAttributionInput
): string {
  if (!voice) return "Your voice";
  if (voice.is_default) return "Default voice";

  const description = voice.description?.trim();
  if (description) {
    const short =
      description.length > 40
        ? `${description.slice(0, 40).trimEnd()}…`
        : description;
    return short;
  }

  const sample = voice.samples?.find((s) => s?.trim());
  if (sample) {
    const short =
      sample.length > 40 ? `${sample.slice(0, 40).trimEnd()}…` : sample;
    return short;
  }

  return "Your voice";
}
