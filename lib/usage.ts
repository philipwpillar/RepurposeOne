import { startOfMonth, endOfMonth, formatISO } from "date-fns";
import type { SupabaseClient } from "@supabase/supabase-js";
import { PLAN_LIMITS, UPGRADE_MESSAGES } from "@/lib/config";
import type { Plan, UsageInfo } from "@/types";

export function getCurrentBillingPeriod(now = new Date()) {
  return {
    start: startOfMonth(now),
    end: endOfMonth(now),
  };
}

/**
 * Count repurposes in the current calendar month.
 * All rows count (including failed) to prevent limit bypass via retries.
 */
export async function getMonthlyUsage(
  supabase: SupabaseClient,
  userId: string
): Promise<number> {
  const { start, end } = getCurrentBillingPeriod();

  const { count, error } = await supabase
    .from("repurposes")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", formatISO(start))
    .lte("created_at", formatISO(end));

  if (error) {
    throw new Error(`Failed to fetch usage: ${error.message}`);
  }

  return count ?? 0;
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
