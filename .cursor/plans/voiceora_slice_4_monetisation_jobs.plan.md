---
name: voiceora-slice-4-monetisation-jobs
overview: Clarify Dashboard next actions, Bundles as durable jobs with recoverable status, and Account/billing as a transparent usage and upgrade surface.
todos:
  - id: s4-dashboard
    content: Redesign Dashboard around next-best actions (continue, create, review, voice setup, limit/payment) instead of decorative metrics only.
    status: completed
  - id: s4-bundles
    content: Polish BundleWorkspace job states, progress copy, failure/retry, past-bundle list, and Library handoff; keep video behind existing feature flag.
    status: completed
  - id: s4-account
    content: Structure Account sections (Profile, Usage, Plans, Billing, Voice summary, Danger) with human plan names, remaining/reset clarity, contextual upgrade prompts.
    status: completed
  - id: s4-gates-upgrade
    content: Align UpgradePrompt / PhotoUpgradeGate / BundleUpgradeGate with one comparison language; payment-failed banner consistency.
    status: completed
  - id: s4-gates
    content: Desktop/mobile screenshots for dashboard, bundles, account, upgrade gates; open PR.
    status: completed
isProject: false
---

# Slice 4 — Monetisation & jobs (Dashboard + Bundles + Account)

Parent plan: [voiceora-product-quality_7100bba1.plan.md](voiceora-product-quality_7100bba1.plan.md)  
Depends on: [voiceora_slice_3_durable_work.plan.md](voiceora_slice_3_durable_work.plan.md)

**Goal:** Status, limits, and paid workflows feel Stripe/Vercel-clear. Bundles feel like first-class jobs, not a side form.

## In scope
### Dashboard
- Next-best-action orientation (activation, recent work, limits)
- Human-readable plan labels; usage that matches Account
- Keep ActivationBanner / empty states intentional

### Bundles
- Clear object model in UI: assets → context → generate → pack results → Library link
- Progress messages, errors, upgrade gates using system banners
- Past bundles list hierarchy and status
- Safe leave/return narrative for long runs (where architecture already supports status fetch)
- Video/clips remain behind `NEXT_PUBLIC_VIDEO_BUNDLES_DEV` — polish gated UI only; no premature prod un-gate

### Account & upgrades
- Section structure / scroll anchors already partially present — tighten visual hierarchy
- Used / remaining / reset period / bundle allowance when applicable
- Single UpgradePlans language reused by gates
- Payment failed: shell banner + Account remediation aligned
- Danger zone remains unmistakable but not visually chaotic

## Out of scope
- Changing Stripe price IDs or billing unit semantics (`generation_id`)
- Building Metronome-style metered billing
- Un-gating video bundles for production without explicit product approval
- Marketing site / auth redesign (Slice 5)
- Direct social publishing

## Key files
- [`app/(dashboard)/dashboard/page.tsx`](app/(dashboard)/dashboard/page.tsx)
- [`app/(dashboard)/dashboard/_components/*`](app/(dashboard)/dashboard/_components)
- [`app/(dashboard)/bundles/_components/BundleWorkspace.tsx`](app/(dashboard)/bundles/_components/BundleWorkspace.tsx)
- [`app/(dashboard)/bundles/_components/*`](app/(dashboard)/bundles/_components)
- [`app/(dashboard)/account/page.tsx`](app/(dashboard)/account/page.tsx)
- [`app/(dashboard)/account/_components/*`](app/(dashboard)/account/_components)
- [`components/billing/*`](components/billing)
- [`components/repurpose/upgrade-prompt.tsx`](components/repurpose/upgrade-prompt.tsx)
- [`lib/config.ts`](lib/config.ts) (copy alignment only)

## Acceptance criteria
- Dashboard answers “what should I do next?” in under 5 seconds
- Bundle generate → result → Library path is obvious
- Account shows generations (not tokens), remaining, and upgrade effect clearly
- No contradictory £44 vs £45 (or similar) plan copy across UI
- Upgrade gates feel like the same system as Account
- Desktop + mobile screenshots for the three surfaces + one upgrade gate

## Branch / PR
- Branch: `feat/ui-slice-4-monetisation-jobs`
- One PR into `main`; do not merge unless asked
---
