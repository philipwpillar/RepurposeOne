import type { SupabaseClient } from "@supabase/supabase-js";
import { stripEmDashes } from "@/lib/ai/strip-em-dashes";
import { formatOutputForCopy } from "@/lib/format-output";
import {
  RepurposeOutputSchema,
  type RepurposeOutput,
  type TargetFormat,
} from "@/types";

const POSITIVE_LIMIT = 2;
const NEGATIVE_LIMIT = 1;
const POSITIVE_MAX_CHARS = 800;
const NEGATIVE_MAX_CHARS = 400;

type RatedRow = {
  user_rating: number | null;
  output: unknown;
  user_output: unknown;
  created_at: string;
  edited_at?: string | null;
};

function resolvePositiveOutput(row: RatedRow): RepurposeOutput | null {
  const preferred = row.user_output ?? row.output;
  const parsed = RepurposeOutputSchema.safeParse(preferred);
  return parsed.success ? parsed.data : null;
}

/** Negatives use model output only - never the user's corrected text. */
function resolveNegativeOutput(row: RatedRow): RepurposeOutput | null {
  if (row.output == null) return null;
  const parsed = RepurposeOutputSchema.safeParse(row.output);
  return parsed.success ? parsed.data : null;
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}

function rowRecencyMs(row: RatedRow): number {
  const stamp = row.edited_at || row.created_at;
  const ms = Date.parse(stamp);
  return Number.isFinite(ms) ? ms : 0;
}

/** Positive band: 0 = thumbs-up+edit, 1 = thumbs-up, 2 = unrated edit. */
function positiveBand(row: RatedRow): number | null {
  if (row.user_rating === -1) return null;
  const edited = Boolean(row.edited_at);
  if (row.user_rating === 1 && edited) return 0;
  if (row.user_rating === 1) return 1;
  if (edited && row.user_rating == null) return 2;
  return null;
}

/**
 * Build a prompt block from the user's rated/edited outputs for a format.
 * Up to 2 positives (banded) + 1 thumbs-down as negative signal.
 */
export function buildVoiceExemplars(rows: RatedRow[]): string {
  const positives: string[] = [];
  const negatives: string[] = [];

  const positiveCandidates = rows
    .map((row) => ({ row, band: positiveBand(row) }))
    .filter((c): c is { row: RatedRow; band: number } => c.band !== null)
    .sort((a, b) => {
      if (a.band !== b.band) return a.band - b.band;
      return rowRecencyMs(b.row) - rowRecencyMs(a.row);
    });

  for (const { row } of positiveCandidates) {
    if (positives.length >= POSITIVE_LIMIT) break;
    const output = resolvePositiveOutput(row);
    if (!output) continue;
    const text = stripEmDashes(formatOutputForCopy(output).trim());
    if (text) positives.push(truncate(text, POSITIVE_MAX_CHARS));
  }

  for (const row of rows) {
    if (row.user_rating === -1 && negatives.length < NEGATIVE_LIMIT) {
      const output = resolveNegativeOutput(row);
      if (!output) continue;
      const text = stripEmDashes(formatOutputForCopy(output).trim());
      if (text) negatives.push(truncate(text, NEGATIVE_MAX_CHARS));
    }
  }

  if (positives.length === 0 && negatives.length === 0) {
    return "";
  }

  const parts: string[] = [];

  if (positives.length > 0) {
    parts.push(
      "Past outputs the user liked for this format (match style and voice; do not copy verbatim):\n" +
        positives
          .map((p, i) => `--- Liked example ${i + 1} ---\n${p}`)
          .join("\n\n")
    );
  }

  if (negatives.length > 0) {
    parts.push(
      "Past outputs the user disliked for this format (avoid this style):\n" +
        negatives
          .map((p, i) => `--- Avoid example ${i + 1} ---\n${p}`)
          .join("\n\n")
    );
  }

  return parts.join("\n\n");
}

/**
 * Fetch recent rated/edited rows for a user+format+voice and build the exemplar
 * prompt block. On query failure, returns "" so generation proceeds without
 * exemplars. Null brandVoiceId (inline-voice path) returns "" - never fall
 * back to user-wide exemplars.
 */
export async function fetchVoiceExemplarsText(
  supabase: SupabaseClient,
  userId: string,
  targetFormat: TargetFormat,
  brandVoiceId: string | null
): Promise<string> {
  if (!brandVoiceId) {
    return "";
  }

  try {
    const { data, error } = await supabase
      .from("repurposes")
      .select("user_rating, output, user_output, created_at, edited_at")
      .eq("user_id", userId)
      .eq("target_format", targetFormat)
      .eq("brand_voice_id", brandVoiceId)
      .eq("status", "complete")
      .or("user_rating.not.is.null,edited_at.not.is.null")
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      console.error("Exemplar query failed:", error);
      return "";
    }

    return buildVoiceExemplars((data ?? []) as RatedRow[]);
  } catch (err) {
    console.error("Exemplar query failed:", err);
    return "";
  }
}
