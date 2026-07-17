import type { SupabaseClient } from "@supabase/supabase-js";
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
};

function resolveOutput(row: RatedRow): RepurposeOutput | null {
  const preferred = row.user_output ?? row.output;
  const parsed = RepurposeOutputSchema.safeParse(preferred);
  return parsed.success ? parsed.data : null;
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}

/**
 * Build a prompt block from the user's rated outputs for a format.
 * Up to 2 thumbs-up (prefer user_output) + 1 thumbs-down as negative signal.
 */
export function buildVoiceExemplars(rows: RatedRow[]): string {
  const positives: string[] = [];
  const negatives: string[] = [];

  for (const row of rows) {
    if (row.user_rating === 1 && positives.length < POSITIVE_LIMIT) {
      const output = resolveOutput(row);
      if (!output) continue;
      const text = formatOutputForCopy(output).trim();
      if (text) positives.push(truncate(text, POSITIVE_MAX_CHARS));
    }
  }

  for (const row of rows) {
    if (row.user_rating === -1 && negatives.length < NEGATIVE_LIMIT) {
      const output = resolveOutput(row);
      if (!output) continue;
      const text = formatOutputForCopy(output).trim();
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
 * Fetch recent rated rows for a user+format and build the exemplar prompt block.
 * On query failure, returns "" so generation proceeds without exemplars.
 */
export async function fetchVoiceExemplarsText(
  supabase: SupabaseClient,
  userId: string,
  targetFormat: TargetFormat
): Promise<string> {
  try {
    const { data, error } = await supabase
      .from("repurposes")
      .select("user_rating, output, user_output, created_at")
      .eq("user_id", userId)
      .eq("target_format", targetFormat)
      .eq("status", "complete")
      .not("user_rating", "is", null)
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
