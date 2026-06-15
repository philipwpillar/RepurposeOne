import type { BrandVoiceInput, TargetFormat } from "@/types";

export interface PromptContext {
  brandVoiceText: string;
  sourceText: string;
  targetFormat: TargetFormat;
  targetTweets?: number;
}

/**
 * Build the distilled brand voice block from samples and/or description.
 * In a future slice this profile can be cached on brand_voices after extraction.
 */
export function buildBrandVoiceBlock(input: BrandVoiceInput): string {
  const parts: string[] = [];

  if (input.description) {
    parts.push(`Description: ${input.description}`);
  }

  if (input.samples?.length) {
    parts.push(
      "Writing samples:\n" +
        input.samples.map((s, i) => `--- Sample ${i + 1} ---\n${s}`).join("\n\n")
    );
  }

  return parts.join("\n\n");
}

const X_THREAD_SYSTEM = `You are an expert ghostwriter for X/Twitter. You write threads that hook in the first tweet, keep momentum, and end with a clear takeaway or soft CTA.
Stay strictly in the user's brand voice. Never use hashtags unless the voice profile asks for them.

You MUST respond with valid JSON only — no markdown fences, no commentary. Use this exact schema:
{
  "format": "x_thread",
  "tweets": [
    { "number": 1, "text": "...", "media_suggestion": "optional image/chart idea" }
  ],
  "thread_summary": "one-line summary of the thread"
}

Rules:
- Each tweet text MUST be ≤ 280 characters.
- Number tweets sequentially starting at 1.
- Open with a scroll-stopping first tweet (no "thread 🧵" cliché unless on-brand).
- Aim for the target tweet count; use fewer only if the content is genuinely thin.
- media_suggestion is optional; include only when a visual would strengthen the tweet.`;

export function buildGenerationPrompt(ctx: PromptContext): {
  system: string;
  user: string;
} {
  const tweetTarget = ctx.targetTweets ?? 7;

  if (ctx.targetFormat === "x_thread") {
    return {
      system: X_THREAD_SYSTEM,
      user: `Brand voice:
${ctx.brandVoiceText}

Source content:
${ctx.sourceText}

Task: Write an X thread repurposing the source.
- Target approximately ${tweetTarget} tweets.
- End with one takeaway or soft CTA.
Return JSON matching the required schema.`,
    };
  }

  throw new Error(`Unsupported format: ${ctx.targetFormat}`);
}
