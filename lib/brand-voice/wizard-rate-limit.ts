import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

export const BRAND_VOICE_WIZARD_DAILY_LIMIT = 5;

const DAY_MS = 24 * 60 * 60 * 1000;

function wizardUserHash(userId: string): string {
  const salt = process.env.VOICE_LAB_IP_SALT;
  if (!salt) {
    throw new Error("Brand voice wizard rate-limit salt is not configured");
  }

  return createHash("sha256")
    .update(`brand-voice-wizard:${userId}:${salt}`)
    .digest("hex");
}

export async function checkBrandVoiceWizardRateLimit(
  admin: SupabaseClient,
  userId: string
): Promise<{ allowed: boolean; limit: number }> {
  const userHash = wizardUserHash(userId);
  const dayAgo = new Date(Date.now() - DAY_MS).toISOString();

  const { count, error } = await admin
    .from("voice_lab_hits")
    .select("*", { count: "exact", head: true })
    .eq("ip_hash", userHash)
    .gte("created_at", dayAgo);

  if (error) throw error;

  if ((count ?? 0) >= BRAND_VOICE_WIZARD_DAILY_LIMIT) {
    return { allowed: false, limit: BRAND_VOICE_WIZARD_DAILY_LIMIT };
  }

  const { error: insertError } = await admin
    .from("voice_lab_hits")
    .insert({ ip_hash: userHash });

  if (insertError) throw insertError;

  return { allowed: true, limit: BRAND_VOICE_WIZARD_DAILY_LIMIT };
}
