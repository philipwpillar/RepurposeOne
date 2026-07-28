# Independent codebase audit — Voiceora

**Repo:** `philipwpillar/RepurposeOne`  
**Audited commit:** `e099ddb` (`Merge pull request #79 …`)  
**Auditor model:** Cursor Grok 4.5 (not Claude)  
**Method:** Static reading only. No app run, no test suite, no code changes.  
**Clone note:** A fresh `/tmp` clone was blocked by the host auto-review sandbox. Audit used the local checkout verified at `e099ddb` with a clean `git diff` against `HEAD` (only unrelated untracked `.tmp-*` / brief files present). Confidence in commit identity: **high**.

---

## Findings

### High

#### H1 — Bundle generate bypasses atomic generation-quota reservation (TOCTOU overshoot)

**Evidence:**
- `app/api/bundles/generate/route.ts:234-252` — soft `checkUsageLimit` (complete-only count, no lock)
- `app/api/bundles/generate/route.ts:659-672` — later inserts `repurposes` rows directly via service role with `generation_id: bundle.generation_id`, **without** `reserve_pending_repurpose`
- Contrast: `app/api/generate/route.ts:250-261` and `app/api/generate/stream/route.ts:281-292` correctly call `reservePendingRepurpose`
- Locking exists only in `supabase/migrations/20260723150000_billing_hardening_followups.sql:99-130` (`pg_advisory_xact_lock` inside `reserve_pending_repurpose`)

**What breaks:** Two concurrent Studio generates and one Moment Bundle (or two concurrent bundles) that all pass `checkUsageLimit` at `used = limit - 1` can each create a distinct billable `generation_id`. Monthly generation quota overshoots. Real money: free generations beyond the paid cap.

**Reproduction:** Near monthly cap, fire Studio “Regenerate all” and a Moment Bundle generate in the same second. Inspect `count(distinct generation_id)` for complete rows in the billing window vs `PLAN_LIMITS`.

**Suggested fix:** Route bundle format-row creation through `reserve_pending_repurpose` (or a sibling RPC that takes the bundle’s `generation_id` under the same advisory lock) before any AI spend on formats; fail closed on `quota_exceeded`.

**Confidence:** high (observed in code; race is structural).

---

#### H2 — Stuck `bundle_clips.render_status = 'rendering'` is never reclaimed

**Evidence:**
- Claim path: `workers/ffmpeg-renderer/src/clip-jobs.ts:20-45` selects only `render_status = 'pending'`, then CAS-updates to `'rendering'` and increments `attempt_count`
- No sweeper resets aged `'rendering'` rows; cron only touches `repurposes.pending` and `bundles` in `pending|analyzing` (`app/api/cron/sweep-pending-repurposes/route.ts:65-99`)
- Worker lifecycle (`workers/ffmpeg-renderer/src/lifecycle.ts`) deletes storage, does not settle stuck renders
- UI treats pending/rendering as in-flight forever (`app/(dashboard)/bundles/_components/BundleClipsPanel.tsx:20`)

**What breaks:** Worker crash / OOM / host kill after claim leaves the clip permanently `rendering`. Source video is never deleted (`lifecycle.ts:173-179` waits for all clips terminal). User sees endless “rendering”; paid clip deliverable never appears; retry path never runs because claim ignores `rendering`.

**Reproduction:** Claim a clip (or simulate by setting `render_status='rendering'` on a row), kill the worker mid-render, wait. Row stays `rendering`; UI spinner does not clear.

**Suggested fix:** On worker boot and/or cron, reset `rendering` rows older than N minutes back to `pending` (or `failed` if `attempt_count >= 2`). Optionally include them in the Vercel sweeper.

**Confidence:** high. Matches the known 27 July incident class called out in the brief.

---

#### H3 — Orphan sweeper runs once daily while quota holds orphans after 10 minutes of age

