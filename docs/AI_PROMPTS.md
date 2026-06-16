# AI_PROMPTS.md

Living registry of every prompt used in RepurposeOne. The quality of these is the
product. Treat changes here like code changes: version them, note why, and test
output before shipping.

**Implementation:** `lib/ai/prompts.ts` → `buildGenerationPrompt()`. Called by
`lib/ai/generate.ts` → `generateRepurpose()` → `POST /api/generate`. Keep this
file in sync with the code.

## Conventions

- Variables in `{{double_braces}}`.
- Each prompt lists: purpose, model tier, variables, the prompt (system + user), and an eval note.
- Model choice is a cost/quality decision — record the reasoning, not just the name.
  Tier mapping lives in `lib/config.ts` → `FORMAT_MODEL_TIER` (override IDs via
  `AI_MODEL_FAST` / `AI_MODEL_STRONG`).
- All formats return **structured JSON** validated by Zod (`types/index.ts` →
  `RepurposeOutputSchema`) before save. `response_format: { type: "json_object" }`
  is set on the API call.
- When you change a prompt, bump its version and add a dated changelog line.

---

## Shared: Brand Voice Block

Built at request time by `buildBrandVoiceBlock()` from the user's description
and/or 2–3 pasted samples. Injected into every format's user prompt. Distilled
profile caching (run once, store on `brand_voices`) is a future optimisation — not
wired yet.

**Variables:** `{{brand_voice}}`, `{{source_text}}`

**User prompt prefix** (shared across all formats):

```
Brand voice:
{{brand_voice}}

Source content:
{{source_text}}
```

`{{brand_voice}}` is assembled as:

```
Description: <user description>   // if provided

Writing samples:
--- Sample 1 ---
<sample text>

--- Sample 2 ---
<sample text>
```

**Eval note:** Spot-check that a casual sample and a formal sample produce
visibly different register on the same input. If they read identically, the
voice block isn't being weighted enough.

---

## Format: X/Twitter Thread — v1

**Purpose:** Turn source content into an engaging, well-structured thread.
**Model tier:** `strong` — multi-tweet coherence, hooks, and pacing matter.
**Variables:** `{{brand_voice}}`, `{{source_text}}`, `{{target_tweets}}` (default: 7)

**System:**

```
You are an expert ghostwriter for X/Twitter. You write threads that hook in the first tweet, keep momentum, and end with a clear takeaway or soft CTA.
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
- media_suggestion is optional; include only when a visual would strengthen the tweet.
```

**User** (appended after shared brand-voice block):

```
Task: Write an X thread repurposing the source.
- Target approximately {{target_tweets}} tweets.
- End with one takeaway or soft CTA.
Return JSON matching the required schema.
```

**Eval note:** Automate: (1) every `tweets[].text` ≤ 280 chars, (2) tweet count
within schema bounds (3–15) and ±1 of `{{target_tweets}}`, (3) tweet 1 stands
alone as a hook. Manual: brand-voice match, factual faithfulness to source.

---

## Format: LinkedIn Post + Carousel Ideas — v1

**Purpose:** A LinkedIn post plus 5–10 carousel slide ideas (ideas only — image
generation is explicitly out of MVP).
**Model tier:** `strong` — post + slide arc needs coherent structure.
**Variables:** `{{brand_voice}}`, `{{source_text}}`

**System:**

```
You are an expert LinkedIn ghostwriter. You write professional posts that drive engagement and pair them with carousel slide ideas.
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
- Carousel slides should tell a visual story arc (problem → insight → solution → takeaway).
```

**User:**

```
Task: Write a LinkedIn post repurposing the source, plus carousel slide ideas.
- Aim for 5–10 carousel slides.
- Make the post standalone-readable even without the carousel.
Return JSON matching the required schema.
```

**Eval note:** First line of `post` must work as a standalone hook. Carousel
slides should form a logical sequence (problem → insight → steps → takeaway),
not restatements. Automate: `post` ≤ 3000 chars, slide count 5–10.

---

## Format: Instagram Caption + Hooks — v1

**Purpose:** One caption plus 3–5 alternative opening hooks and a hashtag set.
**Model tier:** `fast` — shorter output; upgrade only if eval shows a gap.
**Variables:** `{{brand_voice}}`, `{{source_text}}`

**System:**

```
You are an expert Instagram copywriter. You write scroll-stopping captions with multiple hook options and relevant hashtags.
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
- Do not stuff hashtags into the caption body — keep them in the hashtags array only.
```

**User:**

```
Task: Write an Instagram caption repurposing the source.
- Include 3–5 hook variations for A/B testing.
- Suggest 10–20 relevant hashtags.
Return JSON matching the required schema.
```

**Eval note:** The hook variations should be genuinely different angles (curiosity,
bold claim, relatable pain), not paraphrases. Automate: `caption` ≤ 2200 chars,
`hashtags` count 5–30 (schema), no `#` in hashtag strings.

---

## Format: Email Newsletter Draft — v1

**Purpose:** A newsletter draft with subject line, preview text, and body.
**Model tier:** `strong` — longer-form coherence matters more here.
**Variables:** `{{brand_voice}}`, `{{source_text}}`

**System:**

```
You are an expert newsletter ghostwriter. You turn long-form source content into engaging email newsletters.
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
- Keep paragraphs short (2–4 sentences max).
```

**User:**

```
Task: Write a newsletter email repurposing the source.
- Include a compelling subject line and preview text.
- Structure the body for easy scanning.
Return JSON matching the required schema.
```

**Eval note:** Subject + preview should complement each other and not repeat
word-for-word. Automate: `subject_line` ≤ 200 chars, `preview_text` ≤ 200
chars (schema). Manual: scannable body, one clear takeaway.

---

## Model tier reference

Current mapping (`FORMAT_MODEL_TIER` in `lib/config.ts`):

| Format | Tier | Rationale |
| --- | --- | --- |
| `x_thread` | strong | Multi-tweet arc, hook, pacing |
| `linkedin` | strong | Post + carousel story arc |
| `instagram` | fast | Shorter output; cheapest model that passes eval |
| `email` | strong | Longer-form coherence |

Principle: start every format on the cheapest tier that passes eval; upgrade a
specific format only when testing shows a real quality gap. Confirm model IDs
against live provider pricing before locking in — override via env vars, not
hard-coded names in this doc.

---

## Changelog

- 2026-06-16 — Rewrote registry to match shipped prompts in `lib/ai/prompts.ts` (JSON output, all four formats). Replaced draft scaffolds and prose-output specs. v1.
- 2026-06-15 — Initial x_thread JSON output wired. LinkedIn / Instagram / Email scaffolds (draft).
