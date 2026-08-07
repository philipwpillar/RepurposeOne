# Voiceora — Voice Learning Intent

**Status:** Product intent brief  
**Date:** 5 August 2026  
**Audience:** Founder, product, engineering  
**Purpose:** Define what “powerful voice” means for Voiceora, and how we unlock it.

---

## 1. The intent

Voiceora’s differentiator is not posting, scheduling, or format count.

It is this:

> When you use Voiceora, it replicates **you** — your voice, your thinking, your opinions, your angle — so one piece of content becomes native posts across platforms **without you rewriting yourself on each one**.

Success is not “good AI content.”  
Success is: **it already sounds like me, and it already says what I meant.**

Platform formatting is secondary. Identity comes first.

| Priority | Meaning |
| --- | --- |
| 1. Identity | Sounds like the user (cadence, vocabulary, restraint, humour) |
| 2. Judgment | Thinks like the user (framing, opinions, what they refuse to say) |
| 3. Intent | Hits the aim of *this* piece (angle, emphasis, CTA) |
| 4. Platform | Native structure for X, LinkedIn, Instagram, email |

If Voiceora wins on 1–3, distribution features (share, publish, schedule) become multipliers.  
If it loses on 1–3, no amount of posting automation matters.

---

## 2. What “powerful voice” means in practice

A powerful voice system does four things:

1. **Mirrors style** — how the user writes  
2. **Carries judgment** — how the user thinks and argues  
3. **Honours intent** — what this specific piece is trying to achieve  
4. **Improves from use** — gets closer to the user every time they correct it

The product promise users should feel:

- “I barely had to edit that.”
- “That’s my take, not a generic summary.”
- “It remembered how I sound.”
- “I can paste once and trust every platform version.”

---

## 3. Current state (honest)

Voiceora already has strong foundations, but the loop is mostly **static application**, not **continuous learning**.

### What we have

| Capability | Role today |
| --- | --- |
| Writing samples + description | Primary voice signal injected into generation |
| Voice variants (signature / explain / provoke) | Delivery mode per piece |
| User commentary / photo context | Per-run intent / angle |
| Ratings + edited outputs | Partial few-shot exemplars (rated only) |
| Brand Voice Wizard + `voice_range` | Characterisation stored, **not used at generate time** |
| Mark as copied / posted | Workflow only — **not used for learning** |

### What we do not yet do

- Continuously update a living model of the user from edits
- Distil recurring preferences into durable voice rules
- Capture opinions / positions separately from writing style
- Fully use signals we already collect (`voice_range`, unrated edits, posted status)
- Scope learning cleanly per brand voice when a user has more than one

### Simple picture of today

```text
samples + description  →  every generation
rated outputs          →  weak format exemplars
edits / voice_range / posted  →  mostly unused
```

So Voiceora can imitate pasted samples.  
It does not yet get smarter from how the customer corrects it.

---

## 4. The unlock: a learning voice loop

Treat voice as three layers that compound:

```text
┌─────────────────────────────────────────────┐
│  INTENT (this run)                          │
│  commentary / photo context / refinement    │
└────────────────────▲────────────────────────┘
                     │
┌────────────────────┴────────────────────────┐
│  JUDGMENT (who they are as a thinker)       │
│  positions, framing, edit-derived rules     │
└────────────────────▲────────────────────────┘
                     │
┌────────────────────┴────────────────────────┐
│  IDENTITY (how they write)                  │
│  samples + living distilled profile         │
└─────────────────────────────────────────────┘
```

### Layer A — Identity (how you write)

Ground truth remains the user’s samples.  
On top of that, maintain a **living distilled profile**: cadence, vocabulary, self-reference habits, punctuation, length preferences, what “sounds like them.”

### Layer B — Judgment (how you think)

Style alone is not enough. Capture:

- Positions and beliefs the user holds
- Framing habits (how they open, what they emphasise)
- Hard avoids (phrases, tones, claims they reject)

This is what makes outputs feel like *their opinions*, not a neutral rewrite.

### Layer C — Intent (what this piece is for)

Already partially present via commentary and photo context. Strengthen it so:

- Source content = facts and material  
- Commentary = authoritative take and emphasis  
- Model must stay factually faithful to the source while framing through the user’s angle

---

## 5. How we unlock it (mechanism)

### 5.1 Close the loop on signals we already have

Highest leverage first — use what customers already give us.

| Signal | Unlock |
| --- | --- |
| `voice_range` from the wizard | Inject into identity at generation time |
| Saved edits (`user_output`) | Treat meaningful edits as positive learning examples, even without a thumbs-up |
| Thumbs down | Use original model output as “avoid,” not the edited fix |
| Posted / copied | Weak positive signal when ratings are sparse |
| `brand_voice_id` | Scope exemplars per voice so multi-voice users do not pollute each other |

### 5.2 Learn from edits (core differentiator)

Every time a user changes a draft before copy/post:

> Model wrote X → user rewrote Y  
> Diff = preference

Then:

1. Prefer **edited text** as a positive exemplar  
2. Extract short preference notes from recurring diffs  
3. Store durable rules on the brand voice, for example:
   - “Never open with a rhetorical question.”
   - “Prefer short claims over tutorial framing.”
   - “Soften CTAs; avoid hype adjectives.”
