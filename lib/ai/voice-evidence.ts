import type { SupabaseClient } from "@supabase/supabase-js";
import { formatOutputForCopy } from "@/lib/format-output";
import {
  RepurposeOutputSchema,
  type RepurposeOutput,
  type TargetFormat,
} from "@/types";

const EVIDENCE_LIMIT = 30;
const MIN_NORMALISED_DISTANCE = 0.05;

export type VoiceEvidenceRow = {
  repurposeId: string;
  targetFormat: TargetFormat;
  original: string;
  edited: string;
  sourceHash: string | null;
  editedAt: string;
};

function outputToText(raw: unknown): string | null {
  const parsed = RepurposeOutputSchema.safeParse(raw);
  if (!parsed.success) return null;
  const text = formatOutputForCopy(parsed.data as RepurposeOutput).trim();
  return text || null;
}

/** Classic Levenshtein distance. */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const prev = new Array<number>(b.length + 1);
  const curr = new Array<number>(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;
  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        prev[j] + 1,
        curr[j - 1] + 1,
        prev[j - 1] + cost
      );
    }
    for (let j = 0; j <= b.length; j++) prev[j] = curr[j];
  }
  return prev[b.length];
}

export function normalisedLevenshtein(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 0;
  return levenshtein(a, b) / maxLen;
}

function stripUrls(text: string): string {
  return text.replace(/https?:\/\/\S+/gi, "").replace(/www\.\S+/gi, "");
}

function stripNumbers(text: string): string {
  return text.replace(/\d+/g, "");
}

function collapseWs(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/** True when the only changes are URL, numeric, or whitespace. */
export function isUrlNumericOrWhitespaceOnlyDiff(
  original: string,
  edited: string
): boolean {
  const norm = (s: string) => collapseWs(stripNumbers(stripUrls(s)));
  return norm(original) === norm(edited);
}

/** True when edited is a pure end-truncation of original (prefix match, shorter). */
export function isPureEndTruncation(original: string, edited: string): boolean {
  const o = original.trimEnd();
  const e = edited.trimEnd();
  if (!e.length || e.length >= o.length) return false;
  return o.startsWith(e);
}

/**
 * Discard edits that are not voice signals. Deterministic - no model.
 */
export function isVoiceSignalEdit(original: string, edited: string): boolean {
  if (normalisedLevenshtein(original, edited) < MIN_NORMALISED_DISTANCE) {
    return false;
  }
  if (isUrlNumericOrWhitespaceOnlyDiff(original, edited)) {
    return false;
  }
  if (isPureEndTruncation(original, edited)) {
    return false;
  }
  return true;
}

/**
 * Collect up to 30 most recent surviving edit rows for a brand voice.
 */
export async function collectVoiceEvidence(
  supabase: SupabaseClient,
  userId: string,
  brandVoiceId: string
): Promise<VoiceEvidenceRow[]> {
  const { data, error } = await supabase
    .from("repurposes")
    .select(
      "id, target_format, output, user_output, source_hash, edited_at"
    )
    .eq("user_id", userId)
    .eq("brand_voice_id", brandVoiceId)
    .eq("status", "complete")
    .not("edited_at", "is", null)
    .order("edited_at", { ascending: false })
    .limit(80);

  if (error) {
    console.error("Voice evidence query failed:", error);
    return [];
  }

  const surviving: VoiceEvidenceRow[] = [];
  for (const row of data ?? []) {
    if (surviving.length >= EVIDENCE_LIMIT) break;
    const original = outputToText(row.output);
    const edited = outputToText(row.user_output);
    if (!original || !edited) continue;
    if (!isVoiceSignalEdit(original, edited)) continue;
    surviving.push({
      repurposeId: row.id as string,
      targetFormat: row.target_format as TargetFormat,
      original,
      edited,
      sourceHash: (row.source_hash as string | null) ?? null,
      editedAt: row.edited_at as string,
    });
  }
  return surviving;
}

/**
 * Count evidence rows newer than `since` (inclusive of null = all count).
 * Used for the threshold trigger without full text filtering cost beyond a
 * bounded fetch - still applies the same voice-signal filters.
 */
export async function countNewVoiceEvidenceSince(
  supabase: SupabaseClient,
  userId: string,
  brandVoiceId: string,
  since: string | null
): Promise<number> {
  let query = supabase
    .from("repurposes")
    .select("id, output, user_output, edited_at")
    .eq("user_id", userId)
    .eq("brand_voice_id", brandVoiceId)
    .eq("status", "complete")
    .not("edited_at", "is", null)
    .order("edited_at", { ascending: false })
    .limit(40);

  if (since) {
    query = query.gt("edited_at", since);
  }

  const { data, error } = await query;
  if (error) {
    console.error("Voice evidence count query failed:", error);
    return 0;
  }

  let count = 0;
  for (const row of data ?? []) {
    const original = outputToText(row.output);
    const edited = outputToText(row.user_output);
    if (!original || !edited) continue;
    if (!isVoiceSignalEdit(original, edited)) continue;
    count += 1;
  }
  return count;
}
