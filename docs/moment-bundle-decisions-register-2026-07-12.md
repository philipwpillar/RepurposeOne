# Moment Bundle — Decisions Register (v1, 2026-07-12)

Settled decisions amending/confirming `docs/plans/moment-bundle-implementation-plan.md`. All subsequent briefs cite this register. None of these are open for relitigation in implementation sessions.

## Product decisions (Phil)
| # | Decision |
|---|----------|
| D1 | Bundle = add-on surface; single-input studio remains primary |
| D2 | Photo outputs = user's own photos + generated captions; no image generation |
| D3 | Rendered clips in-app: Voiceora cuts and finishes (trim, static styled caption burn, encode) |
| D4 | Gating: new **Pro Plus** tier ~£59/mo (display name provisional — internal enum `pro_plus` is final regardless of display name) |
| D5 | Rendered clip retention: **30 days** for media files. Clip metadata (caption, overlay text, tags, timing) retained until account deletion (`bundle_clips.user_id` ON DELETE CASCADE). Metadata is not sufficient to reconstruct the video. |
| D6 | GDPR track handled separately (options per plan §9 risk 5); does not block Briefs 0a/0b/1a; gates first vision-call beta |

## Numbers (Phil-approved 2026-07-12)
| # | Value |
|---|-------|
| N1 | `PLAN_LIMITS.pro_plus` = **1000** generations/month (matches Pro — a higher tier never has fewer) |
| N2 | **Bundle cap: 30 bundles/month** for Pro Plus — separate counter, `COUNT` on `bundles` by user + month (mirrors `count_monthly_generations` semantics; failed-analysis bundles not counted, consistent with existing not-billed rule) |
| N3 | Rate limit becomes plan-aware: `maxRequests` **20 per 10 min for `pro_plus`**, all other plans unchanged at 10. Per-row counting semantics untouched. |
| N4 | Video caps: **≤180s duration** (primary gate) + **≤500MB** size ceiling. Duration: client metadata + worker probe backstop. Size: signed-upload route. Oversize client error must instruct "export at 1080p and retry". |
| N5 | Photos ≤8/bundle, videos ≤2/bundle, voice ≤300s/25MB (per plan §2, unchanged) |

## Architecture decisions (Claude-recommended, Phil-approved)
| # | Decision |
|---|----------|
| A1 | **Two-stage generation pipeline**: stage 1 = one vision call per video (own frames only → candidate moments) + one vision call for the photo set; stage 2 = text-only synthesis call (STRONG tier, no images) producing the final pack (captions, posting order, clip specs, platform posts input). Eliminates per-call image limits by construction. All calls share one `generation_id`. Frame budget: ~30–40 frames/video default; spike confirms ceiling. |
| A2 | Bundle surface lives at top-level **`app/(dashboard)/bundles/`** — flat sibling to studio/history/brand-voice/upgrade, inheriting the dashboard shell. Not nested under studio. |
| A3 | Worker: Railway; job dispatch: DB poll ~5s + optional authenticated wake; client observation: HTTP polling 2–3s v1 (per plan §5–6, accepted) |
| A4 | Data model per plan §1 accepted, plus the N2 bundle counter |
| A5 | ASR: **withdrawn (2026-07-23, PR #46)**. Server-side `/api/transcribe` removed. Bundle `context` uses OS/keyboard native dictation (no audio to Voiceora backend). Brief 4 withdrawn. |

## Standing constraints (every brief)
- Protected fence in `RepurposeWorkspace.tsx` (ratified 2026-07-23; **floor re-spec proposed 2026-07-30, pending Phil ratification**): `GenerateApiError`, `PhotoGenerateApiError`, `callGenerateApi`, `callPhotoGenerateApi`, `resolveGenerateError`, and usage sync via `setUsedCount(apiErr.usage.used)` / success `setUsedCount(usage.used)`. Round-1 consolidated the former two literal `setUsedCount(err.usage.used)` branches into `resolveGenerateError` — behavior preserved. Verification uses **floors at current counts** (`ge 8` / `ge 3` / etc. in `scripts/ac-check.sh`) so UI additions around the fence do not break the gate, while deletions of usage-sync or error classes still fail. Exact `setUsedCount(apiErr.usage.used)` eq 1 and zero matches for obsolete `setUsedCount(err.usage.used)`. See `docs/acceptance/studio-fence-spec.md`.
- Two-push gate: feature branch + PR, no merge; Claude verifies via fresh clone before Phil's go-ahead.
- Sequencing: **Stripe live-mode activation precedes all implementation briefs.** Brief 0a may be executed by Cursor in parallel with Phil's Stripe afternoon only because it is revenue-adjacent plumbing with zero product surface.

## Wave 2 decisions (2026-07-29)

| # | Decision |
|---|----------|
| W2-1 | **Child Mode — cancelled** (not deferred). UK Age Appropriate Design Code applies to the whole service once under-16s are knowingly served; a PIN is not GDPR Article 8 parental consent; audience is founders/creators, not minors. No `profiles.child_mode`, PIN storage, or content-filter scaffolding. |
| W2-2 | **X / Twitter sign-in — deferred** with trigger: revisit in **Wave 4** when X publishing needs a developer app. Blocker: X OAuth does not reliably return email; Supabase requires email (`profiles.email`, Stripe, OTP, deletion, payment-failed banner all load-bearing). |
