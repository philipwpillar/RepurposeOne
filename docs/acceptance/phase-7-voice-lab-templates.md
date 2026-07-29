# Phase 7 acceptance — Live Voice Lab + Studio templates

**Branch:** `cursor/phase-7-live-demo-plan`  
**Date:** 2026-07-29  
**Baseline:** `main` after Phase 8

## Gate command

```bash
bash scripts/ac-check.sh 7
bash scripts/ac-check.sh 8
bash scripts/ac-check.sh wave1
```

## What shipped

| Area | Evidence |
|---|---|
| Live demo API | `POST /api/voice-lab` calls `generateRepurpose()` — fast tier, `x_thread`, 4 tweets, `max_tokens` 400 |
| Caps | `VOICE_LAB_MAX_CHARS` (1500) enforced client + server |
| Rate limit | `voice_lab_hits` table; 5/hour, 20/day per salted IP hash; fail closed without IP |
| IP trust | Prefer `x-vercel-forwarded-for`, then `x-real-ip`, then `x-forwarded-for` (first hop) |
| Turnstile | Env-gated — verify when `TURNSTILE_SECRET_KEY` set; skip when unset (local/CI) |
| Privacy | Point-of-input notice + privacy policy section (DeepInfra, 48h IP-hash retention) |
| Honesty | Live label: “Generated live · sample voice, your text”; fallback restores honest label |
| Studio templates | `lib/repurpose/templates.ts`; `?template=` + “Try a template” chips; `?example=1` preserved |
| Sweeper | `purgeExpiredVoiceLabHits` step in sweep cron (48h retention) |
| Moderation | **Accepted for launch** — no filter; output visitor-only, nothing stored |

## Ops (before holding page down)

1. Set together on Vercel Production: `VOICE_LAB_IP_SALT` (`openssl rand -hex 32`), `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`.
2. Apply migration `20260729120000_voice_lab_hits.sql` manually.
3. **Preview IP-spoof check:** curl `/api/voice-lab` clean vs `-H "x-forwarded-for: 1.2.3.4"` — same `ip_hash` in `voice_lab_hits`.
4. Watch OpenRouter spend for 48h after public.

## Visual baselines

Regenerate if landing `#voice-lab` pixels changed:

```bash
gh workflow run visual-baselines.yml --ref <branch>
```

Use `mcr.microsoft.com/playwright:v1.62.0-noble` only.

## Out of scope

- Multi-format demo, visitor voice samples, save-demo-to-account, streaming demo
- Waves 2–3, holding-page / Auth / Stripe / iOS ops
