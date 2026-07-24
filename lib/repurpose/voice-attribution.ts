/** Honest voice attribution labels — no fidelity / match-quality claims. */

import { voiceDisplayName } from "@/lib/repurpose/voice-display-name";

export type VoiceAttributionInput = {
  name?: string | null;
  description?: string | null;
  is_default?: boolean | null;
  samples?: string[] | null;
} | null;

export function voiceAttributionLabel(
  voice: VoiceAttributionInput
): string {
  return voiceDisplayName(voice);
}
