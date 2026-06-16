# PRODUCT_SPEC.md — RepurposeOne

> **Living document.** This is the shared source of truth for product decisions, scope, and roadmap.
> Grok owns strategic direction; Claude (Cursor) owns implementation. Update this file whenever a decision is made.
> Last updated: 2026-06-16

---

## 1. One-liner

RepurposeOne turns a single piece of content (paste, .txt/.pdf, or basic audio) into high-quality, **brand-consistent** outputs for X/Twitter threads, LinkedIn posts + carousel ideas, Instagram captions + hooks, and email newsletters — in seconds.

**Differentiators (in priority order):**
1. Brand voice quality (learns from the user's samples and applies it consistently)
2. Output quality (platform-native formatting, genuinely usable without heavy editing)
3. Speed (value demonstrated in < 30 seconds)

---

## 2. Target user

English-first global creators, solopreneurs, marketers, and startup founders. UK-based founder; easy targeting of UK communities, but the product is global from day one. No localisation at launch.

---

## 3. Business goals (from launch plan)

| Metric | Target |
| --- | --- |
| First paying users | 3–5 weeks |
| MRR | £1–2k within 8–12 weeks |
| Free → paid conversion | 8–15% |
| Monthly churn | < 8% |

Primary objective: **speed to first revenue.** Every decision is weighed against "does this get us to paying users faster without breaking output quality?"

---

## 4. MVP scope (DO NOT expand without explicit Grok/user approval)

### In scope
- **Auth:** Email + Google (Supabase Auth)
- **Inputs:**
  - Paste text
  - Upload `.txt` / `.pdf` (basic parsing)
  - Basic audio upload + transcription (via API)
- **Core outputs (ship 3–4 first):**
  - [ ] X/Twitter thread (with tweet-count guidance)
  - [ ] LinkedIn post + carousel slide ideas
  - [ ] Instagram caption + hook ideas
  - [ ] Email newsletter draft
  - [ ] *(Optional bonus)* short blog outline OR YouTube description
- **Brand voice:** Simple — learn from 2–3 pasted samples OR a short written description. Applied consistently across all outputs.
- **History / library:** List of past repurposes, re-openable.
- **Export:** One-click copy + export to Markdown / plain text. (Carousel *images* are later.)
- **Dashboard:** Basic usage view + upgrade prompts.
- **Monetisation:** Free tier (hard limits), Creator £19/mo, Pro £39/mo. Stripe Checkout + customer portal.

### Explicitly OUT of MVP (parking lot — needs approval to pull in)
- Full video / clip generation
- Image generation for carousels
- Scheduling / auto-posting
- Team collaboration / multiple seats
- Advanced analytics
- API access
- Mobile app

> **Scope rule:** if a task touches the OUT list, stop and flag it before building.

---

## 5. Pricing

| Tier | Price | Limits & highlights | Role |
| --- | --- | --- | --- |
| Free | £0 | 5–10 repurposes/month, basic features | Acquisition funnel |
| Creator | £19/mo | 50–100 repurposes, core formats, brand voice | Main conversion tier |
| Pro | £39/mo | High/unlimited limits, advanced voice, priority, more formats | Power users |

- Annual plans at ~17–20% discount (improves cash flow). *Decision: enable from launch vs Month 2 — TBD with Grok.*
- Credit packs (£9–15 for 20–30 extra repurposes) — add after first 2–3 weeks based on demand.
- All billing via Stripe Checkout + customer portal.

> **Resolved (2026-06-16):** A repurpose = one *generation*. A multi-format run counts as one unit (shared `generation_id`); single-format runs count individually. See ARCHITECTURE.md §4a.

---

## 6. Roadmap (rolling)

### Now (pre-launch sprint)
- [x] Shared docs (this file + ARCHITECTURE + AI_PROMPTS)
- [ ] Repo scaffold (Next.js + TS + Tailwind + shadcn/ui)
- [ ] Supabase project + auth (email + Google)
- [ ] DB schema + RLS
- [ ] Core repurpose pipeline (paste text → 3 formats)
- [ ] Landing page + waitlist
- [ ] Stripe Checkout + portal + usage metering
- [ ] History/library + dashboard
- [ ] `.txt`/`.pdf` parsing, then audio transcription

### Beta / soft launch
- [ ] Waitlist users get access, collect feedback
- [ ] Tighten prompt quality based on real inputs

### Public launch
- [ ] Product Hunt + channels
- [ ] Iterate on output quality + conversion

> Detailed weekly timeline lives in the launch plan; this roadmap tracks build state.

---

## 7. Decision log

Append decisions here with date + who made the call. Newest at top.

| Date | Decision | Owner | Notes |
| --- | --- | --- | --- |
| 2026-06-16 | Billing unit = one generation, not per-format row | User | Implemented: `generation_id` + DISTINCT-count RPC. Resolves former open question #1. See ARCHITECTURE.md §4a |
| 2026-06-15 | Start with shared docs before any code | User | Repo was empty; docs are highest-leverage first step |
| 2026-06-15 | *(proposed)* Default Cursor coding model = Claude Sonnet 4.6; test Haiku 4.5 for generation calls as a cost lever | Claude | Needs Grok sign-off; "3.5 Sonnet / Claude 4" in brief is outdated |

---

## 8. Open questions (resolve with Grok)

1. **Annual plans** from launch or Month 2?
2. **Model choice** per task (generation vs transcription) — quality/cost trade-off.
3. **Free-tier limit**: 5 or 10 repurposes/month?
4. Which 3 output formats ship **first** (recommend: X thread, LinkedIn, Email — broadest appeal, least formatting risk).
