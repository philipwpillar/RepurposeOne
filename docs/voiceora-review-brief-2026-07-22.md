# Voiceora (RepurposeOne) — Codebase Review Brief

Prepared: **2026-07-22**, refreshed against live repo HEAD `f6eeda1` (merge of PR #45 `feat/brief-2b-transcribe`). Prior brief snapshot was `0085a37` (~2026-07-08/09); **~100 commits / PRs #2–#45** landed since then. Hand this to whoever/whatever is doing the review so it judges the code against the actual product, not generic best practice.

**Ops caveat:** this brief reflects what is in git. Stripe dashboard smoke tests, Railway prod health, Supabase migrations applied in prod, and Apple Developer enrollment cannot be confirmed from the repo alone — flag those as “verify in ops,” not as code findings.

---

## 0. Reviewer protocol (do this first)

1. Confirm HEAD and skim `git log --oneline 0085a37..HEAD` (or since the brief’s HEAD) so you are not reviewing a mental model of July 9.
2. Score against Sections 1–2 and 6. Use Sections 3–4–7 as starting hypotheses — verify before ranking.
3. Produce the deliverable in Section 9. Do **not** expand scope, invent roadmap items, or “fix” intentional asymmetries in Section 2.
4. Prefer file-path evidence over vibes. If something needs a dashboard/SQL check, say so explicitly.

**Scope in:** `app/`, `components/`, `lib/`, `types/`, `supabase/migrations/`, `workers/ffmpeg-renderer/`, `ios/` + `capacitor.config.ts`, and docs drift vs code in `docs/`.

**Scope out:** inventing new features; business KPI measurement (Section 5); marketing copy polish unless it violates the honesty constraint; relitigating settled Moment Bundle decisions in `docs/moment-bundle-decisions-register-2026-07-12.md`.

---

## 1. What this product is

Voiceora (repo: `RepurposeOne`, holding company GravitonForge Technologies Ltd) turns blog posts, transcripts, and photos into platform-native drafts — X/Twitter, LinkedIn, Instagram, email — written in the user's brand voice. Stack: Next.js (App Router) + TypeScript, Supabase (auth/Postgres), Stripe, Vercel, Capacitor iOS shell. AI inference via OpenRouter → DeepInfra-hosted Qwen models. Moment Bundles (Pro Plus) add photo/video packs with optional rendered clips via an ffmpeg worker on Railway.

Core differentiators the review should protect, not just "clean code" in the abstract: **brand voice consistency, output quality, and speed to value (&lt;30 seconds to see results).**

---

## 2. Non-negotiable constraints — flag any violation as high severity

- **The fence in `RepurposeWorkspace.tsx` is absolute.** Protected symbols: `GenerateApiError`, `callGenerateApi`, `callPhotoGenerateApi`, `setUsedCount(apiErr.usage.used)` / success `setUsedCount(usage.used)`, `PhotoGenerateApiError`. Any diff touching these needs explicit justification. (Brief 0a’s plan-gate expressions using `planAllowsVision` were the sanctioned fence edits.) Do **not** grep the obsolete `setUsedCount(err.usage.used)` — that pattern is gone and a zero-count check is inert.
- **Server-side enforcement before AI spend.** The 402/limit gate must fire server-side; no AI cost should be incurred on over-limit requests. Same rule for bundle generate/prepare and `/api/transcribe`.
- **Model slugs must be version-pinned**, never `-latest` or floating aliases. **Current code still uses floating Qwen 3.5 slugs** (`qwen/qwen3.5-35b-a3b`, `qwen/qwen3.5-397b-a17b`) — treat as an open medium finding unless dated pins landed after this brief.
- **`provider.only`, not `provider.order`**, for the OpenRouter allowlist — `.order` is preference-only and silently falls through.
- **`OPENROUTER_ALLOWED_PROVIDERS` must stay a code constant**, not env-configurable — deliberate GDPR fix (`["deepinfra/fp8"]` in `lib/config.ts`). ASR bypasses OpenRouter (direct DeepInfra Whisper); that path must stay explicitly pinned in `lib/audio/constants.ts`, not env-drifted.
- **Billing unit = one generation, not one format.** `count_monthly_generations` counts `DISTINCT generation_id`; `checkRateLimit` counts rows. Bundle runs share one `generation_id` and also have a separate `count_monthly_bundles` cap. These asymmetries are intentional — don't "fix" them.
- **Migrations are applied manually via Supabase SQL editor** — no `supabase db push`, no migrations table. Verify schema changes via direct queries / ops confirmation, not by assuming a migration ran.
- **Honest product representation is a hard constraint** — no fabricated user counts or invented output examples anywhere, including marketing copy.
- **Scope discipline over feature expansion.** Revenue infrastructure (Stripe, compliance) takes priority over new features. Flag it if a feature shipped ahead of a revenue/compliance blocker.

---

## 3. Current state (as of HEAD `f6eeda1`, 2026-07-22)

### Core studio / photo
- Text + photo repurpose shipped; vision gated via `VISION_ALLOWED_PLANS` / `planAllowsVision` (creator, pro, pro_plus).
- Homepage v2 merged (PR #15). Round-1 / Round-3 UX largely shipped: platform preview chrome, progressive per-format reveal, voice-setup banner, Library format filter + search, voice attribution on Library detail, Studio format opt-out, Library edit-draft recovery, output length indicators, sharper empty states, share-out / guidance loop.

### Billing / Stripe (code)
- Checkout, Customer Portal, `/billing`, Pro Plus price mapping, and webhooks for `checkout.session.completed` + `customer.subscription.updated` / `.deleted` are in code.
- `invoice.payment_failed` is **log-only** — no `payment_failed_at` column, no non-dismissible banner.
- Display prices in product UI/docs (GBP settlement): Creator **£19**, Pro **£44**, Pro Plus **£59**. Multi-currency notes in `docs/PRODUCT_SPEC.md` (USD/EUR additional price points + Adaptive Pricing). **Ops:** confirm live Stripe smoke (billing reflects plan, portal opens, cancellation webhook) still outstanding from earlier pass.

### AI / GDPR routing
- OpenRouter calls use `provider: { only: [...OPENROUTER_ALLOWED_PROVIDERS] }` in `lib/ai/generate.ts` (text, vision, bundle JSON).
- Privacy policy page exists at `app/privacy/page.tsx`. In-app account deletion, SAR/export runbook automation, DPAs/ICO/ROPA/breach plan remain ops/compliance work (policy currently points deletion at `support@voiceora.io`).

### Moment Bundle (major delta since July 9)
| Area | Status |
|---|---|
| Pro Plus tier + plan gates (`BUNDLE_ALLOWED_PLANS`) | **Shipped** |
| Schema (`bundles`, `bundle_assets`, `bundle_clips`, `repurposes.bundle_id`), RLS, `count_monthly_bundles` | **Shipped** (migrations in repo; confirm applied in prod) |
| Photo pack generate + `/bundles` workspace | **Shipped** |
| Video upload prepare, frame sampler, clip_specs two-stage pipeline | **Shipped in code**; **prod video UX gated** by `NEXT_PUBLIC_VIDEO_BUNDLES_DEV` |
| ffmpeg Railway worker + 30-day clip retention + clip delivery UI / signed downloads | **Shipped in repo** (confirm Railway deploy healthy in ops) |
| `POST /api/transcribe` DeepInfra Whisper large-v3 (Pro Plus, ephemeral) | **Shipped** |
| Brief 4 — voice recorder UI → transcript into bundle context | **Not started** |
| App → worker wake from Next.js | **Not wired** (worker polls DB ~5s; wake endpoint exists on worker) |

### iOS
- Capacitor Phase 0 shell present (`ios/`, `capacitor.config.ts`). Google OAuth hidden on native (`isNativePlatform()`), not fixed via in-app browser. App Store submission still gated on Apple Developer enrollment + account deletion requirement.

---

## 4. Roadmap / ambitions still ahead of the code

- **Moment Bundle Brief 4:** voice → context UI wiring to `/api/transcribe`.
- **Prod un-gate video bundles:** product/ops decision on `NEXT_PUBLIC_VIDEO_BUNDLES_DEV`.
- **Optional:** Next.js → worker wake; RPC auth hardening on `count_monthly_*` (noted in billing hardening report).
- **`invoice.payment_failed` banner:** still not built (non-dismissible banner + DB flag + webhook-driven).
- **Video-as-input for single-input Studio:** still deferred relative to Bundle path.
- **Annual plans:** deferred — checkout + env + `lib/stripe.ts` mapping.
- **Direct social publishing:** X first, Instagram later (Meta App Review); post-launch, Pro-tier.
- **iOS App Store submission:** OAuth fix, honest privacy claims, Safari payment handoff, account deletion — gated on Apple enrollment.
- **Pro Plus display name (D4):** still provisional in decisions register; UI already says “Pro Plus”.
- **Decisions register stale note:** A5 still says ASR unpinned; **code has pinned DeepInfra Whisper** — register should be closed out, not treated as blocking.

---

## 5. Success targets (context only — out of scope for code findings)

First paying users in 3–5 weeks of MVP completion; £1–2k MRR within 8–12 weeks. Free→paid conversion target 8–15%, churn target &lt;8%/month. Yardstick only — Stripe recently live; do not grade the codebase against these numbers.

---

## 6. Review criteria checklist

Check each explicitly, in priority order:

1. **MVP/scope alignment** — does recent work expand scope without a documented decision, or delay revenue/compliance-critical work?
2. **Fence and constant integrity** — protected symbols, allowlist mode, model slug pinning, audio pin (Section 2).
3. **Security** — Supabase RLS (incl. bundle tables / service_role grants), auth guards, input validation, server-side gates before AI spend, billing hardening.
4. **AI cost & model selection** — token usage, timeouts/retries, right-sized models per tier, bundle two-stage spend.
5. **Brand-voice / quality mechanisms (code-side)** — prompt injection of voice, format schemas, progressive reveal, attribution honesty. Full output-quality eval needs live samples; do not invent quality scores from static reading alone.
6. **User value & conversion** — speed to first result, upgrade gates clarity, Moment Bundle vs Studio surfaces.
7. **Doc sync** — do `PRODUCT_SPEC.md`, `ARCHITECTURE.md`, `AI_PROMPTS.md`, decisions register reflect HEAD? (Known drift: ARCHITECTURE still may say transcription unwired; PRODUCT_SPEC monetisation lines should match UI: Pro **£44** / Pro Plus **£59**.)
8. **Deploy prerequisites** — pending migrations, env vars (`STRIPE_PRICE_ID_*`, AI models, Railway/worker secrets), provider credits, feature flags.

---

## 7. Known open items (refreshed 2026-07-22)

| Priority | Item |
|---|---|
| Revenue / ops | Finish Stripe live-mode smoke test (billing page reflects plan, portal, cancellation webhook) — not verifiable from git |
| Revenue (code) | `invoice.payment_failed` → DB flag + non-dismissible banner |
| Compliance / launch | GDPR package beyond privacy page: DPAs, ICO confirmation, ROPA, retention schedule, breach plan, **in-app account deletion**, SAR runbook; stand up / confirm `support@voiceora.io` |
| Medium | Pin **dated** Qwen OpenRouter slugs (still floating `qwen/qwen3.5-*` in `lib/config.ts`) |
| Medium | Confirm bundle + `image` input-type migrations applied to **prod** Supabase |
| Medium | Confirm Railway ffmpeg-renderer healthy; decide whether to wire app→worker wake |
| Medium | Moment Bundle Brief 4 (voice UI); decide prod un-gate for video bundles |
| Low | Doc drift: decisions register A5, ARCHITECTURE transcription note, PRODUCT_SPEC pricing/roadmap checkboxes |
| Low | Follow-ups from billing hardening report (RPC auth on count RPCs, etc.) |
| Not launch-blocking | iOS submission — Apple Developer enrollment + OAuth/native auth fix |

**Closed or superseded since 2026-07-09 brief (do not re-open as if missing):**
- Homepage v2 merge
- Moment Bundle briefs 0a–3c + 2b ASR API (DeepInfra Whisper)
- Client vision plan-gate now uses `planAllowsVision` (was hardcoded `!== 'free'`)
- Large chunk of former UI backlog (previews, progressive reveal, Library filter/search, trust note, voice attribution, format opt-out, draft recovery)

---

## 8. Bottom line for "how long to ship"

Engineering surface for core text/photo Studio + photo Moment Bundles looks **substantially complete in repo**. Remaining risk is a mix of:

1. **Ops verification** — Stripe smoke, prod migrations, Railway worker, support inbox.
2. **Compliance must-haves for honest launch** — especially in-app account deletion + privacy/ops paperwork (privacy *page* exists; deletion flow does not).
3. **Product polish / next slice** — payment-failed banner, Brief 4 voice UI, video bundle prod un-gate, dated model pins.

This is no longer accurately described as “a few days of ops only” without re-checking those ops items — Moment Bundle added real deploy surface (worker, storage bucket, new RPCs). The review should separate **Studio launch blockers** from **Bundle production readiness**.

---

## 9. Required deliverable from the reviewer

1. **Executive verdict** (≤10 lines): Studio launch readiness vs Bundle readiness vs iOS — separate.
2. **Findings** ranked High / Medium / Low, each with file path(s) and why it matters against Sections 1–2.
3. **Updated open-items table** (delta vs Section 7) — mark verified-closed, still-open, newly found.
4. **Doc drift list** — concrete mismatches only.
5. **Explicit non-recommendations** — things you considered “fixing” but left alone because of Section 2 (e.g. billing-unit asymmetry, fence, allowlist-as-constant).

Do not deliver a generic clean-code essay. Do not propose Moment Bundle redesign. Do not merge or change code unless separately asked.

---

## 10. Start-here file map

| Concern | Paths |
|---|---|
| Fence | `app/(dashboard)/studio/_components/RepurposeWorkspace.tsx` |
| Models / plans / allowlist | `lib/config.ts` |
| OpenRouter generate + `provider.only` | `lib/ai/generate.ts` |
| Usage / rate limits | `lib/usage.ts` |
| Stripe | `lib/stripe.ts`, `app/api/stripe/**` |
| Bundles API/UI | `app/api/bundles/**`, `app/(dashboard)/bundles/**`, `lib/ai/bundle-generate.ts` |
| Clips worker | `workers/ffmpeg-renderer/` |
| ASR | `app/api/transcribe/route.ts`, `lib/audio/**` |
| Privacy | `app/privacy/page.tsx` |
| Specs / decisions | `docs/PRODUCT_SPEC.md`, `docs/ARCHITECTURE.md`, `docs/AI_PROMPTS.md`, `docs/moment-bundle-decisions-register-2026-07-12.md`, `docs/plans/moment-bundle-implementation-plan.md` |
