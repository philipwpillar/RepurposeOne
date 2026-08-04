# Voiceora — Full Stack Audit

**Date:** 4 Aug 2026  
**Repo:** [philipwpillar/RepurposeOne](https://github.com/philipwpillar/RepurposeOne)  
**Local + GitHub HEAD:** `83e43e9` (PR #119, account support email)  
**Mode:** Report-only (no code changes beyond this document)  
**Companion:** Cursor canvas `voiceora-full-audit-2026-08-04.canvas.tsx`

---

## 1. Executive summary

Voiceora is **substantially built and production-hosted**, with Studio, Library, Brand Voice, Moment Bundles, Voice Lab, billing, iOS shell, and holding page all present. The product is **not launch-ready** until several live ops/security issues are closed.

**Top verdict:** Code quality and metering design are strong. Live production configuration currently **breaks Stripe webhooks**, **hides legal pages**, and **fails CI on `main`**. Fix those before unsetting `HOLDING_MODE`.

| Area | Health |
|---|---|
| Product surface (code) | Strong |
| AI / voice fidelity controls | Strong |
| Billing metering design | Strong |
| Security (RLS / service-role) | Strong, with residual advisories |
| Live production config | **Weak — blocking** |
| CI / quality gates | **Red on main** |
| iOS shell | Ready for companion testing; OAuth still hidden |
| Compliance / GDPR package | Incomplete (ops, not code) |
| Railway ffmpeg worker | Code present; live health not verified here |

---

## 2. Scope and method

### In scope
- Local tree at `83e43e9` and GitHub `main`
- All app routes, API routes, middleware, AI, billing, migrations, worker, AC/e2e
- Live: `www.voiceora.io`, Vercel project `repurpose-one`, Supabase `RepurposeOne` (`mfkprihkqdgysjprbzbz`), Stripe account `Voiceora` (`acct_1TtmRVFXp89LOMAJ`), GitHub Actions

### Out of scope / unverified
- Railway ffmpeg-renderer process health and Railway env (no Railway MCP in this session)
- Exact decrypted values of most Vercel secrets (names confirmed; `HOLDING_MODE=true` confirmed)
- End-to-end paid checkout smoke with a real card
- App Store / TestFlight archive contents
- Full GDPR artefacts (DPA, ROPA, SAR runbook) beyond `/privacy` page existence

### Prior context
Cross-checked against Claude’s `VOICEORA_BRIEFING.md` (4 Aug 2026) and `docs/briefs/independent-audit-report-2026-07-27.md`.

---

## 3. Live system snapshot (4 Aug 2026)

### GitHub
- Public repo `philipwpillar/RepurposeOne`, default branch `main` @ `83e43e9`
- Workflows: **CI** (active), **Sweep pending orphans** (active), **Visual baselines** (active)
- Recent CI on `main` / PR #119: **FAIL** — `ac-check.sh floor` em/en dash gate
- Sweep workflow: recent runs **succeed**, but cadence is **hours apart**, not every 10 minutes (GitHub schedule drift). Secret `CRON_SECRET` and variable `APP_URL` exist.

### Vercel (`repurpose-one`)
- Production URL: `https://www.voiceora.io` (apex `voiceora.io` → **308** to www)
- Domains also include `repurpose-one-seven.vercel.app`
- **`HOLDING_MODE=true`** on Production only
- Also present: Turnstile keys, `VOICE_LAB_IP_SALT`, `CRON_SECRET`, Stripe + OpenRouter + Supabase keys, plan/rate limit overrides, `AI_PROVIDER` / model pins, `NEXT_PUBLIC_VIDEO_BUNDLES_DEV` (**set** — confirm value is not literally `true`)
- Not listed in Production env: `SENTRY_*`, `NEXT_PUBLIC_STREAM_STUDIO`, `PLAN_LIMIT_FREE`, `NEXT_PUBLIC_VIDEO_MAX_MB` (code defaults apply)

### Production HTTP probes
| URL | Result |
|---|---|
| `https://www.voiceora.io/` | **200**, `x-matched-path: /holding` |
| `/privacy`, `/terms`, `/sign-in` | **200**, rewritten to **/holding** |
| `/api/stripe/webhook` (on www and `repurpose-one-seven`) | **200 HTML** holding page (not Stripe handler) |
| `/api/cron/sweep-pending-repurposes` (no auth) | **401** JSON (allowlisted; auth works) |

### Supabase (`RepurposeOne`, eu-west-2, ACTIVE_HEALTHY)
| Table | RLS | Rows (approx) |
|---|---|---|
| profiles | on | 4 (2 free, 2 pro_plus) |
| brand_voices | on | 5 (`voice_range` column **present**) |
| repurposes | on | 147 (126 complete, 21 failed, **0 pending**) |
| bundles | on | 22 (11 complete, 11 failed) |
| bundle_assets | on | 38 |
| bundle_clips | on | 6 (3 complete, 3 failed) — video path **has been exercised** |
| voice_lab_hits | on | 0 |

- Orphans over age gates: **0** pending/analyzing/rendering stuck at audit time
- Reservation RPCs: `service_role` only (good)
- Count RPCs: `authenticated` (+ postgres), **not** anon (PUBLIC revoke applied)
- Storage `bundle-media`: private, **500MB** limit, mime allowlist includes images + video
- Migration ledger (`schema_migrations`): **21** recorded versions with dashboard timestamps — **out of sync** with local **30** files (manual apply history). Schema looks present; ledger is not a reliable completeness checklist.

### Stripe (live)
- Account: **Voiceora**, livemode products Creator £19 / Pro £44 / Pro Plus £59 — matches `PLAN_PRICES`
- Webhook endpoint **enabled**, livemode, URL: `https://repurpose-one-seven.vercel.app/api/stripe/webhook`
- Events registered: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`
- **Missing:** `invoice.paid` (code handles it; Stripe endpoint does not send it)
- **Critical interaction with holding:** POSTs currently receive holding HTML with **HTTP 200**, so Stripe may treat deliveries as successful while plans never update

### Supabase advisors (live)
- INFO: `voice_lab_hits` RLS on, no policies (intentional service-role-only)
- WARN: several `SECURITY DEFINER` RPCs executable by `authenticated` (expected for library/count with uid guards)
- WARN: **Leaked password protection disabled** on Auth

---

## 4. Findings

Severity key: **P0** launch/revenue blocker · **P1** high · **P2** medium · **P3** low/info

### P0 — Launch / revenue blockers

| ID | Finding | Evidence | Recommended action |
|---|---|---|---|
| **L1** | Holding mode rewrites **Stripe webhook** to `/holding` HTML (200) | `middleware.ts` allowlist lacks `/api/stripe`; live curl returns holding HTML | Add `/api/stripe` (at least webhook) to `HOLDING_ALLOWLIST` **before** any live paid smoke; or unset holding only after webhook works |
| **L2** | Holding blocks **`/privacy` and `/terms`** | Live `x-matched-path: /holding` | Allowlist legal routes while holding stays on (App Store / trust) |
| **L3** | Stripe live webhook missing **`invoice.paid`** | Stripe endpoint events list vs `webhook/route.ts` cases | Register `invoice.paid` on the live endpoint |
| **L4** | CI **red on `main`** — em dash in UI tree | `components/repurpose/upgrade-prompt.tsx:48` comment; `ac-check.sh floor` FAIL locally and in Actions | Replace `—` in that comment; restore green main |

### P1 — High

| ID | Finding | Evidence | Recommended action |
|---|---|---|---|
| **H1** | Video bundles flag is **UI-only**; APIs accept video without `NEXT_PUBLIC_VIDEO_BUNDLES_DEV` | `BundleWorkspace` gates UI; `prepare`/`generate` do not | Server-side gate or accept API as GA |
| **H2** | Orphan sweeper cadence unreliable | Workflow claims `*/10`; live runs ~2–3h apart; Vercel cron still daily | Confirm GH schedule reliability; consider paid runner / external cron / worker settle |
| **H3** | `/api/generate` (and several long routes) lack `maxDuration` | Stream/bundles set limits; non-stream generate does not | Set explicit `maxDuration` aligned to Vercel plan |
| **H4** | Auth middleware omits **`/bundles`** (layout-only gate) | `PROTECTED_PREFIXES` in `lib/supabase/middleware.ts` | Add `/bundles` (+ optionally `/onboarding`) |
| **H5** | `.env.example` missing critical ops vars | No `CRON_SECRET`, Voice Lab salt, Turnstile, worker wake | Document for onboarding / disaster recovery |
| **H6** | AC phase-6 Capacitor assert stale vs `www.voiceora.io` runtime URL | `ac-check.sh` vs `capacitor.config.ts` | Fix assert; keep phase-6 meaningful |

### P2 — Medium

| ID | Finding | Notes |
|---|---|---|
| **M1** | Calendar-month metering vs Stripe billing period | Still deferred; matters once real paid renewals exist |
| **M2** | Soft UI usage (complete-only) vs hard reservation (complete+pending) | Near-cap users can see false headroom |
| **M3** | SSRF DNS rebinding TOCTOU on URL ingest | Strong first version; not pin-to-IP |
| **M4** | Turnstile fail-open when secret unset | Intentional for CI; Production has keys (good) |
| **M5** | Native purchase strip is UI-only; Stripe APIs still callable | Companion model; review risk if discoverable |
| **M6** | Bundle video-asset **select** errors soft-continue to `complete` | Clip **insert** fail-closed; select is not |
| **M7** | No per-user rate limit on `/api/ingest/url` | Documented intentional gap |
| **M8** | Storage bucket 500MB ≫ app `VIDEO_MAX_MB` default 45 | Rely on app validation |
| **M9** | Migration ledger drift (21 remote vs 30 local files) | Schema appears OK; repair tracking before `db push` |
| **M10** | Auth leaked-password protection off | Supabase Auth advisor |
| **M11** | E2E coverage Studio-heavy; no bundles/Voice Lab/ingest/delete | Expand before launch confidence |
| **M12** | Worker `/wake` unused by app; README lifecycle timing stale | Poll-only latency |
| **M13** | `generation_id` parallel race can under-bill | Documented residual |
| **M14** | Holding blocks sign-in/sign-up without bypass | Expected for holding; document preview cookie for testers |

### P3 — Low / info

| ID | Finding |
|---|---|
| **I1** | No CSP header; soft HSTS `max-age=300` |
| **I2** | Google OAuth hidden on iOS by design until native flow verified |
| **I3** | Floating Qwen model slugs (env pin lever exists) |
| **I4** | `docs/voiceora-review-brief-2026-07-22.md` still mentions withdrawn ASR/`/api/transcribe` |
| **I5** | July-27 independent audit H1/H2 closed in code; treat as historical |
| **I6** | Sentry env vars absent in Production list (SDK no-ops without DSN) |
| **I7** | Staging Supabase project inactive; Rail MVP project inactive |

---

## 5. Prior audit cross-check (2026-07-27)

| Prior ID | Status at `83e43e9` + live |
|---|---|
| H1 Bundle bypasses reservation | **Closed** — `reservePendingRepurpose` before vision |
| H2 Stuck `rendering` never reclaimed | **Closed** — worker + cron reclaim; **0** stuck in prod |
| H3 Daily sweeper vs 10m age | **Mitigated in design** (GH Actions), **residual in practice** (schedule drift) |
| M1 Open redirect | **Closed** — `safeRedirectUrl` |
| M2 Clip insert fail-open | **Closed** |
| M3 Unbounded library load | **Closed** — paginated RPCs |
| M4/M5 Lifecycle / rate limit | **Closed** |

---

## 6. Area deep-dives (equal depth)

### 6.1 Product surface
Routes match the briefing: public landing/holding/legal/auth; dashboard studio/library/brand-voice/bundles/account/onboarding; permanent redirects for old paths. Holding allowlist is intentionally narrow and currently **too narrow** for legal + Stripe.

### 6.2 Studio / AI
OpenRouter-only with hard `provider.only: deepinfra/fp8` code constant. Voice identity + variants + strip-em-dashes + Zod JSON validation are coherent. Streaming path reserves before spend. Photo context mandatory. Exemplars fail-open. Differentiator protections look load-bearing and intact.

### 6.3 Billing
Generation-id DISTINCT metering + row rate limits remain the correct asymmetry. Atomic reservation under advisory lock is solid. Live Stripe prices match catalog. Webhook **code** handles five events; **live endpoint** registers four and is currently unreachable under holding.

### 6.4 Data / RLS
Writes to metering tables revoked from `authenticated`; reservations service-role-only. Profile billing columns trigger-protected. Prod grants match intent for count/reserve RPCs. Advisors WARN on DEFINER+authenticated is expected for intentional RPC surface.

### 6.5 Moment Bundles / worker
Two-stage pipeline and Railway worker code are present. Prod has clip rows (path exercised historically). Video UI gated by env `=== "true"`. Worker wake not wired from app. Live Railway health not verified.

### 6.6 iOS
Capacitor 8 SPM, remote URL `www.voiceora.io`, UA `VoiceoraiOS/1`, purchase surfaces stripped for 3.1.3(f). Holding bypass cookie-on-200 pattern is correct for WKWebView. Google button hidden until native OAuth verified.

### 6.7 Quality gates
Floor AC currently **fails** on one em dash in a comment (also failing CI on main since PR #118/#119). Studio fence gates pass. Playwright covers Studio/auth/landing/legal/upgrade; not bundles/Voice Lab.

---

## 7. Launch-path checklist (ordered)

1. Fix L4 (em dash) → green CI on main  
2. Fix L1 + L2 (holding allowlist: Stripe webhook + privacy + terms)  
3. Fix L3 (register `invoice.paid` on live webhook)  
4. Smoke: checkout → plan on `/account` → portal → cancel/update webhook (with holding bypass or after allowlist fix)  
5. Confirm `NEXT_PUBLIC_VIDEO_BUNDLES_DEV` is **not** `true` in Production  
6. Confirm all schema features (esp. `voice_range`, mime allowlist, voice_lab) against a written checklist; optionally repair `schema_migrations`  
7. Enable Auth leaked-password protection  
8. Support inbox / GDPR package / unset `HOLDING_MODE` only after 1–7  

---

## 8. What is solid (do not relitigate)

- Brand-voice-first positioning and prompt layering  
- OpenRouter `provider.only` as code constant  
- Atomic `reserve_pending_repurpose` / `reserve_bundle_under_cap`  
- Billing unit = generation_id (not row)  
- Service-role metering writes + billing column trigger  
- Account deletion confirmation flow (code present)  
- SSRF checks on URL ingest (first-version strong)  
- Holding bypass cookie set on 200 for Capacitor  
- iOS companion purchase strip pattern  
- Brief → Cursor PR → Claude verify → Phil merge workflow  

---

## 9. Access used

| System | Access |
|---|---|
| Local git | Full |
| GitHub | `gh` API / Actions runs |
| Vercel | CLI env names; `HOLDING_MODE=true` confirmed |
| Supabase MCP | Project list, migrations ledger, advisors, SQL reads |
| Stripe MCP | Account, products, prices, webhook endpoints |
| Railway | **Not accessed** |
| OpenRouter dashboard | **Not accessed** |

---

## 10. Document control

- Written for Cursor context rebuild after chat loss  
- Report-only; no production changes made during this audit  
- Branch intended for this file: `docs/full-audit-2026-08-04`  
- Re-run live probes before launch; configuration drifts  

*End of audit.*