**Evidence:**
- Age gate: `app/api/cron/sweep-pending-repurposes/route.ts:9` — `PENDING_ORPHAN_MAX_AGE_MS = 10 * 60 * 1000`
- Schedule: `vercel.json:4-6` — `"0 3 * * *"` (once per day)
- Pending rows consume generation quota: `reserve_pending_repurpose` counts `status in ('complete','pending')` (`20260723150000_billing_hardening_followups.sql:101-106`)
- In-flight bundles consume N2: `status <> 'failed'` (`same file:175-180`); sweeper settles `pending|analyzing` only

**What breaks:** A stranded `pending` repurpose or `analyzing` bundle blocks quota from age≥10m until the next 03:00 UTC cron — up to ~24h of false “at limit”, not 10 minutes. Users who hit a disconnect / Vercel kill near cap are locked out until tomorrow.

**Reproduction:** Leave a `repurposes` row `pending` with `created_at` > 10m old before 03:00 UTC; confirm it still counts in reservation until the daily job runs.

**Suggested fix:** Run the sweeper every 5–15 minutes (Vercel cron), or settle orphans inline with a DB job / `pg_cron` if available.

**Confidence:** high.

---

### Medium

#### M1 — Open redirect via protocol-relative `redirect` on auth routes

**Evidence:** `lib/supabase/middleware.ts:63-66`

```ts
const destination = redirect && redirect.startsWith("/") ? redirect : "/dashboard";
return NextResponse.redirect(new URL(destination, request.url));
```

Verified: `new URL("//evil.com", "https://voiceora.io/sign-in")` → `https://evil.com/`.

Sibling `app/auth/callback/route.ts:13-14` concatenates `` `${origin}${safeNext}` `` and is **not** vulnerable to the same reinterpretation.

**What breaks:** A logged-in user who opens `https://<app>/sign-in?redirect=//evil.com` is 307’d off-site. Phishing / credential-harvest primitive using the real origin in the initial link.

**Reproduction:** While authenticated, visit `/sign-in?redirect=//example.com` and observe Location.

