import { startOfMonth, endOfMonth, formatISO, subMinutes } from "date-fns";
import type { SupabaseClient } from "@supabase/supabase-js";
import { PLAN_LIMITS, RATE_LIMIT, UPGRADE_MESSAGES } from "@/lib/config";
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
  userId: string
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
    allowed: used < RATE_LIMIT.maxRequests,
    retryAfterSeconds: RATE_LIMIT.windowMinutes * 60,
  };
}
