# Phase 1 acceptance — quick wins + shareability

**Branch:** `feat/ui-quality-quickwins`  
**Baseline:** `f2cc5a8` (main after Phase 0 + ripgrep CI fix)  
**Date:** 2026-07-25

## Gate command

```bash
bash scripts/ac-check.sh 1
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
── PHASE 1 ──
  PASS  og-pack files present                  6 ge 6
  PASS  metadataBase set                       1 ge 1
  PASS  raw <img> outside allowlist            0 eq 0
  PASS  next/image imported                    2 ge 2
  PASS  images.remotePatterns configured       1 ge 1
  PASS  asChild+disabled removed               0 eq 0
  PASS  format-card opacity-50 removed         0 eq 0
  PASS  :has() layout hack removed             0 eq 0
  PASS  empty <CardContent /> removed          0 eq 0
  PASS  skeleton animate-pulse removed         0 eq 0
  PASS  skeleton shimmer added                 4 ge 1
  PASS  coarse-pointer targets added           3 ge 1
  PASS  auth pages expose a real h1            3 ge 2
  PASS  e2e asserts sign-up heading role       1 ge 1
  PASS  acceptance note committed              1 eq 1

RESULT: PASS
```

## What shipped

| Area | Evidence |
|---|---|
| Step 0 | CI grades `ac-check.sh 1` |
| A1–A9 | Dashboard CTA honesty; format cards collapse when deselected; dual mobile/desktop headers; studio full-bleed via pathname; error CardContent removed; coarse-pointer 44px; avatars via `next/image` + `remotePatterns`; shimmer skeletons; real `<h1>` on auth/onboarding (+ awaitingEmail) |
| B | `opengraph-image`, `twitter-image`, `icon`, `apple-icon`, `robots`, `sitemap`, `metadataBase` |
| Harness | `run_1` gained auth `<h1>` + e2e heading-role asserts only |

## Permanent exception lists (unchanged)

**Raw hex allowlist:** `app/globals.css`, `app/global-error.tsx`, `app/loading.tsx`, `components/landing/vo-logo-mark.tsx`, `components/auth/google-sign-in-button.tsx`, `app/dev/**`

**Raw `<img>` allowlist:** `BundlePhotoPicker`, `BundleVideoPicker`, `BundleWorkspace`, `PhotoPreviewCard`, `app/dev/**`

## Out of scope (honoured)

- No edits to `RepurposeWorkspace.tsx`, `app/landing.css`, `lib/`, `app/api/`
- No Phase 2 token/hex unification; existing auth hex literals left in place
- `scripts/ac-check.sh` changed only inside `run_1()`

## Human / Claude actions

| Who | Action |
|---|---|
| **You (ops)** | Set Vercel env `NEXT_PUBLIC_SITE_URL` to the current deployment URL (default in code is the Vercel domain, not `voiceora.io`) |
| **You** | Review screenshots + CI; say `merge to main` when ready |
| **Claude** | Confirm harness diff is `run_1` only; spot-check A2/A7/A9 additions |
