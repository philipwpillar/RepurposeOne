import type { Plan, TargetFormat } from "@/types";

/**
 * Plan limits — monthly repurpose count from complete repurposes rows only.
 * Adjust via env or here; no mutable counter table.
 */
export const PLAN_LIMITS: Record<Plan, number> = {
  free: Number(process.env.PLAN_LIMIT_FREE ?? 10),
  creator: Number(process.env.PLAN_LIMIT_CREATOR ?? 100),
  pro: Number(process.env.PLAN_LIMIT_PRO ?? 1000),
};

/** Burst rate limit for POST /api/generate (per user, rolling window). */
export const RATE_LIMIT = {
  maxRequests: Number(process.env.RATE_LIMIT_MAX_REQUESTS ?? 10),
  windowMinutes: Number(process.env.RATE_LIMIT_WINDOW_MINUTES ?? 10),
} as const;

/** Client + server max length for pasted source content. */
export const INPUT_CONTENT_MAX_LENGTH = 20_000;
export const INPUT_CONTENT_MIN_LENGTH = 50;

export const UPGRADE_MESSAGES: Record<Plan, string> = {
  free: "You've used all your free repurposes this month. Upgrade to Creator (£19/mo) for 100 repurposes/month.",
  creator: "You've reached your Creator plan limit. Upgrade to Pro (£39/mo) for higher limits.",
  pro: "You've reached your plan limit. Contact support if you need more capacity.",
};

/** Formats that use the stronger (quality) model tier. */
export const STRONG_MODEL_FORMATS: TargetFormat[] = ["x_thread"];

export type AiProvider = "openai" | "openrouter";

function parseAiProvider(value: string | undefined): AiProvider {
  return value === "openrouter" ? "openrouter" : "openai";
}

const AI_PROVIDER = parseAiProvider(process.env.AI_PROVIDER);

export const AI_CONFIG = {
  provider: AI_PROVIDER,
  fastModel:
    process.env.AI_MODEL_FAST ??
    (AI_PROVIDER === "openrouter" ? "openai/gpt-4o-mini" : "gpt-4o-mini"),
  strongModel:
    process.env.AI_MODEL_STRONG ??
    (AI_PROVIDER === "openrouter" ? "openai/gpt-4o" : "gpt-4o"),
  maxInputChars: Number(process.env.AI_MAX_INPUT_CHARS ?? 30_000),
  temperature: Number(process.env.AI_TEMPERATURE ?? 0.7),
} as const;

export function getModelForFormat(format: TargetFormat): string {
  return STRONG_MODEL_FORMATS.includes(format)
    ? AI_CONFIG.strongModel
    : AI_CONFIG.fastModel;
}
