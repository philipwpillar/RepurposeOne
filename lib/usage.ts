import { startOfMonth, endOfMonth, formatISO, subMinutes } from "date-fns";
import type { SupabaseClient } from "@supabase/supabase-js";
import { PLAN_LIMITS, RATE_LIMIT, UPGRADE_MESSAGES, rateLimitMaxForPlan } from "@/lib/config";
import type { Plan, UsageInfo } from "@/types";

export function getCurrentBillingPeriod(now = new Date()) {
  return {
    start: startOfMonth(now),
    end: endOfMonth(now),
  };
}

/**
 * Count billable generations in the current calendar month.
 *
 * A "generation" is one user action (single format, or a Regenerate All that
 * fans out to up to 4 formats), grouped by generation_id. Multi-format runs
 * therefore count as ONE repurpose, not one-per-format.
 *
 * Only rows with status = 'complete' consume quota. Failed generations are
 * free retries; pending rows are not billed until complete.
 *
 * Uses the count_monthly_generations RPC because PostgREST cannot express
 * COUNT(DISTINCT generation_id) through the query builder.
 */
export async function getMonthlyUsage(
  supabase: SupabaseClient,
  userId: string
): Promise<number> {
  const { start, end } = getCurrentBillingPeriod();

  const { data, error } = await supabase.rpc("count_monthly_generations", {
    p_user_id: userId,
    p_start: formatISO(start),
    p_end: formatISO(end),
  });

  if (error) {
    throw new Error(`Failed to fetch usage: ${error.message}`);
  }

  return data ?? 0;
}

export async function getUserPlan(
  supabase: SupabaseClient,
  userId: string
): Promise<Plan> {
  const { data, error } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", userId)
    .single();

  if (error || !data) {
    return "free";
  }

  return data.plan as Plan;
}

export async function checkUsageLimit(
  supabase: SupabaseClient,
  userId: string
): Promise<{ allowed: boolean; usage: UsageInfo }> {
  const plan = await getUserPlan(supabase, userId);
  const used = await getMonthlyUsage(supabase, userId);
  const limit = PLAN_LIMITS[plan];
  const { start, end } = getCurrentBillingPeriod();

  const usage: UsageInfo = {
    plan,
    used,
    limit,
    period_start: formatISO(start),
    period_end: formatISO(end),
  };

  return {
    allowed: used < limit,
    usage,
  };
}

export function getUpgradeMessage(plan: Plan): string {
  return UPGRADE_MESSAGES[plan];
}

/**
 * Short-window burst limit to protect the AI endpoint from abuse.
 * Counts complete + pending rows in the rolling window (failed rows excluded).
 */
export async function checkRateLimit(
  supabase: SupabaseClient,
  userId: string,
  plan: Plan
): Promise<{ allowed: boolean; retryAfterSeconds: number }> {
  const windowStart = subMinutes(new Date(), RATE_LIMIT.windowMinutes);

  const { count, error } = await supabase
    .from("repurposes")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .in("status", ["complete", "pending"])
    .gte("created_at", formatISO(windowStart));

  if (error) {
    throw new Error(`Failed to check rate limit: ${error.message}`);
  }

  const used = count ?? 0;
  return {
    allowed: used < rateLimitMaxForPlan(plan),
    retryAfterSeconds: RATE_LIMIT.windowMinutes * 60,
  };
}

/**
 * Short-window burst limit for POST /api/bundles/prepare.
 * Counts bundles rows created in the rolling window — prepare always
 * creates one on success, so this is a direct proxy for prepare-call
 * volume, unlike checkRateLimit (which counts repurposes and doesn't
 * apply here since prepare never creates repurposes rows).
 */
