# Phase 0 acceptance — instrumentation

**Branch:** `feat/ui-quality-instrumentation-thin`  
**HEAD baseline compared against:** `e1d1b22`  
**Date:** 2026-07-25

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
  PASS  e2e specs present                      3 ge 3
  PASS  visual snapshot spec                   1 ge 1
  PASS  CI runs the AC harness                 2 ge 1
  PASS  CI runs playwright                     2 ge 1
  PASS  acceptance note committed              1 eq 1

RESULT: PASS
```

## What shipped

| Item | Evidence |
|---|---|
| AC harness | `scripts/ac-check.sh` |
| Vercel Analytics + Speed Insights | `app/layout.tsx` imports + `package.json` |
| Playwright | `@playwright/test`, `playwright.config.ts`, `e2e/landing.spec.ts`, `e2e/legal.spec.ts`, `e2e/visual.spec.ts` |
| Visual assertion present | `toHaveScreenshot` in `e2e/visual.spec.ts` |
| CI runs AC harness | `.github/workflows/ci.yml` steps `ac-check.sh floor` and `ac-check.sh 0` |
| CI runs Playwright | `.github/workflows/ci.yml` runs landing + legal specs after build |

## Notes / follow-ups (not Phase 0 blockers)

- **Visual baselines:** a Darwin snapshot is committed under `e2e/visual.spec.ts-snapshots/` for local runs. CI currently runs **functional** specs only (`landing` + `legal`) because Linux pixel baselines were not generated in this environment (no Docker). Phase 8 (or a small follow-up once a Linux runner artifact exists) should commit `*-chromium-linux.png` baselines and flip CI to include `e2e/visual.spec.ts`.
- **CWV numeric gates:** Analytics/Speed Insights must be live on Vercel after merge. No numeric LCP/INP/CLS gate until traffic exists — do not mark CWV “within budget” until numbers are readable in the Vercel dashboard.
- **Later phases:** bump the CI line `bash scripts/ac-check.sh 0` to the active phase number when opening that phase’s PR.

## Human / Claude actions

| Who | Action |
|---|---|
| **You** | Review PR; confirm CI green; after merge, open Vercel → Analytics / Speed Insights and confirm data arrives |
| **You** | Say `merge to main` when ready (Cursor will not merge unprompted) |
| **Claude** | Optional: review whether public-route smoke specs are enough scaffolding for Phase 4 stream e2e; flag any harness false positives after Phase 0 lands on `main` |
| **You (ops)** | No Sentry account needed yet (Phase 8). No Supabase/OAuth changes in this phase. |
