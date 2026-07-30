import type { TargetFormat } from "@/types";

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
