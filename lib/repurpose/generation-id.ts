import { createHash } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { TargetFormat } from "@/types";

/** Matches Postgres md5(trim(input_content)) on repurposes.source_hash. */
export function computeSourceHash(inputContent: string): string {
  return createHash("md5").update(inputContent.trim()).digest("hex");
}

/** Max formats in one billed generation group (Regenerate All). */
const MAX_FORMATS_PER_GROUP = 4;

/** Reuse window for client-minted generation_id (Regenerate All batch). */
const GENERATION_GROUP_WINDOW_MS = 15 * 60 * 1000;

export class GenerationIdValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GenerationIdValidationError";
  }
}

type SiblingRow = {
  target_format: string;
  source_hash: string | null;
  created_at: string;
};

/**
 * Validates client-supplied generation_id for multi-format billing groups.
 * Route-only validation (no advisory lock — small parallel race window remains).
 *
 * - Omit client id → undefined (DB assigns a fresh UUID per row).
 * - Fresh client UUID with no siblings → accept (first format in parallel batch).
 * - Existing siblings → same source_hash, within window, ≤4 formats, no duplicate format.
 */
export async function resolveGenerationId(
  supabase: SupabaseClient,
  params: {
    userId: string;
    clientGenerationId?: string;
    sourceHash: string;
    targetFormat: TargetFormat;
  }
): Promise<string | undefined> {
  const { userId, clientGenerationId, sourceHash, targetFormat } = params;

  if (!clientGenerationId) {
    return undefined;
  }

  const { data: siblings, error } = await supabase
    .from("repurposes")
    .select("target_format, source_hash, created_at")
    .eq("user_id", userId)
    .eq("generation_id", clientGenerationId);

  if (error) {
    throw new Error(`Failed to validate generation group: ${error.message}`);
  }

  const rows = (siblings ?? []) as SiblingRow[];

  if (rows.length === 0) {
    return clientGenerationId;
  }

  const anchorTime = new Date(rows[0].created_at).getTime();
  const now = Date.now();

  if (now - anchorTime > GENERATION_GROUP_WINDOW_MS) {
    throw new GenerationIdValidationError(
      "This generation group has expired. Start a new generation instead of reusing this id."
    );
  }

  for (const row of rows) {
    if (row.source_hash !== sourceHash) {
      throw new GenerationIdValidationError(
        "generation_id does not match this input source."
      );
    }
  }

  if (rows.some((row) => row.target_format === targetFormat)) {
    throw new GenerationIdValidationError(
      `A ${targetFormat} repurpose already exists for this generation group.`
    );
  }

  if (rows.length >= MAX_FORMATS_PER_GROUP) {
    throw new GenerationIdValidationError(
      "This generation group already has the maximum number of formats."
    );
  }

  return clientGenerationId;
}
