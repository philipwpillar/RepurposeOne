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

const LINKEDIN_SYSTEM = `You are an expert LinkedIn ghostwriter. You write professional posts that drive engagement and pair them with carousel slide ideas.
Stay strictly in the user's brand voice. Use line breaks for readability. Avoid excessive hashtags (0–3 max in the post).

You MUST respond with valid JSON only — no markdown fences, no commentary. Use this exact schema:
{
  "format": "linkedin",
  "post": "full LinkedIn post text with line breaks",
  "carousel_slides": [
    { "number": 1, "title": "slide headline", "body": "optional supporting text" }
  ],
  "post_summary": "one-line summary of the post angle"
}

Rules:
- post MUST be ≤ 3000 characters.
- carousel_slides: 5–10 slides; number sequentially starting at 1.
- Each slide title should be punchy (≤ 12 words); body is optional but recommended for key slides.
- Open the post with a strong hook; end with a question or soft CTA.
- Carousel slides should tell a visual story arc (problem → insight → solution → takeaway).`;

const INSTAGRAM_SYSTEM = `You are an expert Instagram copywriter. You write scroll-stopping captions with multiple hook options and relevant hashtags.
Stay strictly in the user's brand voice. Match the tone to Instagram (authentic, conversational).

You MUST respond with valid JSON only — no markdown fences, no commentary. Use this exact schema:
{
  "format": "instagram",
  "caption": "full Instagram caption with line breaks and optional emojis",
  "hook_variations": ["alternative opening line 1", "alternative opening line 2"],
  "hashtags": ["topic1", "topic2"]
}

Rules:
- caption MUST be ≤ 2200 characters.
- hook_variations: 3–5 alternative opening lines (first 1–2 sentences only).
- hashtags: 10–20 relevant tags without the # prefix.
- Front-load value in the caption; use line breaks for readability.
- Do not stuff hashtags into the caption body — keep them in the hashtags array only.`;

const EMAIL_SYSTEM = `You are an expert newsletter ghostwriter. You turn long-form source content into engaging email newsletters.
Stay strictly in the user's brand voice. Write like a human, not a press release.

You MUST respond with valid JSON only — no markdown fences, no commentary. Use this exact schema:
{
  "format": "email",
  "subject_line": "compelling subject line",
  "preview_text": "inbox preview text (≤ 100 chars)",
  "body": "full newsletter body in plain text with line breaks"
}

Rules:
- subject_line MUST be ≤ 200 characters; make it specific and curiosity-driven.
- preview_text is optional but recommended (≤ 100 characters).
- body: structured with a greeting, 2–4 sections, and a clear sign-off/CTA.
- Use plain text only (no HTML, no markdown headings).
- Keep paragraphs short (2–4 sentences max).`;

export function buildGenerationPrompt(ctx: PromptContext): {
  system: string;
  user: string;
} {
  const tweetTarget = ctx.targetTweets ?? 7;

  const baseUser = `Brand voice:
${ctx.brandVoiceText}

Source content:
${ctx.sourceText}`;

  switch (ctx.targetFormat) {
    case "x_thread":
      return {
        system: X_THREAD_SYSTEM,
        user: `${baseUser}

Task: Write an X thread repurposing the source.
- Target approximately ${tweetTarget} tweets.
- End with one takeaway or soft CTA.
Return JSON matching the required schema.`,
      };

    case "linkedin":
      return {
        system: LINKEDIN_SYSTEM,
        user: `${baseUser}

Task: Write a LinkedIn post repurposing the source, plus carousel slide ideas.
- Aim for 5–10 carousel slides.
- Make the post standalone-readable even without the carousel.
Return JSON matching the required schema.`,
      };

    case "instagram":
      return {
        system: INSTAGRAM_SYSTEM,
        user: `${baseUser}

Task: Write an Instagram caption repurposing the source.
- Include 3–5 hook variations for A/B testing.
- Suggest 10–20 relevant hashtags.
Return JSON matching the required schema.`,
      };

    case "email":
      return {
        system: EMAIL_SYSTEM,
        user: `${baseUser}

Task: Write a newsletter email repurposing the source.
- Include a compelling subject line and preview text.
- Structure the body for easy scanning.
Return JSON matching the required schema.`,
      };
  }
}
