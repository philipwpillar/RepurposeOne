# Phase 8 acceptance — Sentry + visual regression

**Branch:** `feat/phase-8-sentry-visual`  
**Date:** 2026-07-29  
**Baseline:** `main` after Wave 1 (`0520bf2`)

## Gate command

```bash
bash scripts/ac-check.sh 8
```

## What shipped

| Area | Evidence |
|---|---|
| Sentry | `@sentry/nextjs`; `sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`; `instrumentation.ts` + `instrumentation-client.ts`; `withSentryConfig` in `next.config.ts` |
| Capture points | `app/global-error.tsx`; generate / stream / bundle-generate unexpected failure paths |
| Visual project | `playwright.config.ts` project `visual` (empty storageState); chromium `testIgnore` includes `visual.spec.ts` |
| Visual specs | Four un-skipped screenshots: landing 1440, landing 390, sign-in, privacy |
| Linux baselines | Generated + committed via `mcr.microsoft.com/playwright:v1.62.0-noble` (same image as CI `visual` job) |
| CI | `ac-check.sh 8`; functional projects exclude visual; dedicated containerized `visual` job runs `e2e/visual.spec.ts` |

## Ops (you — after merge)

1. Create a Sentry project (Next.js) and set on Vercel: `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_DSN`.
2. Optional source maps: `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`.
3. Confirm a deliberate test error appears in Sentry (e.g. throw in a temporary route, or trigger a known API failure).
4. Do **not** set `HOLDING_MODE` in the visual CI job (already unset).

## Regenerating baselines

When landing/sign-in/privacy pixels change intentionally:

```bash
gh workflow run visual-baselines.yml --ref <branch>
# wait, then:
gh run download <run-id> -n visual-linux-baselines
# copy *-linux.png into e2e/visual.spec.ts-snapshots/ and commit
```

Never generate baselines on macOS or bare `ubuntu-latest` Chromium — fonts will not match the container.

## Out of scope

- Phase 7 (Voice Lab / templates)
- Holding-page takedown / Auth / Stripe / iOS ops
- Audit tail M2 / M5 / L1 / L2

## Human / Claude

| Who | Action |
|---|---|
| **You** | Set Sentry DSN on Vercel after merge |
| **You** | Review CI `visual` job green; say `merge to main` when ready |
| **Claude** | Confirm `visual.spec.ts` string appears in `ci.yml` (gate) |
