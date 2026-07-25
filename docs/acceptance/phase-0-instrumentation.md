# Phase 0 acceptance — instrumentation

**Branch:** `feat/ui-quality-instrumentation-thin`  
**HEAD baseline compared against:** `e1d1b22`  
**Date:** 2026-07-25  
**Amended:** critical-path Playwright + corrected `run_0()` (PR #61)

## Gate command

```bash
bash scripts/ac-check.sh 0
```

## Results (recorded at PR-ready)

```
── GLOBAL FLOOR (every phase) ──
  PASS  no window.confirm / alert()            0 eq 0
  PASS  live regions preserved                 11 ge 11
  PASS  prefers-reduced-motion present         4 ge 4
  PASS  no Tailwind arbitrary hex ADDED        0 eq 0
── FENCE (assert only if the PR touches Studio) ──
  PASS  class GenerateApiError                 1 eq 1
  PASS  callGenerateApi                        3 eq 3
  PASS  callPhotoGenerateApi                   2 eq 2
  PASS  PhotoGenerateApiError                  2 eq 2
  PASS  setUsedCount(apiErr.usage.used)        1 eq 1
── PHASE 0 ──
  PASS  @vercel/analytics+speed-insights       4 ge 2
  PASS  @playwright/test installed             1 ge 1
  PASS  auth setup spec exists                 1 eq 1
  PASS  storageState wired                     3 ge 2
  PASS  setup project + dependencies           2 ge 2
  PASS  authenticated critical paths           3 ge 2
  PASS  studio spec hits /studio               2 ge 1
  PASS  library spec hits /library             2 ge 1
  PASS  402 upgrade-gate covered               2 ge 1
  PASS  AI calls stubbed in e2e                2 ge 1
  PASS  auth guard covered                     3 ge 1
  PASS  CI runs the AC harness                 2 ge 2
  PASS  CI runs playwright                     1 ge 1
  PASS  acceptance note committed              1 eq 1

RESULT: PASS
```

## What shipped

| Item | Evidence |
|---|---|
| AC harness | `scripts/ac-check.sh` (corrected `run_0()`; Phase 8 visual gates in `run_8()`) |
| Vercel Analytics + Speed Insights | `app/layout.tsx` imports + `package.json` |
| Playwright auth setup | `e2e/auth.setup.ts` + `storageState` / setup project in `playwright.config.ts` |
| Critical paths | `e2e/studio-generate.spec.ts`, `e2e/upgrade-gate.spec.ts`; public surfaces as `landing.anon.spec.ts`, `legal.anon.spec.ts`, `auth-guard.anon.spec.ts` |
| AI stubbed | `page.route("**/api/generate")` in studio + upgrade-gate specs |
| CI | build inlines `NEXT_PUBLIC_SUPABASE_*`; `npx playwright test` with secrets; AC harness floor + 0 |

## Notes / follow-ups (not Phase 0 blockers)

- - **Anon vs auth rule:** `.anon.spec.ts` = public/signed-out surfaces; `.spec.ts` = authenticated. Landing/legal renamed so “Start free” is asserted as a visitor.
- **Studio stub is format-aware:** `/api/generate` returns schema-valid output per `target_format` so LinkedIn/Instagram/Email no longer fail invisibly.
**Visual regression deliberately deferred to Phase 8** — snapshot tests would fail on nearly every PR during a redesign that changes pixels by design, and would be rubber-stamped rather than read. `e2e/visual.spec.ts` is committed and skipped; Phase 8 un-skips it, generates Linux baselines, and makes it a hard CI gate.
- **CWV numeric gates:** Analytics/Speed Insights must be live on Vercel after merge. No numeric LCP/INP/CLS gate until traffic exists.
- **Later phases:** bump the CI line `bash scripts/ac-check.sh 0` to the active phase number when opening that phase’s PR.

## Human / Claude actions

| Who | Action |
|---|---|
| **You** | Review PR #61; confirm CI green (including Playwright); say `merge to main` when ready |
| **You (ops)** | Create the Supabase e2e test user and add `E2E_USER_EMAIL` / `E2E_USER_PASSWORD` to GitHub repo secrets. Confirm `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` are present. **(Done — prerequisites met before this amend.)** |
| **You** | After merge: confirm Vercel Analytics / Speed Insights receive traffic |
| **Claude** | Re-review amended PR against this brief; flag any harness false positives |
