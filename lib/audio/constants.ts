/** Voice-note ASR caps (N5) — Brief 2b. */

export const VOICE_MAX_DURATION_S = 300;
export const VOICE_MAX_BYTES = 25 * 1024 * 1024;

export const VOICE_TOO_LARGE_MESSAGE =
  "This voice note is too large (max 25 MB).";

export const VOICE_TOO_LONG_MESSAGE =
  "This voice note is too long (max 5 minutes). Trim it and try again.";

export const VOICE_UNSUPPORTED_MESSAGE =
  "This audio couldn't be transcribed. Try a different file or format.";

/**
 * Hardcoded — never env-configurable. Mirrors OPENROUTER_ALLOWED_PROVIDERS's
 * "no silent override" philosophy: a Vercel env var must not be able to
 * redirect where audio content is sent.
 */
export const DEEPINFRA_ASR_ENDPOINT =
  "https://api.deepinfra.com/v1/inference/openai/whisper-large-v3";

/** Bound DeepInfra fetch — mirrors getAiClient() timeout: 50_000. */
export const DEEPINFRA_ASR_TIMEOUT_MS = 50_000;
