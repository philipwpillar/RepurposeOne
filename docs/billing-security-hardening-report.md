# Billing Security Hardening — Implementation Report

**Branch:** `fix/billing-rls-hardening`  
**Date:** 2026-07-20  
**Scope:** Three critical billing bypass vulnerabilities identified in codebase audit

---

## Executive summary

Implemented defense-in-depth fixes for three critical issues that allowed authenticated users to bypass plan gates and monthly usage caps via the browser Supabase client or crafted API requests. Changes consist of one database migration plus route-layer validation and service-role writes.

**Approach chosen for `generation_id`:** Route-only TypeScript validation (not SQL RPC + advisory lock). This closes the primary abuse path with minimal complexity; a small parallel-request race window remains (documented below).

**Build status:** `npx tsc --noEmit` and `npx next build` pass on this branch.

**Deploy prerequisite:** Apply migration `20260720160000_billing_security_hardening.sql` to production before deploying application code.

---

## Fix 1 — Profile billing column protection

### Vulnerability
Any authenticated user could run `supabase.from('profiles').update({ plan: 'pro_plus' })` from the browser, bypassing all API plan gates.

### Implementation
**Migration:** `supabase/migrations/20260720160000_billing_security_hardening.sql`

- Added `BEFORE UPDATE` trigger `protect_profile_billing_columns()` on `public.profiles`.
- Blocks changes to `plan`, `stripe_customer_id`, and `stripe_subscription_id` unless `auth.role() = 'service_role'`.
- Allows authenticated updates to safe columns (e.g. `onboarding_completed_at` from onboarding flow).

**Code change:** [`app/api/stripe/checkout/route.ts`](../app/api/stripe/checkout/route.ts)

- Moved `stripe_customer_id` write from user Supabase client to `createAdminClient()` after Stripe customer creation.
- Webhook route was already using admin client — no change needed.

### What still works
- Onboarding skip/save updating `onboarding_completed_at` via browser client.
- Stripe webhook plan upgrades/downgrades via service role.
- Checkout creating Stripe customers and persisting `stripe_customer_id`.

---

## Fix 2 — `generation_id` validation (route-only TS)

### Vulnerability
`POST /api/generate` accepted arbitrary client `generation_id`. Billing uses `COUNT(DISTINCT generation_id)`, so reusing one UUID across unrelated runs under-counted monthly usage.

### Implementation
**New module:** [`lib/repurpose/generation-id.ts`](../lib/repurpose/generation-id.ts)

- `computeSourceHash(inputContent)` — mirrors Postgres `md5(trim(input_content))` used by `repurposes.source_hash`.
- `resolveGenerationId(supabase, { userId, clientGenerationId, sourceHash, targetFormat })`:
  - **No client id** → returns `undefined` (DB assigns fresh UUID per row; single-format regen bills individually).
  - **Client id, no siblings** → accept (first format in parallel Regenerate All batch).
  - **Client id, has siblings** → require:
    - All siblings share the same `source_hash`
    - First sibling within **15 minutes**
    - Target format not already present
    - At most **4** formats in the group
  - Violations throw `GenerationIdValidationError` → API returns 400.

**Route change:** [`app/api/generate/route.ts`](../app/api/generate/route.ts)

- Validates `generation_id` before insert; uses resolved UUID in pending row.

**Migration (schema support):**

- Backfill NULL `generation_id` values with row `id`
- `ALTER COLUMN generation_id SET NOT NULL`
- Unique index `(user_id, generation_id, target_format)` — prevents duplicate format in same billing group

**Types:** [`types/index.ts`](../types/index.ts) — comment clarifying server validates client-supplied id.

### Known limitation (route-only tradeoff)
Two unrelated parallel requests that share the same client UUID and both see zero siblings before either inserts could still slip through with different `source_hash` values. The unique index prevents duplicate formats but not this edge case. **Mitigation if needed later:** SQL RPC with `pg_advisory_xact_lock`.

### What still works
- Regenerate All / Update & Regenerate All (client mints UUID, four parallel calls share one billing group).
- Single-format regenerate (no `generation_id` sent → each bills separately).

