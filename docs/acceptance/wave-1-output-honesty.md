# Wave 1 acceptance — output honesty + em-dash hygiene

**Branch:** `feat/wave1-output-honesty`  
**Date:** 2026-07-28  
**Baseline:** `main` after Phase 6 merge (`b4511ad`)

## Gate command

```bash
bash scripts/ac-check.sh wave1
```

## Results (recorded at PR-ready)

```
── WAVE 1 ──
  PASS  prompts free of em/en dashes
  PASS  stripEmDashes in ai layer
  PASS  stream stripEmDashes partial+final
  PASS  bundle copy not four-platform-posts
  PASS  acceptance note committed
```

## What shipped

| Area | Evidence |
|---|---|
| Prompt hygiene | All `—` / `–` / `―` removed from `lib/ai/prompts.ts`; shared `PUNCTUATION_RULE` on Studio + bundle systems |
| Sanitiser | `lib/ai/strip-em-dashes.ts` → `stripEmDashes()` / `stripEmDashesFromString()` |
| Studio paths | Applied after Zod validate in `generateRepurpose`, `generateRepurposeFromImage`, `completeOpenRouterJson` |
| Streaming | `app/api/generate/stream/route.ts`: every `partial` + final `done` + `onFinish` DB write |
| Exemplars | Stripped before few-shot injection (`lib/ai/exemplars.ts`) so past outputs cannot re-teach dashes |
| Email | Explicit ban on image captions / alt-text / "Image:" media labels; signatures already banned |
| Copy honesty | Bundle upgrade gate + workspace; plan catalog + upgrade prompt say **photo packs**; dashboard CTA copy names X/LinkedIn/Instagram/email. Landing/OG had no video claims. Privacy retention wording for clips left (legal, not marketing). |
| Gates | `run_wave1()` in `scripts/ac-check.sh`; CI runs `wave1` after phase 6 |

## Explicitly not in this PR (ops / later)

- Supabase Auth site URL / redirect allowlist
- Stripe redirect URL confirmation
- iOS Xcode rebuild after merge
- SMTP / Railway / credential rotation / streaming flag decision
- Audit tail (still tracked, not closed here): **M2** clip insert fail-closed, **M5** bundle rate limit, **L1** wake compare, **L2** soft limits

## Human / Claude

| Who | Action |
|---|---|
| **You** | Spot-check a streamed Studio generate — em dashes must not flash then vanish mid-stream |
| **You** | Say `merge to main` when CI is green |
| **Claude** | Web gates only |
