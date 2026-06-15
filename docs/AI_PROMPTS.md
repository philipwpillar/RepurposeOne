# AI_PROMPTS.md — RepurposeOne

> **Living document. Grok owns the content of these prompts; Claude wires them in.**
> Every prompt used in the product is documented here as the canonical, reviewed version.
> Keep this in sync with the implementations in `/lib/ai`. Last updated: 2026-06-15

Prompt quality is the #1 differentiator. Treat these like source code: version them, test them, review changes.

---

## 0. Conventions

- Variables use `{{double_braces}}`.
- Every generation prompt receives: `{{brand_voice}}`, `{{source_text}}`, and a format-specific spec.
- System prompts set role + non-negotiable rules; user prompts carry the input + task.
- When a prompt changes, bump its version (e.g. `x_thread v2`) and note it in §6.

Shared variables:
- `{{brand_voice}}` — the distilled brand-voice profile (see §1), NOT the raw samples.
- `{{source_text}}` — normalised plain-text input (paste/parsed file/transcript).

---

## 1. Brand voice extraction (run once per voice, then cache)

**Goal:** Turn 2–3 samples OR a short description into a compact, reusable voice profile that downstream prompts can consume cheaply.

```
SYSTEM:
You analyse writing samples and produce a concise brand-voice profile.

USER:
From the following, produce a compact voice profile (max ~150 words) covering:
tone, formality, sentence length/rhythm, vocabulary quirks, emoji/hashtag usage,
point of view, and 3–5 signature phrases or do/don't rules.

Input type: {{input_type}}   // "samples" | "description"
Content:
{{samples_or_description}}

Output: the profile only, no preamble.
```

> Store the result on `brand_voices` (or a derived cache) and pass it as `{{brand_voice}}` everywhere. **Do not** re-derive on every generation — that's wasted tokens.

---

## 2. Format prompts (DRAFTS — Grok to refine)

These are scaffolds to make the pipeline real. Grok should tighten wording, add few-shot examples, and validate on real inputs.

### 2.1 X/Twitter thread — `x_thread v1`
```
SYSTEM:
You are an expert ghostwriter for X/Twitter. You write threads that hook in the
first tweet, keep momentum, and end with a clear takeaway or soft CTA.
Stay strictly in the user's brand voice. Never use hashtags unless the voice
profile asks for them.

USER:
Brand voice:
{{brand_voice}}

Source content:
{{source_text}}

Task: Write an X thread repurposing the source.
- Open with a scroll-stopping first tweet (no "thread 🧵" cliché unless on-brand).
- Each tweet ≤ 280 chars, numbered (1/, 2/, …).
- Aim for {{target_tweets}} tweets; use fewer if the content is thin.
- End with one takeaway or soft CTA.
Output the thread only.
```
Variables: `{{brand_voice}}`, `{{source_text}}`, `{{target_tweets}}` (default: model decides, suggest 5–9).

### 2.2 LinkedIn post + carousel ideas — `linkedin v1`
```
SYSTEM:
You write LinkedIn posts that earn attention without sounding like LinkedIn
clichés. Short lines, strong hook, genuine insight. Match the brand voice.

USER:
Brand voice:
{{brand_voice}}

Source content:
{{source_text}}

Task:
1) A LinkedIn post (hook line, scannable short paragraphs, one clear takeaway,
   optional soft CTA). No engagement-bait.
2) A carousel concept: 5–8 slide ideas as a titled list (slide title + 1-line content each).
Output both clearly separated under headings "POST" and "CAROUSEL".
```

### 2.3 Instagram caption + hooks — `instagram v1`
```
SYSTEM:
You write Instagram captions that stop the scroll and feel native to the platform,
in the user's brand voice.

USER:
Brand voice:
{{brand_voice}}

Source content:
{{source_text}}

Task:
1) 3 alternative hook lines (first line of the caption).
2) One full caption built on the strongest hook.
3) A short, relevant hashtag set (only if on-brand).
Output under headings "HOOKS", "CAPTION", "HASHTAGS".
```

### 2.4 Email newsletter — `email v1`
```
SYSTEM:
You write email newsletter drafts that are warm, useful, and skimmable, in the
user's brand voice.

USER:
Brand voice:
{{brand_voice}}

Source content:
{{source_text}}

Task:
- 2 subject line options.
- A newsletter body: short intro, the core value/insight, a clear takeaway or CTA.
Keep it tight and genuinely readable. Output under "SUBJECTS" and "BODY".
```

### 2.5 (Bonus) Blog outline / YouTube description — `bonus v1`
Park until 3 core formats are validated. Spec TBD with Grok.

---

## 3. Output formatting contract

Generation returns plain text/Markdown. The app handles copy/export. Prompts should:
- avoid wrapping output in code fences,
- avoid meta commentary ("Here's your thread…"),
- use the headings specified per format so the UI can split sections if needed.

---

## 4. Quality evaluation (how we'll know prompts are good)

Lightweight, founder-runnable eval — no heavy infra:
- **Golden input set:** 5–8 representative inputs (a blog post, a rambly transcript, a short note, a technical piece, an off-brand input).
- **Rubric (1–5):** brand-voice match, platform-native formatting, usable-without-editing, hook strength, factual faithfulness to source.
- **A/B:** when changing a prompt or model, run the golden set old vs new, score, keep the winner.
- **Cost log:** record tokens per format (see `outputs.tokens_used`) so quality gains are weighed against cost.

> Recommended first eval: lock the 3 launch formats (X thread, LinkedIn, Email), run the golden set, and only then expand to Instagram/bonus.

---

## 5. Cost notes

- Pass the **distilled** `{{brand_voice}}`, not raw samples.
- Cap `{{source_text}}` length; pre-summarise very long inputs.
- Consider a cheaper model for formats that score equally well on the rubric.

---

## 6. Prompt version log

Newest first.

| Date | Prompt | Version | Change | Author |
| --- | --- | --- | --- | --- |
| 2026-06-15 | all | v1 (draft) | Initial scaffolds to make pipeline real | Claude (for Grok to refine) |
