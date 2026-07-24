/** Display title for a Brand Voice profile — name first, then honest fallbacks. */

export type VoiceDisplayInput = {
  name?: string | null;
  description?: string | null;
  is_default?: boolean | null;
  samples?: string[] | null;
} | null;

export function voiceDisplayName(voice: VoiceDisplayInput): string {
  if (!voice) return "Your voice";

  const name = voice.name?.trim();
  if (name) return name;

  if (voice.is_default) return "Default voice";

  const description = voice.description?.trim();
  if (description) {
    return description.length > 48
      ? `${description.slice(0, 48).trimEnd()}…`
      : description;
  }

  const sample = voice.samples?.find((s) => s?.trim());
  if (sample) {
    return sample.length > 48 ? `${sample.slice(0, 48).trimEnd()}…` : sample;
  }

  return "Untitled voice";
}