export async function checkBundlePrepareRateLimit(
  supabase: SupabaseClient,
  userId: string,
  plan: Plan
): Promise<{ allowed: boolean; retryAfterSeconds: number }> {
  const windowStart = subMinutes(new Date(), RATE_LIMIT.windowMinutes);

  const { count, error } = await supabase
    .from("bundles")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", formatISO(windowStart));

  if (error) {
    throw new Error(`Failed to check prepare rate limit: ${error.message}`);
  }

  const used = count ?? 0;
  return {
    allowed: used < rateLimitMaxForPlan(plan),
    retryAfterSeconds: RATE_LIMIT.windowMinutes * 60,
  };
}

/**
 * Burst limit for POST /api/bundles/generate.
 * Counts on created_at only — lifecycle/orphan sweeps must not touch metering
 * (updated_at is written by background jobs).
 *
 * Known gap: generate against an already-prepared bundle claims a row created
 * in an earlier window, so it is not counted here. Acceptable because H1
 * reserves generation quota before any vision spend; revisit if prepare and
 * generate are ever decoupled further.
 */
export async function checkBundleGenerateRateLimit(
  supabase: SupabaseClient,
  userId: string,
  plan: Plan
): Promise<{ allowed: boolean; retryAfterSeconds: number }> {
  const windowStart = subMinutes(new Date(), RATE_LIMIT.windowMinutes);

  const { count, error } = await supabase
    .from("bundles")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", formatISO(windowStart));

  if (error) {
    throw new Error(`Failed to check bundle generate rate limit: ${error.message}`);
  }

  const used = count ?? 0;
  return {
    allowed: used < rateLimitMaxForPlan(plan),
    retryAfterSeconds: RATE_LIMIT.windowMinutes * 60,
  };
}

export class QuotaExceededError extends Error {
  constructor(message = "quota_exceeded") {
    super(message);
    this.name = "QuotaExceededError";
  }
}

/**
 * Atomically reserve a pending repurpose under the monthly generation cap
 * (counts complete+pending DISTINCT generation_id). Call via service role.
 */
export async function reservePendingRepurpose(
  admin: SupabaseClient,
  params: {
    userId: string;
    limit: number;
    inputType: string;
    inputContent: string;
    brandVoiceId: string | null;
    targetFormat: string;
    generationId?: string;
  }
): Promise<{ id: string; source_hash: string | null }> {
  const { start, end } = getCurrentBillingPeriod();
  const { data, error } = await admin.rpc("reserve_pending_repurpose", {
    p_user_id: params.userId,
    p_limit: params.limit,
    p_start: formatISO(start),
    p_end: formatISO(end),
    p_input_type: params.inputType,
    p_input_content: params.inputContent,
    p_brand_voice_id: params.brandVoiceId,
    p_target_format: params.targetFormat,
    p_generation_id: params.generationId ?? null,
  });

  if (error) {
    if (error.message.includes("quota_exceeded")) {
      throw new QuotaExceededError();
    }
    throw new Error(`Failed to reserve repurpose: ${error.message}`);
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.id) {
    throw new Error("Failed to reserve repurpose: empty result");
  }

  return { id: row.id as string, source_hash: (row.source_hash as string) ?? null };
}

/**
 * Atomically create a bundle under the monthly N2 cap. Call via service role.
 */
export async function reserveBundleUnderCap(
  admin: SupabaseClient,
  params: {
    userId: string;
    limit: number;
    status: string;
    title?: string | null;
    context?: string | null;
  }
): Promise<{ id: string; generation_id: string }> {
  const { start, end } = getCurrentBillingPeriod();
  const { data, error } = await admin.rpc("reserve_bundle_under_cap", {
    p_user_id: params.userId,
    p_limit: params.limit,
    p_start: formatISO(start),
    p_end: formatISO(end),
    p_status: params.status,
    p_title: params.title ?? null,
    p_context: params.context ?? null,
  });

  if (error) {
    if (error.message.includes("bundle_quota_exceeded")) {
      throw new QuotaExceededError("bundle_quota_exceeded");
    }
    throw new Error(`Failed to reserve bundle: ${error.message}`);
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.id || !row?.generation_id) {
    throw new Error("Failed to reserve bundle: empty result");
  }

  return {
    id: row.id as string,
    generation_id: row.generation_id as string,
  };
}