**Suggested fix:** Reject `redirect` values starting with `//` (and `/\`), or require `new URL(dest, origin).origin === request.nextUrl.origin` after construction.

**Confidence:** high (runtime URL check confirmed).

---

#### M2 — Failed `bundle_clips` insert is logged and ignored; bundle still marked complete

**Evidence:** `app/api/bundles/generate/route.ts:621-637` (insert error → `console.error` only); `777-789` always sets `bundles.status = 'complete'` afterward.

**What breaks:** Vision/AI already spent; user gets a “complete” bundle with captions/formats but no persisted clips / no render jobs. Looks like success; video deliverables silently missing. Retry may create a second N2-consuming prepare depending on client flow.

**Reproduction:** Force `bundle_clips` insert failure (constraint / RLS / DB error) during a prepared video generate; response 200 with empty/missing `clip_id`s; no pending render rows.

**Suggested fix:** On clip persist failure for a video bundle that produced `clip_specs`, mark bundle `failed` (or a partial status) and return 502 — or retry insert once before completing.

**Confidence:** high.

---

#### M3 — Library grouped view still loads all complete rows (unbounded)

**Evidence:** `app/(dashboard)/library/page.tsx:141-146` — `.select("id, source_hash, created_at, target_format")` with user + status filters, **no** `.limit()` / `.range()`. Flat path correctly paginates (`:121-129`). Hydrate query (`:180-186`) is bounded by visible hashes but still can return every row sharing those hashes.

**What breaks:** Power users with large libraries hit slow SSR / PostgREST payload growth on every grouped Library load. Scales with total history, not page size. (Flat list path from Phase 5B is fine.)

**Reproduction:** Seed thousands of complete `repurposes` for one user; open Library in grouped mode; observe single unbounded index query.

**Suggested fix:** Paginate groups in SQL (distinct `source_hash` with limit/offset) or maintain a grouping table/materialized index; never pull the full history into the server component.

**Confidence:** high.

---

#### M4 — FFmpeg worker lifecycle sweeps are globally unbounded

**Evidence:**
- `workers/ffmpeg-renderer/src/lifecycle.ts:144-148` — all video assets with non-null `storage_path`, no limit
- `lifecycle.ts:49-54` — all complete clips older than retention
- `lifecycle.ts:94-98` — all abandoned pending/failed bundles past grace

**What breaks:** As total `bundle_assets` / `bundle_clips` grow, each lifecycle tick becomes an ever-larger full-table style scan from the service-role worker (separate host). Latency and memory climb; sweeps can overlap work.

**Reproduction:** Observe worker lifecycle query duration as clip/asset counts grow (ops / logs).

**Suggested fix:** Batch with `.limit(N)` + keyset on `updated_at`/`id`; loop until empty.

**Confidence:** high for unboundedness; production impact unverified (no prod metrics).

---

#### M5 — Bundle generate burst control uses repurpose rate limit, not bundle activity

**Evidence:** `app/api/bundles/generate/route.ts:215-232` calls `checkRateLimit` (`lib/usage.ts:93-116`), which counts **repurpose** rows. Prepare correctly uses `checkBundlePrepareRateLimit` (`prepare/route.ts:104-106`). Heavy vision work in generate happens before format repurpose inserts (`generate/route.ts:427-457` then `:651+`).

**What breaks:** Concurrent `/api/bundles/generate` calls (especially photo-only new bundles, or overlapping analyzes) can all pass the burst gate before pending format rows exist, amplifying OpenRouter spend. N2 still caps successful reservations, but failed/analyzing attempts still cost inference.

**Suggested fix:** Add a bundle-generate burst counter (or count `bundles` in `analyzing` + recent completes) under the same window as prepare.

**Confidence:** medium-high (abuse path clear; practical exploitability depends on plan/N2).

---

### Low

#### L1 — Non-constant-time compare on ffmpeg worker `/wake`

**Evidence:** `workers/ffmpeg-renderer/src/server.ts` (wake secret `!==` check; cron correctly uses `timingSafeEqual` in `sweep-pending-repurposes/route.ts:22-34`).

**What breaks:** Theoretical timing leak on an internal wake hint endpoint — not user data / not billing. Low practical risk on the public internet.

**Suggested fix:** Mirror the cron `timingSafeEqual` + length check pattern.

**Confidence:** high for the code smell; low for exploitability.

---

#### L2 — Brand voices / account media path lists lack limits

**Evidence:** `app/(dashboard)/brand-voice/page.tsx:14-21`; `app/api/account/delete/route.ts:74-82`.

**What breaks:** Unlikely for voices (small N). Account delete loading every asset/clip path could be heavy for power users; still one-shot.

**Suggested fix:** Soft cap on voices in product UI; chunked path listing already chunks storage deletes — also page the selects.

**Confidence:** medium (consequence small).

---

## What I examined and found nothing

Mandatory negative results:

| Area | Result |
|---|---|
| **RLS on all 6 tables** | Policies are ownership-scoped (`auth.uid() = user_id` / `id`). INSERT `WITH CHECK` present. Billing columns protected by trigger; metering table writes revoked from `authenticated` (service-role only). No cross-user read policy found. |
| **IDOR on all 11 API routes** | `/api/bundles/[id]`, feedback, prepare, generate, generate/stream, generate, account/delete, stripe/*, cron — all gate on `getUser()` or `CRON_SECRET`, and scope by `user.id` before admin writes / signed URLs. |
| **`createAdminClient()` call sites** | Every site preceded by auth or cron secret; subsequent queries re-filter by user id / cron scope. |
| **Stripe webhook forgery** | `constructEvent` + `STRIPE_WEBHOOK_SECRET`; missing/invalid sig → 400. Plan derived from price IDs server-side (`lib/stripe.ts:40-53`), not client body. Checkout sets `client_reference_id` from session user (`checkout/route.ts:84-85`). |
| **Signed URL ownership** | Download TTL 600s; issued only after bundle ownership (`bundles/[id]/route.ts`). Upload URLs only after prepare auth/plan/N2. Worker path prefix checks (`paths.ts` / `render.ts:107-111`). |
| **Cron auth fail-open** | Unset `CRON_SECRET` → deny (`authorizeCron` returns false). |
| **GDPR provider pin in code** | `OPENROUTER_ALLOWED_PROVIDERS` hardcoded; text, vision, stream wrapper, and `completeOpenRouterJson` all set `provider: { only: [...] }`. No alternate provider SDKs found. |
| **FFmpeg `overlay_text` injection** | Overlay content written to a temp **textfile**; filter uses `textfile=` with path escaping (`render.ts:156-168`). User text is not interpolated into the filter graph as raw `text=`. Injection via overlay into argv/filter: **not found**. |
| **Studio streaming abort settlement** | `markFailed` + `after()` on abort/cancel (`stream/route.ts:324-340, 464-466`); `settled` guard against double-write. |
| **Photo / vision path auth & quota** | `/api/generate` image branch uses same `reservePendingRepurpose` as text; plan gate via `planAllowsVision`; client parses error bodies (`photo-generate-client.ts:78-94`). |
| **`reserve_*` advisory locks** | Lock acquired before count+insert inside one transaction for both generation and bundle N2 RPCs. |
| **Prepare failure cleanup** | Asset/URL failures mark bundle `failed`, releasing N2 (`prepare/route.ts:188-273`). |
| **Middleware page gate** | Protected prefixes bounce unauthenticated users; dashboard layout re-checks `getUser()`. |

---

## Uncertain

Do **not** treat these as findings:

1. **OpenRouter `provider.only` live enforcement** — code sends the pin correctly; whether OpenRouter ever silently routes elsewhere under provider outage is an ops/live API contract check (brief: GDPR High if it does). Recommend one deliberate bad-slug call in staging.
2. **Supabase Auth dashboard settings** — JWT TTL, redirect allowlists, email confirmation: not in repo (no `config.toml`). Verify OAuth `redirectTo` allowlist in dashboard.
3. **Production migration drift** — migrations are applied manually; repo intent looks coherent, but cannot confirm prod schema matches without SQL against the live project.
4. **Stripe event-id dedup ledger** — handlers are idempotent set-ops today; safe under replay. Additive handlers later would need explicit dedup — flag for future, not a current defect.
5. **`hashtext` advisory-lock collisions** — theoretically two user-id strings could share a lock key; probability low; unconfirmed as a practical issue.
6. **Calendar-month vs Stripe billing period** — `getCurrentBillingPeriod` uses `startOfMonth`/`endOfMonth`. Whether that matches Stripe invoice periods is product/ops; not asserted wrong here beyond the disagreement note below.
7. **Railway worker env / wake exposure** — whether `/wake` is internet-reachable is ops config, invisible from the repo.

---

## Disagreements with documented decisions

**Calendar-month metering vs Stripe subscription period.** Counting generations on a civil calendar month while Stripe renews on subscription anniversaries can give a short window where a subscriber has “reset” usage before or after they have paid for the next period (or the reverse). Pre-launch this is tolerable; before real revenue I would align the meter window to `current_period_start/end` from Stripe (or document the calendar choice in customer-facing billing copy so it is not a surprise). One paragraph; not re-litigated further.

No disagreements filed on the Studio fence, billing unit asymmetry, `provider.only`, library grouping, two-zone chrome, manual migrations, no auto-failover, or clip metadata retention.

---

## Priority spend summary

Effort went to: security/auth (RLS, IDOR, admin client, Stripe, signed URLs, cron, GDPR pin), billing/quota RPCs and bundle generate (802-line route), stream route, photo/vision path, ffmpeg overlay construction, orphan/sweep behavior, and unbounded queries.

Largest concrete risks to fix first: **H1 (bundle quota TOCTOU)**, **H2 (stuck rendering)**, **H3 (daily sweeper)**, then **M1 (open redirect)**.
