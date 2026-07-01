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

export type AiProvider = "openai" | "openrouter";

function parseAiProvider(value: string | undefined): AiProvider {
  return value === "openrouter" ? "openrouter" : "openai";
}

const AI_PROVIDER = parseAiProvider(process.env.AI_PROVIDER);

// ---------------------------------------------------------------------------
// AI model routing — cost vs quality
// ---------------------------------------------------------------------------
//
// Two tiers let us match model spend to output value:
//
//   fast   — cheap + quick; good for short/simple formats (captions, one-liners).
//   strong — higher quality; better for multi-part outputs that need coherence
//            (X threads, newsletters, long-form posts).
//
// Defaults below are starting points only — override without code changes:
//   AI_MODEL_FAST    — fast-tier model
//   AI_MODEL_STRONG  — strong-tier model
//
// To assign a new format to a tier, add it to FORMAT_MODEL_TIER below.

export type ModelTier = "fast" | "strong";

/**
 * Provider-specific defaults when AI_MODEL_FAST / AI_MODEL_STRONG are unset.
 *
 * OpenRouter:
 *   fast   — google/gemini-3.1-flash-lite: very low cost, low latency; fine for short outputs.
 *   strong — anthropic/claude-sonnet-4.6: strong instruction-following and JSON
 *            structure at a similar or better price than gpt-4o on OpenRouter.
 *
 * OpenAI (direct):
 *   fast   — gpt-4o-mini: native fast/cheap tier on the OpenAI API.
 *   strong — gpt-4o: best available quality when not routing through OpenRouter.
 */
const PROVIDER_DEFAULT_MODELS: Record<AiProvider, Record<ModelTier, string>> = {
  openai: {
    fast: "gpt-4o-mini",
    strong: "gpt-4o",
  },
  openrouter: {
    fast: "google/gemini-3.1-flash-lite",
    strong: "anthropic/claude-sonnet-4.6",
  },
};

/** Fast/cheap tier — simple, short outputs. Override via AI_MODEL_FAST. */
export const FAST_MODEL =
  process.env.AI_MODEL_FAST ?? PROVIDER_DEFAULT_MODELS[AI_PROVIDER].fast;

/** Strong/high-quality tier — multi-part, coherence-heavy formats. Override via AI_MODEL_STRONG. */
export const STRONG_MODEL =
  process.env.AI_MODEL_STRONG ?? PROVIDER_DEFAULT_MODELS[AI_PROVIDER].strong;

/**
 * Maps each output format to a model tier.
 *
 *   x_thread → strong — threads need coherent multi-tweet arcs, hooks, and pacing;
 *                       routed to STRONG_MODEL (Claude Sonnet 4.6 on OpenRouter by default).
 *
 * Add new formats here when they ship (e.g. linkedin_post → "fast").
 */
export const FORMAT_MODEL_TIER: Record<TargetFormat, ModelTier> = {
  x_thread: "strong",
  linkedin: "strong",
  instagram: "fast",
  email: "strong",
};

/** Returns the model tier configured for a given output format. */
export function getTierForFormat(format: TargetFormat): ModelTier {
  return FORMAT_MODEL_TIER[format];
}

/**
 * Resolves the model ID for a format and tier.
 * Pass an explicit tier to override the format default (e.g. for testing).
 */
export function getModelForFormat(
  format: TargetFormat,
  tier?: ModelTier
): string {
  const resolvedTier = tier ?? getTierForFormat(format);
  return resolvedTier === "strong" ? STRONG_MODEL : FAST_MODEL;
}

export const AI_CONFIG = {
  provider: AI_PROVIDER,
  fastModel: FAST_MODEL,
  strongModel: STRONG_MODEL,
  maxInputChars: Number(process.env.AI_MAX_INPUT_CHARS ?? 30_000),
  temperature: Number(process.env.AI_TEMPERATURE ?? 0.7),
} as const;
