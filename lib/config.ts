import type { Plan, TargetFormat } from "@/types";

function envNumber(value: string | undefined, fallback: number): number {
  if (value === undefined || value.trim() === "") return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/**
 * Plan limits — monthly repurpose count from complete repurposes rows only.
 * Adjust via env or here; no mutable counter table.
 */
export const PLAN_LIMITS: Record<Plan, number> = {
  free: envNumber(process.env.PLAN_LIMIT_FREE, 10),
  creator: envNumber(process.env.PLAN_LIMIT_CREATOR, 100),
  pro: envNumber(process.env.PLAN_LIMIT_PRO, 1000),
  pro_plus: envNumber(process.env.PLAN_LIMIT_PRO_PLUS, 1000),
};

/** Burst rate limit for POST /api/generate (per user, rolling window). */
export const RATE_LIMIT = {
  maxRequests: envNumber(process.env.RATE_LIMIT_MAX_REQUESTS, 10),
  windowMinutes: envNumber(process.env.RATE_LIMIT_WINDOW_MINUTES, 10),
} as const;

/** Plan-aware burst max — pro_plus gets a higher ceiling (N3); others use RATE_LIMIT. */
export function rateLimitMaxForPlan(plan: Plan): number {
  if (plan === "pro_plus") {
    return envNumber(process.env.RATE_LIMIT_MAX_REQUESTS_PRO_PLUS, 20);
  }
  return RATE_LIMIT.maxRequests;
}

/** Client + server max length for pasted source content. */
export const INPUT_CONTENT_MAX_LENGTH = 20_000;
export const INPUT_CONTENT_MIN_LENGTH = 50;

export const UPGRADE_MESSAGES: Record<Plan, string> = {
  free: "You've used all your free repurposes this month. Upgrade to Creator (£19/mo) for 100 repurposes/month.",
  creator: "You've reached your Creator plan limit. Upgrade to Pro (£44/mo) for higher limits.",
  pro: "You've reached your Pro plan limit. Upgrade to Pro Plus (£59/mo) for Moment Bundles and a higher burst limit.",
  pro_plus:
    "You've reached your Pro Plus plan limit for this month. Contact support if you need more capacity.",
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
 * OpenRouter provider allowlist — GDPR posture (Option A).
 * Requests may ONLY route to these providers. Deliberately a code constant,
 * NOT env-configurable: Vercel env vars override code silently, and this is
 * the one pinning layer that must survive a stale dashboard. Changing it
 * requires a PR and re-triggers the transfer check (host, region, data
 * policy on the OpenRouter endpoint page) before merge.
 * "deepinfra/fp8" verified live 2026-07-14: US host, ZDR-flagged, no-train.
 */
export const OPENROUTER_ALLOWED_PROVIDERS = ["deepinfra/fp8"] as const;

/**
 * Provider-specific defaults when AI_MODEL_FAST / AI_MODEL_STRONG are unset.
 *
 * Production uses OpenRouter only (`AI_PROVIDER=openrouter`). Defaults are
 * open-weight Qwen 3.5 models (Apache 2.0), multi-host and US-pinnable via
 * OPENROUTER_ALLOWED_PROVIDERS. Closed Alibaba-hosted-only Qwen SKUs are
 * excluded by the provider allowlist by design.
 *
 *   fast   — qwen/qwen3.5-35b-a3b: cheap + quick; good for short outputs.
 *   strong — qwen/qwen3.5-397b-a17b: coherence for multi-part outputs; same
 *            native VLM also serves the vision path (consistent voice).
 *
 * The openai map entries exist only so a mis-set AI_PROVIDER still resolves model
 * IDs for typing; generate.ts will throw rather than call OpenAI directly.
 */
const PROVIDER_DEFAULT_MODELS: Record<AiProvider, Record<ModelTier, string>> = {
  openai: {
    fast: "gpt-4o-mini",
    strong: "gpt-4o",
  },
  openrouter: {
    fast: "qwen/qwen3.5-35b-a3b",
    strong: "qwen/qwen3.5-397b-a17b",
  },
};

/** Fast/cheap tier — simple, short outputs. Override via AI_MODEL_FAST. */
export const FAST_MODEL =
  process.env.AI_MODEL_FAST ?? PROVIDER_DEFAULT_MODELS[AI_PROVIDER].fast;

/** Strong/high-quality tier — multi-part, coherence-heavy formats. Override via AI_MODEL_STRONG. */
export const STRONG_MODEL =
  process.env.AI_MODEL_STRONG ?? PROVIDER_DEFAULT_MODELS[AI_PROVIDER].strong;

/**
 * Vision model for photo repurpose — pin a version slug, no -latest alias.
 * Defaults to the same open-weight Qwen 3.5 VLM as the strong text tier so
 * text and photo outputs share one model (consistent voice).
 */
export const VISION_MODEL =
  process.env.AI_MODEL_VISION ?? "qwen/qwen3.5-397b-a17b";

/** Plans allowed to use photo / vision repurpose. */
export const VISION_ALLOWED_PLANS: Plan[] = ["creator", "pro", "pro_plus"];

export function planAllowsVision(plan: Plan): boolean {
  return VISION_ALLOWED_PLANS.includes(plan);
}

/** Plans allowed to use Moment Bundles (enforcement lands with Brief 1a/1b). */
export const BUNDLE_ALLOWED_PLANS: Plan[] = ["pro_plus"];

export function planAllowsBundles(plan: Plan): boolean {
  return BUNDLE_ALLOWED_PLANS.includes(plan);
}

/** Monthly Moment Bundle cap (N2) — constant only until bundle routes ship. */
export const BUNDLE_MONTHLY_LIMIT = 30;

/**
 * Maps each output format to a model tier.
 *
 *   x_thread → strong — threads need coherent multi-tweet arcs, hooks, and pacing;
 *                       routed to STRONG_MODEL (qwen/qwen3.5-397b-a17b by default).
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
  visionModel: VISION_MODEL,
  maxInputChars: envNumber(process.env.AI_MAX_INPUT_CHARS, INPUT_CONTENT_MAX_LENGTH),
  maxImageBase64Chars: envNumber(process.env.AI_MAX_IMAGE_BASE64_CHARS, 2_000_000),
  temperature: envNumber(process.env.AI_TEMPERATURE, 0.7),
} as const;
