import type { BrandVoiceInput, TargetFormat } from "@/types";

export interface PromptContext {
  brandVoiceText: string;
  sourceText: string;
  targetFormat: TargetFormat;
  targetTweets?: number;
  /** Optional voice exemplars from rated/edited past outputs (Brief S2). */
  exemplarsText?: string;
}

export interface PhotoPromptContext {
  brandVoiceText: string;
  context: string;
  cta?: string;
  targetFormat: TargetFormat;
  targetTweets?: number;
  /** Optional voice exemplars from rated/edited past outputs (Brief S2). */
  exemplarsText?: string;
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
- Each tweet text MUST be ≤ 280 characters — count before finalizing; this is a hard limit.
- Number tweets sequentially starting at 1.
- Open with a scroll-stopping first tweet (no "thread 🧵" cliché unless on-brand).
- Aim for the target tweet count; use fewer only if the content is genuinely thin.
- media_suggestion is optional — omit the key entirely when not needed. Do not include it as null.
- thread_summary is optional — omit the key entirely when not needed. Do not include it as null.`;

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

const INSTAGRAM_SYSTEM = `You are an expert Instagram copywriter. Your first priority is the user's brand voice — Instagram platform conventions (emoji-led bullets, rhetorical hooks, hashtag-maxing) are secondary and should only appear if they genuinely match that voice.
Do not default to generic growth-hacker Instagram style. If the brand voice reads as minimal, direct, or restrained, the caption, hooks, and hashtags should read that way too — do not add emojis, exclamation-heavy hooks, or hashtag padding to compensate.

You MUST respond with valid JSON only — no markdown fences, no commentary. Use this exact schema:
{
  "format": "instagram",
  "caption": "full Instagram caption with line breaks, emojis only if the brand voice supports them",
  "hook_variations": ["alternative opening line 1", "alternative opening line 2"],
  "hashtags": ["topic1", "topic2"]
}

Rules:
- caption MUST be ≤ 2200 characters.
- hook_variations: 3–5 alternative opening lines (first 1–2 sentences only), each staying in the brand voice — do not default to generic engagement-bait patterns ("You won't believe...", curiosity-gap clickbait) unless the brand voice itself uses that register.
- hashtags: 3–8 relevant tags without the # prefix. Use fewer, or none, if the brand voice reads as minimal or direct — do not pad to hit a target count.
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
- body: structured with a greeting, 2–4 sections, and a closing CTA.
- The closing MUST NOT include a name, signature line, or any bracketed
  placeholder (e.g. "[Your name]", "[Name]", "[Company]"). No sender name
  is available — end on the CTA/question itself, or a generic sign-off
  phrase with no name attached (e.g. "Talk soon," on its own line is fine;
  "Talk soon, [Your name]" is not).
- Use plain text only (no HTML, no markdown headings).
- Keep paragraphs short (2–4 sentences max).`;

export function buildGenerationPrompt(ctx: PromptContext): {
  system: string;
  user: string;
} {
  const tweetTarget = ctx.targetTweets ?? 7;
  const exemplarsBlock = ctx.exemplarsText?.trim()
    ? `\n\n${ctx.exemplarsText.trim()}`
    : "";

  const baseUser = `Brand voice:
${ctx.brandVoiceText}${exemplarsBlock}

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
- Include 3–5 hook variations for A/B testing, all staying in the brand voice.
- Suggest 3–8 relevant hashtags — fewer if the brand voice is minimal or direct.
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

const PHOTO_TASK_PREAMBLE = `You are writing social copy to accompany a photo the user will post — not describing the image for accessibility, and not narrating what is visible in the photo.

The user's context field is the authoritative signal for intent, angle, and purpose. The image informs specificity and detail only. Lean heavily on the brand voice block — voice grounding is thinner than a long-form text repurpose, so the brand voice and context must carry tone and intent.

Do NOT produce copy that merely describes the photo ("In this image we see…"). Write platform-native copy the user can post alongside the image.`;

export function buildPhotoGenerationPrompt(ctx: PhotoPromptContext): {
  system: string;
  user: string;
} {
  const tweetTarget = ctx.targetTweets ?? 7;
  const ctaBlock = ctx.cta
    ? `\nCall to action (use or adapt): ${ctx.cta}`
    : "\nCall to action: infer a soft CTA from context, or omit if not appropriate.";
  const exemplarsBlock = ctx.exemplarsText?.trim()
    ? `\n\n${ctx.exemplarsText.trim()}`
    : "";

  const baseUser = `Brand voice (follow strictly — this is your primary tone anchor):
${ctx.brandVoiceText}${exemplarsBlock}

User context (authoritative intent — what this post is about and why):
${ctx.context}${ctaBlock}

The attached image is the visual the copy will accompany. Use it for specificity, not as the main subject of the copy.`;

  switch (ctx.targetFormat) {
    case "x_thread":
      return {
        system: `${PHOTO_TASK_PREAMBLE}\n\n${X_THREAD_SYSTEM}`,
        user: `${baseUser}

Task: Write an X thread to accompany this photo.
- Target approximately ${tweetTarget} tweets.
- End with one takeaway or soft CTA.
Return JSON matching the required schema.`,
      };

    case "linkedin":
      return {
        system: `${PHOTO_TASK_PREAMBLE}\n\n${LINKEDIN_SYSTEM}`,
        user: `${baseUser}

Task: Write a LinkedIn post to accompany this photo, plus carousel slide ideas.
- Aim for 5–10 carousel slides.
- Make the post standalone-readable even without the carousel.
Return JSON matching the required schema.`,
      };

    case "instagram":
      return {
        system: `${PHOTO_TASK_PREAMBLE}\n\n${INSTAGRAM_SYSTEM}`,
        user: `${baseUser}

Task: Write an Instagram caption to accompany this photo.
- Include 3–5 hook variations for A/B testing, all staying in the brand voice.
- Suggest 3–8 relevant hashtags — fewer if the brand voice is minimal or direct.
Return JSON matching the required schema.`,
      };

    case "email":
      return {
        system: `${PHOTO_TASK_PREAMBLE}\n\n${EMAIL_SYSTEM}`,
        user: `${baseUser}

Task: Write a newsletter email inspired by this photo and context.
- Include a compelling subject line and preview text.
- Structure the body for easy scanning.
- Reference the photo naturally where relevant; do not describe it literally.
Return JSON matching the required schema.`,
      };
  }
}

// ---------------------------------------------------------------------------
// Moment Bundle prompts (Brief 1b — photo pack)
// ---------------------------------------------------------------------------

export interface BundlePhotoAnalysisPromptContext {
  context: string;
  /** Global photo indexes in this batch (e.g. [0,1,2,3] or [4,5,6,7]). */
  photoIndexes: number[];
}

export function buildBundlePhotoAnalysisPrompt(
  ctx: BundlePhotoAnalysisPromptContext
): { system: string; user: string } {
  const indexList = ctx.photoIndexes.join(", ");
  return {
    system: `You are a photo pack analyst for social content. Analyze each attached image and return JSON only — no markdown fences, no commentary.

Use this exact schema:
{
  "photos": [
    {
      "index": <global photo index as provided>,
      "description": "what is visually in the photo",
      "caption_angle": "best storytelling / posting angle for this photo",
      "quality_note": "optional note on composition or issues"
    }
  ]
}

Rules:
- Include exactly one entry per attached photo.
- Use the exact global index numbers given for each photo (${indexList}).
- Stay factual and useful for writing captions later.
- Do not invent brand voice or platform posts here.`,
    user: `User context for this Moment Bundle:
${ctx.context}

Analyze the ${ctx.photoIndexes.length} attached photo(s) with global indexes: ${indexList}.
Return JSON matching the required schema.`,
  };
}

export interface BundlePackSynthesisPromptContext {
  brandVoiceText: string;
  context: string;
  photoCount: number;
  stage1bJson: string;
}

export function buildBundlePackSynthesisPrompt(
  ctx: BundlePackSynthesisPromptContext
): { system: string; user: string } {
  return {
    system: `You synthesize a Moment Bundle photo pack into captions, posting order, and a condensed brief for platform repurposing.
Respond with valid JSON only — no markdown fences, no commentary.

Use this exact schema:
{
  "photo_captions": [
    {
      "photo_index": <0-based index>,
      "caption": "platform-ready caption (max 2200 chars)",
      "alt_text": "accessibility alt text (max 500 chars)"
    }
  ],
  "posting_order": [<photo indexes in recommended publish order>],
  "post_brief": "condensed pack summary for platform format writers (max 2000 chars)"
}

Rules:
- Include one caption object per photo index 0..${ctx.photoCount - 1}.
- posting_order must be a permutation of those indexes.
- post_brief must capture the story, angles, and key beats so a text-only writer can produce X / LinkedIn / Instagram / email without seeing the images.
- Follow the brand voice strictly.`,
    user: `Brand voice (follow strictly):
${ctx.brandVoiceText}

User context:
${ctx.context}

Stage-1b photo analysis (validated JSON):
${ctx.stage1bJson}

Produce the pack JSON for ${ctx.photoCount} photos.`,
  };
}
