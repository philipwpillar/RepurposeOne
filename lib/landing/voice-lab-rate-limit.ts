import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  VOICE_LAB_DAILY_LIMIT,
  VOICE_LAB_HOURLY_LIMIT,
} from "@/lib/landing/voice-lab-config";

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

const IPV4_RE =
  /^(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)(?:\.(?:25[0-5]|2[0-4]\d|1?\d?\d)){3})$/;
const IPV6_RE =
  /^(?:[0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/;

function isPlausibleIp(value: string | undefined | null): value is string {
  if (!value) return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  return IPV4_RE.test(trimmed) || IPV6_RE.test(trimmed);
}

/**
 * Vercel-aware client IP resolution. Prefer platform headers; fail closed when absent.
 */
export function resolveVoiceLabClientIp(request: Request): string | null {
  const vercelForwarded = request.headers.get("x-vercel-forwarded-for");
  if (vercelForwarded) {
    const candidate = vercelForwarded.split(",")[0]?.trim();
    if (isPlausibleIp(candidate)) return candidate;
  }

  const realIp = request.headers.get("x-real-ip")?.trim();
  if (isPlausibleIp(realIp)) return realIp;

  const xff = request.headers.get("x-forwarded-for");
  if (xff) {
    const candidate = xff.split(",")[0]?.trim();
    if (isPlausibleIp(candidate)) return candidate;
  }

  return null;
}

export function hashVoiceLabClientIp(ip: string, salt: string): string {
  return createHash("sha256").update(`${ip}${salt}`).digest("hex");
}

export async function checkVoiceLabRateLimit(
  admin: SupabaseClient,
  ipHash: string
): Promise<{ allowed: boolean }> {
  const now = Date.now();
  const hourAgo = new Date(now - HOUR_MS).toISOString();
  const dayAgo = new Date(now - DAY_MS).toISOString();

  const { count: hourCount, error: hourError } = await admin
    .from("voice_lab_hits")
    .select("*", { count: "exact", head: true })
    .eq("ip_hash", ipHash)
    .gte("created_at", hourAgo);

  if (hourError) throw hourError;
  if ((hourCount ?? 0) >= VOICE_LAB_HOURLY_LIMIT) {
    return { allowed: false };
  }

  const { count: dayCount, error: dayError } = await admin
    .from("voice_lab_hits")
    .select("*", { count: "exact", head: true })
    .eq("ip_hash", ipHash)
    .gte("created_at", dayAgo);

  if (dayError) throw dayError;
  if ((dayCount ?? 0) >= VOICE_LAB_DAILY_LIMIT) {
    return { allowed: false };
  }

  const { error: insertError } = await admin
    .from("voice_lab_hits")
    .insert({ ip_hash: ipHash });

  if (insertError) throw insertError;

  return { allowed: true };
}

/** GDPR retention — delete rate-limit rows older than 48 hours. */
export async function purgeExpiredVoiceLabHits(
  admin: SupabaseClient
): Promise<number> {
  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

  const { data, error } = await admin
    .from("voice_lab_hits")
    .delete()
    .lt("created_at", cutoff)
    .select("id");

  if (error) throw error;
  return data?.length ?? 0;
}