4. Inject those rules into every future generation for that voice

This is continuous learning without forcing users to maintain a style guide.

### 5.3 Distil a living voice profile

Do not only re-send raw samples forever.

On a cadence (for example after N likes/edits/posts, or on demand “Refresh my voice”):

1. Take samples + description + `voice_range` + liked/edited/posted outputs  
2. Run a distillation pass  
3. Write a cached profile onto `brand_voices` (e.g. `distilled_profile`)  
4. Use that profile as the primary identity block going forward  

Samples remain ground truth.  
The profile becomes the evolving “this is how I sound and think.”

This matches the existing architecture intent: distill once, cache, reuse — but extended from a one-time optimisation into an ongoing learning system.

### 5.4 Capture opinions explicitly

Add a lightweight **positions / beliefs** surface on brand voice:

- User can paste a few stances (“I believe… / I disagree with…”)
- Optionally extract recurring stances from commentary and edits over time
- Prompt rule: frame through these positions; do not invent facts the source does not support

Without this, Voiceora risks style mimicry with generic opinions.

### 5.5 Keep intent first-class on every run

Make commentary unmistakably authoritative:

- Source = material  
- Commentary = take  
- Refinement = local adjustment for this version  

The learning system improves the default voice.  
Per-run intent keeps each piece aimed.

---

## 6. What we are not doing in this unlock

These may be valuable later. They are not the voice unlock:

- Direct social publishing / auto-posting
- Full content calendars
- Public API / Zapier-first automation
- Teams / seats
- More formats for their own sake

Distribution features multiply a strong voice.  
They do not create one.

---

## 7. Phased delivery

### Phase 1 — Use what we already collect

**Goal:** Immediate fidelity lift from existing data.

- Wire `voice_range` into generation identity
- Exemplar hygiene (voice-scoped; edits as positives; correct negative handling)
- Strengthen commentary precedence in prompts
- Eval: same source, different voices still diverge; edited users see faster improvement

### Phase 2 — Learn from edits

**Goal:** Every correction teaches the product.

- Detect meaningful edit diffs
- Store preference rules on brand voice
- Inject rules into identity / judgment layers
- Optional: surface “What Voiceora learned” for trust

### Phase 3 — Living distilled profile

**Goal:** A cached, evolving model of the user.

- Distillation job / on-demand refresh
- Persist `distilled_profile` (or equivalent) on `brand_voices`
- Generation reads profile + samples + rules
- Guardrails: user can reset / pin / edit the profile

### Phase 4 — Judgment / positions bank

**Goal:** Replicate thinking, not only tone.

- Positions field + extraction assists
- Prompt contract for opinionated framing without factual invention
- Eval against “sounds like me” *and* “argues like me”

---

## 8. Success criteria

Voice learning is working when:

1. **Edit rate falls** — users change less before copy/post  
2. **Blind preference rises** — users prefer new outputs over old ones on the same source  
3. **Cross-platform consistency holds** — X / LinkedIn / Instagram / email still sound like one person  
4. **Intent survival** — commentary angle is visible in the output without becoming a paraphrase dump  
5. **Multi-voice isolation** — two brand voices for one account do not bleed into each other  

Leading product question for every voice change:

> Did this make the output more like *this user*, or merely more like “good content”?

Only the first counts.

---

## 9. Design principles

1. **Identity before platform.** Never sacrifice voice for engagement-bait conventions.  
2. **Samples are sacred.** Learning layers refine; they do not overwrite ground-truth samples without consent.  
3. **Edits beat surveys.** Behavioural correction is a stronger teacher than another settings form.  
4. **Fail open.** If learning data is missing or a distillation fails, generation still works from samples + description.  
5. **Show the learning.** Users should be able to see and correct what Voiceora thinks it knows.  
6. **Scope by voice.** Learning belongs to a brand voice, not a raw user id alone.  
7. **No invented facts.** Opinion and framing may be strong; source fidelity remains non-negotiable.

---

## 10. One-line north star

**Unlock Voiceora by turning brand voice from a static prompt block into a living model of the customer — updated by how they write, how they edit, and what they mean.**

---

## Appendix A — Current code anchors

| Area | Location |
| --- | --- |
| Voice assembly | `lib/ai/voice-variants.ts` (`assembleVoiceLayers`) |
| Prompts | `lib/ai/prompts.ts` |
| Exemplars | `lib/ai/exemplars.ts` |
| Feedback / edits API | `app/api/repurposes/[id]/feedback/route.ts` |
| Brand voice wizard | `lib/ai/brand-voice-wizard.ts` |
| Schema: `voice_range` | `supabase/migrations/20260730140000_brand_voices_voice_range.sql` |
| Schema: ratings / edits | `supabase/migrations/20260717130000_add_output_feedback.sql` |
| Product differentiator order | `docs/PRODUCT_SPEC.md` |

## Appendix B — Related product stance

Direct Post to X and other distribution features remain optional later multipliers.  
They are deliberately out of scope for this unlock. The core bet is identity fidelity.
