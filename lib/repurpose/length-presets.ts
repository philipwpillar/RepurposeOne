import type { TargetFormat } from "@/types";
import {
  VOICE_VARIANT_BY_ID,
  type VoiceVariantId,
} from "@/lib/ai/voice-variants";

export const FORMAT_LENGTH_PRESETS = {
  x_thread: [50, 100, 200],
  linkedin: [50, 100, 200],
  instagram: [20, 50, 100],
  email: [100, 200, 400],
} as const satisfies Record<TargetFormat, readonly number[]>;

export const VOICE_LAB_LENGTH_PRESETS = [20, 50, 75] as const;

export function getDefaultWords(format: TargetFormat): number {
  return FORMAT_LENGTH_PRESETS[format][1];
}

export function isValidWords(format: TargetFormat, words: number): boolean {
  return (FORMAT_LENGTH_PRESETS[format] as readonly number[]).includes(words);
}

export function lengthPresetsForVariant(
  format: TargetFormat,
  variantId: VoiceVariantId
): readonly number[] {
  const presets = FORMAT_LENGTH_PRESETS[format] as readonly number[];
  if (variantId === "provoke") return presets.filter((words) => words <= 100);
  if (variantId === "explain") return presets.filter((words) => words >= 50);
  return presets;
}

export function nearestLengthForVariant(
  format: TargetFormat,
  variantId: VoiceVariantId,
  currentWords: number
): number {
  const presets = lengthPresetsForVariant(format, variantId);
  if (presets.includes(currentWords)) return currentWords;

  const preferred = VOICE_VARIANT_BY_ID[variantId].lengthDefault;
  return presets.reduce((nearest, words) =>
    Math.abs(words - preferred) < Math.abs(nearest - preferred) ? words : nearest
  );
}

export function wordsToTweets(words: number): number {
  if (words <= 50) return 3;
  if (words <= 100) return 5;
  return 8;
}

export function voiceLabTokensForWords(words: number): number {
  if (words <= 20) return 250;
  if (words <= 50) return 400;
  return 550;
}

export function voiceLabTweetsForWords(words: number): number {
  if (words <= 20) return 3;
  if (words <= 50) return 4;
  return 5;
}
