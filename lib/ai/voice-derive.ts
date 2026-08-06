import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { completeOpenRouterJson } from "@/lib/ai/generate";
import {
  collectVoiceEvidence,
  countNewVoiceEvidenceSince,
  type VoiceEvidenceRow,
} from "@/lib/ai/voice-evidence";
import { STRONG_MODEL } from "@/lib/config";
import { stripEmDashes } from "@/lib/ai/strip-em-dashes";

export const MAX_ACTIVE_RULES = 8;
export const MAX_RULE_WORDS = 15;
export const DERIVE_RATE_LIMIT_MS = 60 * 60 * 1000;
export const EVIDENCE_THRESHOLD = 8;

/** Pinned Qwen strong-tier slug - same family as Studio generate. */
export const VOICE_DERIVE_MODEL = STRONG_MODEL;

const DerivedRuleSchema = z.object({
  rule: z.string().min(1).max(200),
  evidence_ids: z.array(z.string().uuid()).min(1),
});

const DerivedRulesResponseSchema = z.object({
  rules: z.array(DerivedRuleSchema),
});

export type DerivedRuleCandidate = z.infer<typeof DerivedRuleSchema>;

export type ValidatedVoiceRule = {
  rule: string;
  evidence_ids: string[];
};

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function normaliseRuleText(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Post-parse validator (E7a). Drop under-cited, over-long, and foreign-id rules.
 * Truncate to MAX_ACTIVE_RULES. Exported for the eval harness.
 */
export function validateDerivedRules(
  candidates: DerivedRuleCandidate[],
  evidenceIdSet: Set<string>
): ValidatedVoiceRule[] {
  const kept: ValidatedVoiceRule[] = [];
  for (const candidate of candidates) {
    const uniqueIds = [...new Set(candidate.evidence_ids)];
    if (uniqueIds.length < 2) continue;
    if (wordCount(candidate.rule) > MAX_RULE_WORDS) continue;
    if (uniqueIds.some((id) => !evidenceIdSet.has(id))) continue;
    const rule = stripEmDashes(candidate.rule.trim());
    if (!rule) continue;
    kept.push({ rule, evidence_ids: uniqueIds });
    if (kept.length >= MAX_ACTIVE_RULES) break;
  }
  return kept;
}

/** Alias expected by voice-eval E7a. */
export const validateVoiceRules = validateDerivedRules;

function buildDerivePrompt(evidence: VoiceEvidenceRow[]): {
  system: string;
  user: string;
} {
  const examples = evidence
    .map(
      (row, i) =>
        `Example ${i + 1} (id=${row.repurposeId}, format=${row.targetFormat}):\n` +
        `ORIGINAL:\n${row.original.slice(0, 1200)}\n` +
        `EDITED:\n${row.edited.slice(0, 1200)}`
    )
    .join("\n\n");

  const system = `You extract short voice preference rules from how a writer edits AI drafts.
Return JSON only: { "rules": [ { "rule": string, "evidence_ids": string[] } ] }.
Rules must be imperative preferences under ${MAX_RULE_WORDS} words.
Identify ONLY patterns that recur across two or more distinct examples.
Cite the supporting example ids from the evidence you were given.
Returning an empty rules array is correct and expected when nothing recurs.
Inventing a plausible-sounding rule that is not grounded in recurring edits is a failure.
Do not use em dashes or en dashes.`;

  const user = `Evidence set:\n\n${examples}\n\nReturn JSON now.`;

  return { system, user };
}

/**
 * Call the model and validate. Does not write to the database.
 * Exported for live eval (E7b).
 */
export async function deriveVoiceRules(
  evidence: VoiceEvidenceRow[]
): Promise<ValidatedVoiceRule[]> {
  if (evidence.length < 2) return [];

  const evidenceIdSet = new Set(evidence.map((e) => e.repurposeId));
  const { system, user } = buildDerivePrompt(evidence);

  const result = await completeOpenRouterJson({
    model: VOICE_DERIVE_MODEL,
    temperature: 0.2,
    schema: DerivedRulesResponseSchema,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  });

  return validateDerivedRules(result.data.rules, evidenceIdSet);
}

/** Alias for eval harness. */
export const deriveRules = deriveVoiceRules;

export type DeriveWriteResult = {
  inserted: number;
  skippedRateLimit: boolean;
  skippedInsufficientEvidence: boolean;
};

/**
 * Full derivation write path for a brand voice. Fail-open: throws only on
 * hard DB errors after successful model parse; callers should catch.
 */
export async function deriveAndPersistVoiceRules(
  admin: SupabaseClient,
  userId: string,
  brandVoiceId: string,
  options?: { force?: boolean }
): Promise<DeriveWriteResult> {
  const { data: voice, error: voiceError } = await admin
    .from("brand_voices")
    .select("id, user_id, rules_derived_at")
    .eq("id", brandVoiceId)
    .eq("user_id", userId)
    .maybeSingle();

  if (voiceError || !voice) {
    throw new Error("Brand voice not found");
  }

  const derivedAt = voice.rules_derived_at as string | null;
  if (!options?.force && derivedAt) {
    const elapsed = Date.now() - Date.parse(derivedAt);
    if (Number.isFinite(elapsed) && elapsed < DERIVE_RATE_LIMIT_MS) {
      return {
        inserted: 0,
        skippedRateLimit: true,
        skippedInsufficientEvidence: false,
      };
    }
  }

  const evidence = await collectVoiceEvidence(admin, userId, brandVoiceId);
  if (evidence.length < 2) {
    await admin
      .from("brand_voices")
      .update({ rules_derived_at: new Date().toISOString() })
      .eq("id", brandVoiceId)
      .eq("user_id", userId);
    return {
      inserted: 0,
      skippedRateLimit: false,
      skippedInsufficientEvidence: true,
    };
  }

  let validated: ValidatedVoiceRule[] = [];
  try {
    validated = await deriveVoiceRules(evidence);
  } catch (err) {
    console.error("Voice derive model call failed:", err);
    // Fail open: leave existing rules untouched; still stamp derived_at on force.
    if (options?.force) {
      await admin
        .from("brand_voices")
        .update({ rules_derived_at: new Date().toISOString() })
        .eq("id", brandVoiceId)
        .eq("user_id", userId);
    }
    throw err;
  }

  const { data: existing, error: existingError } = await admin
    .from("voice_rules")
    .select("id, rule, status")
    .eq("brand_voice_id", brandVoiceId)
    .eq("user_id", userId);

  if (existingError) {
    throw new Error(existingError.message);
  }

  const tombstones = new Set(
    (existing ?? [])
      .filter((r) => r.status === "dismissed")
      .map((r) => normaliseRuleText(r.rule as string))
  );

  const toInsert = validated.filter(
    (r) => !tombstones.has(normaliseRuleText(r.rule))
  );

  const activeIds = (existing ?? [])
    .filter((r) => r.status === "active")
    .map((r) => r.id as string);

  if (activeIds.length > 0) {
    const { error: deleteError } = await admin
      .from("voice_rules")
      .delete()
      .in("id", activeIds)
      .eq("user_id", userId);
    if (deleteError) {
      throw new Error(deleteError.message);
    }
  }

  if (toInsert.length > 0) {
    const { error: insertError } = await admin.from("voice_rules").insert(
      toInsert.map((r) => ({
        user_id: userId,
        brand_voice_id: brandVoiceId,
        rule: r.rule,
        evidence_ids: r.evidence_ids,
        status: "active",
      }))
    );
    if (insertError) {
      throw new Error(insertError.message);
    }
  }

  const { error: stampError } = await admin
    .from("brand_voices")
    .update({ rules_derived_at: new Date().toISOString() })
    .eq("id", brandVoiceId)
    .eq("user_id", userId);

  if (stampError) {
    throw new Error(stampError.message);
  }

  return {
    inserted: toInsert.length,
    skippedRateLimit: false,
    skippedInsufficientEvidence: false,
  };
}

/**
 * Threshold path: if enough new evidence since last derive, run derivation.
 * Failures are logged only - never surface to the user.
 */
export async function maybeDeriveVoiceRulesAfterGenerate(
  admin: SupabaseClient,
  userId: string,
  brandVoiceId: string | null | undefined
): Promise<void> {
  if (!brandVoiceId) return;

  try {
    const { data: voice } = await admin
      .from("brand_voices")
      .select("rules_derived_at")
      .eq("id", brandVoiceId)
      .eq("user_id", userId)
      .maybeSingle();

    if (!voice) return;

    const derivedAt = (voice.rules_derived_at as string | null) ?? null;
    if (derivedAt) {
      const elapsed = Date.now() - Date.parse(derivedAt);
      if (Number.isFinite(elapsed) && elapsed < DERIVE_RATE_LIMIT_MS) {
        return;
      }
    }

    const newCount = await countNewVoiceEvidenceSince(
      admin,
      userId,
      brandVoiceId,
      derivedAt
    );
    if (newCount < EVIDENCE_THRESHOLD) return;

    await deriveAndPersistVoiceRules(admin, userId, brandVoiceId);
  } catch (err) {
    console.error("Background voice derive failed:", err);
  }
}
