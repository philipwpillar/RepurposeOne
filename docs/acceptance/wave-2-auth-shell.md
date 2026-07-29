# Wave 2 acceptance — Auth and shell

**Branch:** `feat/wave-2-auth-shell`  
**Date:** 2026-07-29  
**Baseline:** `main` @ `64ef896` (Phase 7 merged)

## Gate command

```bash
bash scripts/ac-check.sh floor
bash scripts/ac-check.sh 7
bash scripts/ac-check.sh 8
bash scripts/ac-check.sh wave1
bash scripts/ac-check.sh wave2
```

## What shipped

| Area | Evidence |
|---|---|
| Email OTP signup | 6-digit `verifyOtp` + resend in [`auth-form.tsx`](components/auth/auth-form.tsx); `emailRedirectTo` kept so ConfirmationURL still works |
| Google OAuth web | Existing button; enabled via `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED` |
| Google OAuth native (infra) | `@capacitor/browser` + `@capacitor/app` (dynamic import), `appUrlOpen` handler, `CFBundleURLTypes` in Info.plist |
| Native guards | Google **hidden on iOS** until Phil verifies Xcode flow — not a dead button |
| Account menu | Radix dropdown, `md:`-only top bar; mobile drawer avatar unchanged |
| Child Mode | **Cancelled** — recorded in decisions register |
| X sign-in | **Deferred to Wave 4** — email load-bearing |

## Native OAuth notes (remote webview)

Capacitor uses `server.url: https://voiceora.io` — the app is a remote webview, not a bundled build.

- PKCE verifier is written by `signInWithOAuth` inside the webview; exchange must happen there (`exchangeCodeForSession` + `router.refresh()`), not via [`app/auth/callback/route.ts`](app/auth/callback/route.ts).
- `@supabase/ssr` `createBrowserClient` stores session in cookies on `voiceora.io`.
- Redirect is the bare URL `com.voiceora.io://auth/callback` (no `?next=`); post-auth path is held in module scope.
- Capacitor plugins are **dynamic-imported** so public `/sign-in` / `/sign-up` never statically pull native packages into the web bundle.
- `NativeOAuthListener` mounts only inside [`AuthShell`](components/auth/auth-shell.tsx) — lifetime is tied to auth routes. Fine today (`Browser.open` presents over the auth screen); revisit if OAuth can start from a non-auth surface.
- `HOLDING_MODE` may intercept native tests — not a bug.

## Ops checklist (Phil — do not attempt in Cursor)

### Google sign-in

1. Google Cloud OAuth consent screen → client ID + secret
2. Supabase → Authentication → Providers → Google
3. Vercel: `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED=true` (Production when ready)

### Native deep link (after web Google works)

1. Confirm `CFBundleURLTypes` in [`ios/App/App/Info.plist`](ios/App/App/Info.plist) (committed)
2. Supabase redirect allowlist: bare `com.voiceora.io://auth/callback` (no query string)
3. `npx cap sync ios` + pod install + Xcode rebuild
4. Verify Google flow in Xcode; **then** remove native guards in `auth-form.tsx` and `google-sign-in-button.tsx`

### Email OTP

1. Supabase → Email Templates → Confirm signup: include **both** `{{ .Token }}` (6-digit code for the UI) **and** `{{ .ConfirmationURL }}` (link fallback via `emailRedirectTo`)
2. **SMTP on `support@voiceora.io` configured but not verified E2E** — test before holding page down

## Verification

```bash
npm run typecheck && npm run lint && npm run contrast-check
npx playwright test --project=anon e2e/auth-guard.anon.spec.ts
```

Regenerate visual baselines via `visual-baselines.yml` on `mcr.microsoft.com/playwright:v1.62.0-noble` if top bar pixels changed. (Not needed for Wave 2 — visual spec covers landing/sign-in/privacy only.)

## Out of scope

- Child Mode / X sign-in
- Wave 3
