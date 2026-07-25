---
name: voiceora-phase-0-instrumentation
overview: Thin instrumentation — Analytics, Speed Insights, Playwright (≥3 specs + visual), commit ac-check.sh, wire CI. Makes Phases 1–7 falsifiable.
todos:
  - id: harness
    content: Commit scripts/ac-check.sh from Claude v3
    status: pending
  - id: analytics
    content: Add @vercel/analytics + @vercel/speed-insights to root layout
    status: pending
  - id: playwright
    content: Install Playwright; ≥3 e2e specs; ≥1 toHaveScreenshot; config + npm scripts
    status: pending
  - id: ci
    content: Wire ac-check floor+0 and playwright into .github/workflows/ci.yml
    status: pending
  - id: acceptance
    content: docs/acceptance/phase-0-instrumentation.md; bash scripts/ac-check.sh 0 green
    status: pending
isProject: false
---

# Phase 0 — Thin instrumentation

Parent: [voiceora_quality_push_a80dd471.plan.md](/Users/philipwpillar/.cursor/plans/voiceora_quality_push_a80dd471.plan.md)

**Branch:** `feat/ui-quality-instrumentation-thin`

## In scope
- `scripts/ac-check.sh` (Claude v3 harness)
- `@vercel/analytics` + `@vercel/speed-insights` in `app/layout.tsx`
- `@playwright/test`; `playwright.config.ts`; ≥3 `e2e/*.spec.ts`; ≥1 `toHaveScreenshot`
- CI appends AC harness (`floor` + `0`) + Playwright — do not duplicate `build`
- `docs/acceptance/phase-0-instrumentation.md`

## Out of scope
- Sentry (Phase 8)
- Expanding e2e to authenticated Studio flows that need secrets (minimal public-route smoke is enough for Phase 0 gates)
- Any product UI redesign

## Mechanical gate
```bash
bash scripts/ac-check.sh 0   # must PASS (includes floor)
```

## Human / Claude actions after PR
- You: review PR, confirm Vercel deploy picks up Analytics/Speed Insights (dashboard should show traffic after merge)
- You: merge only when ready (say "merge to main")
- Claude: optional review of whether the 3 public-route specs are sufficient baselines for later phase e2e expansion
