import type { Plan, TargetFormat } from "@/types";

/**
 * Plan limits — monthly repurpose count derived from repurposes table rows.
 * Adjust via env or here; no mutable counter table.
 */
export const PLAN_LIMITS: Record<Plan, number> = {
  free: Number(process.env.PLAN_LIMIT_FREE ?? 10),
  creator: Number(process.env.PLAN_LIMIT_CREATOR ?? 100),
  pro: Number(process.env.PLAN_LIMIT_PRO ?? 1000),
};

export const UPGRADE_MESSAGES: Record<Plan, string> = {
  free: "You've used all your free repurposes this month. Upgrade to Creator (£19/mo) for 100 repurposes/month.",
  creator: "You've reached your Creator plan limit. Upgrade to Pro (£39/mo) for higher limits.",
  pro: "You've reached your plan limit. Contact support if you need more capacity.",
};

/** Formats that use the stronger (quality) model tier. */
export const STRONG_MODEL_FORMATS: TargetFormat[] = ["x_thread"];

export const AI_CONFIG = {
  provider: (process.env.AI_PROVIDER ?? "openai") as "openai",
  fastModel: process.env.AI_MODEL_FAST ?? "gpt-4o-mini",
  strongModel: process.env.AI_MODEL_STRONG ?? "gpt-4o",
  maxInputChars: Number(process.env.AI_MAX_INPUT_CHARS ?? 30_000),
  temperature: Number(process.env.AI_TEMPERATURE ?? 0.7),
} as const;

export function getModelForFormat(format: TargetFormat): string {
  return STRONG_MODEL_FORMATS.includes(format)
    ? AI_CONFIG.strongModel
    : AI_CONFIG.fastModel;
}
