# Phase 6 acceptance — Mobile UX + voiceora.io cutover

**Branch:** `feat/phase-6-mobile-ux`  
**Date:** 2026-07-28

## Gate command

```bash
bash scripts/ac-check.sh 6
```

## What shipped

| Area | Evidence |
|---|---|
| Domain cutover | `capacitor.config.ts` `server.url` → `https://voiceora.io`; site URL fallbacks in `app/layout.tsx`, `sitemap.ts`, `robots.ts`; `.env.example` documents `NEXT_PUBLIC_SITE_URL` |
| HSTS | `next.config.ts` adds `preload` after domain cutover |
| BottomTabs | `components/bottom-tabs.tsx` — Home / Studio / Bundles / Library; wired in `dashboard-shell.tsx` (`md:hidden`) |
| Haptics | `@capacitor/haptics` + `lib/haptics.ts`; wired on BottomTabs, copy, share, Studio generate |
| Manifest | `app/manifest.ts` (Web App Manifest) |
| Studio safe-area | Action bar clears BottomTabs + `env(safe-area-inset-bottom)` on mobile; desktop uses safe-area padding |
| iOS SPM | `cap sync` added CapacitorHaptics to `ios/App/CapApp-SPM/Package.swift` |
| CI | Ratcheted to `ac-check.sh 6` |

## Ops (you)

1. Attach custom domain `voiceora.io` to the Vercel production project (and TLS).
2. Set Vercel env `NEXT_PUBLIC_SITE_URL=https://voiceora.io`.
3. Update Supabase Auth redirect allowlist / Site URL to `https://voiceora.io`.
4. Update Stripe Checkout success/cancel domains if they were pinned to the Vercel preview host.
5. Rebuild the iOS app in Xcode after merge so Capacitor picks up the new `server.url` + Haptics plugin (`npx cap sync ios` if needed).

## Out of scope (honoured)

- Google OAuth native fix (MOBILE.md Phase 1)
- Top-right account dropdown (Wave 2)
- Push / share extension / IAP (later mobile phases)
- Wave 1 prompt/copy work

## Human / Claude

| Who | Action |
|---|---|
| **You (ops)** | Complete domain + env allowlists above before relying on the Capacitor shell |
| **You** | Review CI; say `merge to main` when ready |
| **Claude** | Web gates only — Phil confirms iOS binary in Xcode |
