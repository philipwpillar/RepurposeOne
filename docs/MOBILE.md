# MOBILE.md — Voiceora

> **Living document.** Scope, architecture, and roadmap for the native mobile app.
> Grok owns strategic direction; Claude (Cursor) owns implementation. Update this file whenever a decision is made.
> **Claude's verification role is limited to the web/TypeScript layer** — iOS binary builds require Xcode and are confirmed by Phil.
> Last updated: 2026-07-03

---

## 1. Why native

Target users (creators, marketers, founders) live inside mobile apps — X, Instagram, TikTok. A native shell puts Voiceora on the home screen, enables a **share extension** (repurpose content straight from another app's share sheet), and unlocks **push notifications** for generation-complete events. iOS first; Android deferred until iOS is proven.

This is an initiative on top of the live web product. It must **not** slow the revenue path (Stripe, output quality, conversion). Mobile work stays in the mobile lane: no changes to `lib/usage.ts`, Stripe files, or AI-prompt files as part of shell work.

---

## 2. Architecture decisions (LOCKED)

| Decision | Choice | Rationale |
| --- | --- | --- |
| Wrapper | **Capacitor 8** (SPM, **not** CocoaPods) | Thin native shell over the existing web app; no second frontend to maintain |
| Load strategy | **Remote-URL mode** — `server.url` → live Vercel site | One codebase; the app always shows production. No bundled static export in v1 |
| Push | **OneSignal** (over raw APNs), **generation-complete only** | Managed APNs, simpler tokens; notifications limited to "your content is ready" — no marketing spam in v1 |
| Payments | **Safari-handoff to web Stripe Checkout** — no Apple IAP | Avoids Apple's 30% cut and IAP integration. See §5 review risk |
| Share extension | **In v1** | Core value: repurpose from any app's share sheet |
| Android | **Deferred** post-iOS | Prove demand on one platform first |
| Bundle ID | `com.voiceora.app` | — |
| Display name | **Voiceora** | — |

---

## 3. Current state

| Commit | What | Status |
| --- | --- | --- |
| `69c3c16` | Capacitor iOS shell loading live production site | Pushed, web gates pass, `xcodebuild` succeeded (Phil) |
| `bd29434` | Safe-area fix (viewport `viewport-fit=cover` + `env(safe-area-inset-*)` on `body`) | Pushed, deployed to Vercel (`viewport-fit=cover` confirmed live) |

Scaffold is a stock Capacitor shell: `AppDelegate.swift` unmodified, **no** Push / App Groups / entitlements, default Capacitor icon + splash placeholders. Xcode entry point is `ios/App/App.xcodeproj` (no `.xcworkspace`, no `Podfile`).

Verified web-layer: `tsc --noEmit` clean, `next build` clean (pre-existing `<img>` warning only), 27 files / +1580 −15 vs `0f266ef`, no forbidden files touched.

---

## 4. Phased roadmap

Phase numbers describe intended sequencing, not commitments to bundle everything in a phase into one brief.

- **Phase 0 — Shell (DONE):** Capacitor scaffold + safe-area fix.
- **Phase 1 — Make it usable:** Google OAuth fix (sign-in is broken in the default WKWebView — see §5), then app chrome (custom icon, splash, optional native tab bar).
- **Phase 2 — Monetise:** Safari-handoff to Stripe Checkout so users can subscribe from the app.
- **Phase 3 — Engagement:** OneSignal push (generation-complete), share extension, and **"Open in Platform" deep links** (confirmed Phase 3 — not earlier).

**Open sequencing decision:** Phase 1 mobile brief **vs. privacy-policy page first.** A privacy policy is a prerequisite before any "private/secure" claims can appear in App Store copy, given data flows through OpenRouter and Supabase. Recommend resolving before the next brief.

---

## 5. Constraints & gotchas

1. **Free Apple ID limits.** Do **not** add Push Notifications or App Groups capabilities until a **paid** Apple Developer account exists — they break builds on a Personal Team. Push (Phase 3) is gated on enrollment.
2. **Remote-URL mode.** The simulator/app shows whatever is deployed at `repurpose-one-seven.vercel.app`. Local web changes are invisible until pushed **and** deployed. Any WebView-facing fix (like safe-area) lands in the **web app**, not native files.
3. **Google OAuth breaks in the default WKWebView.** Google blocks OAuth in embedded webviews; sign-in needs an in-app-browser / `ASWebAuthenticationSession` fix (Phase 1) before the app is usable for new users.
4. **Capacitor 8 uses SPM.** Open `App.xcodeproj`, not `App.xcworkspace`; there is no `Podfile`. CocoaPods is installed on Phil's Mac for future briefs that may need it, but this project doesn't use it.
5. **App Store review risk (payments).** The Safari-handoff / no-IAP model must be validated against **current** Apple review rules (external-purchase / anti-steering guidelines change frequently and vary by region). Confirm the current entitlement/allowance before submission — do not assume the handoff will pass review as-is.

---

## 6. Critical-path items

- **Apple Developer Program enrollment** — $99/yr, individual. Required for push, TestFlight, and App Store submission. Start early; enrollment can take days.
- **Privacy policy page** — see §4. Blocks App Store copy claims about privacy.
- **App icon** — a real icon is a hard submission requirement (see branding decision, tracked separately).

---

## 7. Verification split

| Layer | Owner | Method |
| --- | --- | --- |
| Web / TypeScript (anything behind `server.url`) | Claude | Fresh clone → confirm SHA → scope diff → `tsc --noEmit` + `next build` |
| iOS binary / simulator / WebView runtime | Phil | Xcode: `xcodebuild`, ⌘R, visual check |

Claude cannot build or run the iOS binary. "Web gates pass" never implies the native app was tested.
