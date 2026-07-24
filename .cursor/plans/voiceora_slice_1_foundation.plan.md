---
name: voiceora-slice-1-foundation
overview: Establish the redesign baseline, unify Voiceora’s design system, and refine app chrome/IA so every later slice can build on one coherent foundation.
todos:
  - id: s1-baseline
    content: Inventory key UI states, capture desktop/mobile baselines, and write the redesign contract (principles, density, MVP scope guards).
    status: pending
  - id: s1-known-fixes
    content: Fix known inconsistencies (Library/History naming, pricing copy alignment, remove dead notification control or stub cleanly, Font Awesome assumptions).
    status: pending
  - id: s1-tokens
    content: Unify globals.css and landing.css tokens (ink/paper, aurora, semantic success/warning/danger, radius/spacing/motion).
    status: pending
  - id: s1-primitives
    content: Extend shared UI primitives (Button usage, Dialog, Checkbox, Tabs, Toast/status) and replace unsupported Font Awesome with Lucide + platform SVGs.
    status: pending
  - id: s1-shell
    content: Refine DashboardShell — active states, usage presentation, skip link/landmarks, mobile drawer, page-header conventions.
    status: pending
  - id: s1-gates
    content: Add minimal lint/typecheck-safe fixtures and document slice acceptance criteria; open PR for review.
    status: pending
isProject: false
---

# Slice 1 — Foundation (system + shell)

Parent plan: [voiceora-product-quality_7100bba1.plan.md](voiceora-product-quality_7100bba1.plan.md)

**Goal:** One Voiceora visual and interaction system, plus a calm, correct app shell. No deep Studio/Bundles/marketing rewrites in this slice.

**Do not start Slice 2 until this PR is accepted on desktop + mobile.**

## In scope
- Baseline inventory of key states (landing, auth, onboarding, dashboard, studio, library, brand voice, account, empty/loading/error)
- Short redesign contract in docs (principles, density, MVP scope: no scheduling/publishing/teams/analytics)
- Token unification between [`app/globals.css`](app/globals.css) and [`app/landing.css`](app/landing.css)
- Shared primitives under [`components/ui`](components/ui) — add Dialog, Checkbox, Tabs (or stabilize existing custom tabs), toast/status pattern
- Single icon system: Lucide + [`components/landing/platform-marks.tsx`](components/landing/platform-marks.tsx); remove `fas`/`fab` usage where touched
- Shell polish in [`app/(dashboard)/_components/dashboard-shell.tsx`](app/(dashboard)/_components/dashboard-shell.tsx)
- Naming: Library page title matches nav; plan labels human-readable (e.g. Pro Plus not `Pro_plus`)
- Remove or hide no-op notification bell
- Global `prefers-reduced-motion` for app transitions (landing already has it)

## Out of scope
- Studio workflow rebuild
- Brand Voice / Library / Bundles UX overhaul
- Marketing proof content
- Auth/onboarding visual rewrite (light token adoption only if cheap)
- Full Playwright suite (add only smoke/fixtures if needed)

## Key files
- [`app/globals.css`](app/globals.css)
- [`app/landing.css`](app/landing.css)
- [`app/layout.tsx`](app/layout.tsx)
- [`app/(dashboard)/_components/dashboard-shell.tsx`](app/(dashboard)/_components/dashboard-shell.tsx)
- [`components/ui/*`](components/ui)
- [`docs/PRODUCT_SPEC.md`](docs/PRODUCT_SPEC.md) (decision log / scope guard)

## Acceptance criteria
- Ink/paper/aurora tokens match across marketing and app (no divergent navy/paper)
- Page titles use consistent typography scale (`font-display` or agreed heading style)
- No broken Font Awesome icons on surfaces touched in this slice
- Shell: skip link, clear active nav, usable mobile drawer, no dead notification control
- Library/History naming consistent
- `npm run lint` + `npm run typecheck` pass
- Screenshots: dashboard + brand-voice + studio shell chrome at desktop and ~390px mobile

## Branch / PR
- Branch: `feat/ui-slice-1-foundation`
- One PR into `main`; stop after push + PR link — do not merge unless asked
---
