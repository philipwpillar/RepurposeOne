# PRODUCT_SPEC.md — Voiceora

> **Living document.** This is the shared source of truth for product decisions, scope, and roadmap.
> Grok owns strategic direction; Claude (Cursor) owns implementation. Update this file whenever a decision is made.
> Last updated: 2026-07-23

---

## 1. One-liner

Voiceora turns a single piece of content (paste text today; photo with guided context; `.txt`/`.pdf`/audio deferred) into high-quality, **brand-consistent** outputs for X/Twitter threads, LinkedIn posts + carousel ideas, Instagram captions + hooks, and email newsletters — in seconds.

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
  - Paste text — **shipped**
  - Photo upload with guided context (Creator/Pro/Pro Plus) — **shipped**
  - Article / URL link ingest (Readability extract → paste pipeline) — **shipped (Wave 3a)**
  - Upload `.txt` / `.pdf` (basic parsing) — **deferred (post-launch)**
  - Voice into Moment Bundle context — **native OS/keyboard dictation** (server ASR withdrawn, PR #46)
  - Video-as-input for Studio — sequenced **after** Moment Bundle video path
- **Core outputs:**
  - [x] X/Twitter thread (with tweet-count guidance)
  - [x] LinkedIn post + carousel slide ideas
  - [x] Instagram caption + hook ideas
  - [x] Email newsletter draft
  - [ ] *(Optional bonus)* short blog outline OR YouTube description
- **Brand voice:** Samples + description + optional `voice_range` characterisation, plus edit-derived preference rules (Stage D) scoped per brand voice. Samples remain ground truth; learned rules are subordinate and user-correctable.
- **History / library:** List of past repurposes, re-openable (`/library`).
- **Export:** One-click copy + export to Markdown / plain text. (Carousel *images* are later.)
- **Dashboard:** Basic usage view + upgrade prompts.
- **Monetisation:** Free tier (hard limits), Creator £19/mo, Pro £44/mo, Pro Plus £59/mo. Stripe Checkout + customer portal (`/account`).
- **Moment Bundles (Pro Plus):** photo packs shipped; video/rendered clips behind `NEXT_PUBLIC_VIDEO_BUNDLES_DEV` until prod smoke.

### Explicitly OUT of MVP (parking lot — needs approval to pull in)
- Full video / clip generation
- Image generation for carousels
- Scheduling / auto-posting
- Team collaboration / multiple seats
- Advanced analytics
- API access
- **Direct social publishing** — out of scope for the current phase; when revisited: **X first (no approval gate), then Instagram**

> **Scope rule:** if a task touches the OUT list, stop and flag it before building.

Capacitor iOS shell exists (`docs/MOBILE.md`); App Store submission is pending — treat native distribution separately from this MVP list.

---

## 5. Pricing

| Tier | Price | Limits & highlights | Role |
| --- | --- | --- | --- |
| Free | £0 | 5–10 repurposes/month, basic features | Acquisition funnel |
| Creator | £19/month (GBP, settlement) · $33/month (USD) · €28/month (EUR) · Adaptive Pricing for all other currencies | 50–100 repurposes, core formats, brand voice | Main conversion tier |
| Pro | £44/month (GBP, settlement) · $64/month (USD) · €54/month (EUR) · Adaptive Pricing for all other currencies | High limits, advanced voice, priority, more formats | Power users |
| Pro Plus | £59/month (GBP, settlement) · $84/month (USD) · €74/month (EUR) · Adaptive Pricing for all other currencies | Matches Pro gens, Moment Bundle (30/mo), higher burst | Top tier / Moment Bundle |

> **Multi-currency note:** USD and EUR are manually-set additional currency price points on each existing Stripe Price object, not new Price IDs — this overrides Adaptive Pricing only for these two currencies; all other 150+ currencies fall through to Adaptive Pricing automatically. `STRIPE_PRICE_ID_CREATOR` and `STRIPE_PRICE_ID_PRO` env vars are unchanged.

- Annual plans at ~17–20% discount (improves cash flow). *Decision: enable from launch vs Month 2 — TBD with Grok.*
- Credit packs (£9–15 for 20–30 extra repurposes) — add after first 2–3 weeks based on demand.
- All billing via Stripe Checkout + customer portal.

> **Resolved (2026-06-16):** A repurpose = one *generation*. A multi-format run counts as one unit (shared `generation_id`); single-format runs count individually. See ARCHITECTURE.md §4a.

---

## 6. Roadmap (rolling)

### Now (pre-launch sprint)
- [x] Shared docs (this file + ARCHITECTURE + AI_PROMPTS)
- [x] Repo scaffold (Next.js + TS + Tailwind + shadcn/ui)
- [x] Supabase project + auth (email + Google)
- [x] DB schema + RLS
- [x] Core repurpose pipeline (paste text → formats; photo path shipped)
- [x] Landing page (+ waitlist CTA copy; waitlist as product surface may still iterate)
- [x] Stripe Checkout + portal + usage metering
- [x] History/library + dashboard
- [ ] `.txt`/`.pdf` parsing — **deferred (post-launch)**
- [x] Moment Bundle photo packs (Pro Plus) — see `docs/plans/`
- [ ] Moment Bundle video / rendered clips — code shipped; prod UI gated by `NEXT_PUBLIC_VIDEO_BUNDLES_DEV`
- [ ] Video-as-input (Studio) — after Moment Bundle video path
- [ ] Direct social publishing — out of scope for current phase; when revisited, X first (no approval gate), then Instagram

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
| 2026-07-24 | UI redesign executes in 5 vertical slices; Slice 1 = design system + shell | User | Contract: `docs/UI_REDESIGN_CONTRACT.md`. Preserve MVP scope (no scheduling/publishing/teams/analytics). |
| 2026-07-23 | Unified `/account` merges billing + profile + delete | User | `/billing` and `/settings/account` redirect to `/account` |
| 2026-07-14 | Library/billing URL renames; docs synced to shipped reality | User | `/library`, `/billing`; paste + photo; txt/pdf/audio deferred |
| 2026-06-16 | Billing unit = one generation, not per-format row | User | Implemented: `generation_id` + DISTINCT-count RPC. Resolves former open question #1. See ARCHITECTURE.md §4a |
| 2026-06-15 | Start with shared docs before any code | User | Repo was empty; docs are highest-leverage first step |
| 2026-06-15 | *(proposed)* Default Cursor coding model = Claude Sonnet 4.6; test Haiku 4.5 for generation calls as a cost lever | Claude | Needs Grok sign-off; "3.5 Sonnet / Claude 4" in brief is outdated |

---

## 8. Open questions (resolve with Grok)

1. **Annual plans** from launch or Month 2?
2. **Model choice** per task (generation vs transcription) — quality/cost trade-off.
3. **Free-tier limit**: 5 or 10 repurposes/month?
4. Which 3 output formats ship **first** (recommend: X thread, LinkedIn, Email — broadest appeal, least formatting risk).