---

## Fix 3 — Metering table write lockdown

### Vulnerability
Authenticated users had `INSERT`, `UPDATE`, and `DELETE` on `repurposes` and bundle tables. Users could delete complete rows, set `status = 'failed'`, or insert forged complete rows to evade caps.

### Implementation
**Migration:** Same file — `REVOKE INSERT, UPDATE, DELETE` on:

- `public.repurposes`
- `public.bundles`
- `public.bundle_assets`
- `public.bundle_clips`

`SELECT` grants unchanged — library, dashboard, and usage reads continue via user client.

**Routes switched to `createAdminClient()` for writes** (after auth + ownership checks on user client):

| File | Writes migrated |
|------|-----------------|
| [`app/api/generate/route.ts`](../app/api/generate/route.ts) | repurposes insert, complete/failed update |
| [`app/api/repurposes/[id]/feedback/route.ts`](../app/api/repurposes/[id]/feedback/route.ts) | feedback columns update |
| [`app/api/bundles/prepare/route.ts`](../app/api/bundles/prepare/route.ts) | bundles + bundle_assets insert/update |
| [`app/api/bundles/generate/route.ts`](../app/api/bundles/generate/route.ts) | bundles, bundle_assets, bundle_clips, repurposes |

Reads (plan checks, bundle load, asset verification, usage RPCs) remain on the authenticated user client.

**Helper:** [`lib/supabase/admin.ts`](../lib/supabase/admin.ts) — documented as service-role client for post-auth writes.

### What still works
- Library/dashboard SELECT queries from browser.
- Feedback PATCH API (rating, edits, workflow status).
- Full studio generate and bundle generate/prepare flows via API routes.

### What is blocked
- Direct browser `insert`/`update`/`delete` on metering tables.
- Client tampering with `status`, `output`, or `generation_id` on repurposes/bundles.

---

## Files changed

| File | Change |
|------|--------|
| `supabase/migrations/20260720160000_billing_security_hardening.sql` | **New** — trigger, NOT NULL, unique index, REVOKE |
| `lib/repurpose/generation-id.ts` | **New** — source hash + validation |
| `app/api/generate/route.ts` | generation_id validation + admin writes |
| `app/api/stripe/checkout/route.ts` | admin write for stripe_customer_id |
| `app/api/repurposes/[id]/feedback/route.ts` | admin write for feedback |
| `app/api/bundles/prepare/route.ts` | admin writes for bundles/assets |
| `app/api/bundles/generate/route.ts` | admin writes for all metering mutations |
| `lib/supabase/admin.ts` | documentation comment |
| `types/index.ts` | generation_id schema comment |

---

## Manual QA checklist (post-migration)

1. **Profile tamper:** Browser console `supabase.from('profiles').update({ plan: 'pro_plus' })` → error.
2. **Onboarding:** Skip or complete onboarding → `onboarding_completed_at` updates successfully.
3. **Checkout:** New user can start Stripe checkout (stripe_customer_id saved).
4. **Regenerate All:** Four formats complete → monthly usage +1 (not +4).
5. **Single regen:** One format without shared id → usage +1 per success.
6. **generation_id abuse:** Replay old UUID with different content → 400 validation error.
7. **Repurpose tamper:** Client insert/delete/status update on repurposes → permission denied.
8. **Feedback:** Library edit / workflow status PATCH still works.
9. **Bundles:** Prepare + photo generate E2E on Pro Plus still works.

---

## Out of scope (follow-up)

- Atomic usage/bundle cap reservation (TOCTOU races)
- RPC auth check on `count_monthly_generations` / `count_monthly_bundles`
- SQL advisory lock for `generation_id` (closes remaining parallel race)
- Stripe `past_due` / failed payment downgrade handling

---

## Deployment order

1. Apply migration to Supabase (`supabase db push` or SQL Editor).
2. Deploy application code from `fix/billing-rls-hardening`.
3. Run manual QA checklist above in staging before production.
