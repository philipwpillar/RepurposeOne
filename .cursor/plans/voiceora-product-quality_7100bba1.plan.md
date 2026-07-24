---
name: voiceora-product-quality
overview: Raise Voiceora from a functional MVP to a cohesive, premium creator product through a staged redesign of its design system, core creation loop, supporting product surfaces, marketing journey, and quality controls. The direction will be evidence-led from 112 current references while preserving Voiceora’s distinctive navy/aurora identity and existing MVP scope.
todos:
  - id: baseline-contract
    content: Inventory all UI states, establish measurable baselines, and resolve the redesign contract and known inconsistencies.
    status: pending
  - id: design-system
    content: Unify tokens, typography, icons, motion, responsive rules, and reusable components with review fixtures.
    status: pending
  - id: shell-navigation
    content: Refine global app chrome, IA, accessibility landmarks, and web/Capacitor mobile navigation.
    status: pending
  - id: studio-core-loop
    content: Rebuild the source-to-results Studio experience with progressive status, inline editing, recovery, and responsive previews.
    status: pending
  - id: supporting-workspaces
    content: Redesign Brand Voice, Library, Bundles, and Dashboard around durable objects and next-best actions.
    status: pending
  - id: account-onboarding
    content: Complete Account, billing, auth, and learn-by-doing onboarding using the unified system.
    status: pending
  - id: marketing-proof
    content: Strengthen marketing hierarchy, real product proof, pricing clarity, trust content, and mobile polish.
    status: pending
  - id: quality-release
    content: Add automated visual, interaction, accessibility, and performance gates and release the redesign in validated slices.
    status: pending
isProject: false
---

# Voiceora Product-Quality Redesign

## Execution: five vertical slices (do not run all at once)

Walk through and ship one slice at a time. Do not start the next until the previous PR is reviewed on desktop + mobile.

| Slice | Plan | Branch |
|---|---|---|
| 1. Foundation | [voiceora_slice_1_foundation.plan.md](voiceora_slice_1_foundation.plan.md) | `feat/ui-slice-1-foundation` |
| 2. Studio core loop | [voiceora_slice_2_studio.plan.md](voiceora_slice_2_studio.plan.md) | `feat/ui-slice-2-studio` |
| 3. Durable work | [voiceora_slice_3_durable_work.plan.md](voiceora_slice_3_durable_work.plan.md) | `feat/ui-slice-3-durable-work` |
| 4. Monetisation & jobs | [voiceora_slice_4_monetisation_jobs.plan.md](voiceora_slice_4_monetisation_jobs.plan.md) | `feat/ui-slice-4-monetisation-jobs` |
| 5. Acquisition | [voiceora_slice_5_acquisition.plan.md](voiceora_slice_5_acquisition.plan.md) | `feat/ui-slice-5-acquisition` |

Quality gates (a11y, CWV, screenshots) attach to **every** slice — they are not a sixth delayed phase.

## Product direction
Voiceora should feel like a focused creator studio—not an AI chat box or a dense enterprise dashboard. Preserve the navy, pale canvas, aurora gradient, Space Grotesk/Inter typography, and honest tone, but express them through one system across marketing, auth, onboarding, web app, and Capacitor mobile.

The 112-product benchmark covered social platforms (16), creator/repurposing tools (24), AI products (20), productivity tools (16), enterprise design systems (12), developer SaaS (12), and exemplary marketing sites (12). The most transferable references are Buffer and Typefully for low-friction creator workflows; Canva, Descript, and OpusClip for source-to-many creation; Linear, Notion, and Figma for calm hierarchy and contextual controls; Stripe and Vercel for status/billing clarity; and Material 3, Fluent 2, Carbon, Spectrum, Polaris, and Primer for accessible component behavior. Native social products inform preview fidelity, not Voiceora’s overall architecture.

## 1. Establish the quality baseline and redesign contract
- Capture every public, auth, onboarding, dashboard, Studio, Bundles, Library, Brand Voice, Account, loading, empty, error, upgrade, and mobile state at agreed desktop/tablet/mobile widths.
- Record UX defects and measurable baselines: task completion, time to first usable output, responsive failures, Core Web Vitals, accessibility, and visual consistency.
- Write a concise UI specification covering principles, density, content hierarchy, responsive behavior, motion, component states, and acceptance criteria. Preserve current product boundaries: no scheduling, direct publishing, teams, or analytics expansion.
- Resolve known inconsistencies before visual work: Library/History naming, pricing copy, obsolete routes/docs, broken Font Awesome assumptions, no-op notification control, browser alerts/confirms, and unfinished Studio Edit actions.

Key areas: [`app/globals.css`](app/globals.css), [`app/landing.css`](app/landing.css), [`app/(dashboard)/_components/dashboard-shell.tsx`](app/(dashboard)/_components/dashboard-shell.tsx), [`docs/PRODUCT_SPEC.md`](docs/PRODUCT_SPEC.md).

## 2. Build one production design system
- Consolidate marketing and app primitives into semantic tokens for canvas, surface, elevated surface, text levels, borders, focus, success, warning, danger, platform accents, shadows, radius, spacing, typography, z-index, and motion.
- Retain scoped light/dark zones while eliminating the current divergent ink/paper values and ad-hoc amber/teal/platform colors.
- Standardize page headers, cards, buttons, icon buttons, inputs, tabs, badges, banners, progress, skeletons, empty states, tooltips, menus, dialogs, sheets, checkboxes, toasts, and status regions.
- Use Lucide plus the existing SVG platform marks consistently; remove unsupported Font Awesome classes.
- Tokenize restrained 100–300 ms interaction motion, make it interruptible, and provide `prefers-reduced-motion` behavior globally.
- Add a component/state showcase and visual fixtures so every primitive can be reviewed in normal, hover, focus, disabled, loading, success, warning, error, empty, and dark contexts.

Key areas: [`components/ui`](components/ui), [`components/landing/platform-marks.tsx`](components/landing/platform-marks.tsx), [`app/layout.tsx`](app/layout.tsx), [`app/globals.css`](app/globals.css).

## 3. Refine app chrome and responsive navigation
- Keep the job-based IA: Dashboard, Studio, Bundles, Library, Brand Voice, Account. Make creation the dominant action and reconcile all labels.
- Refine sidebar/top bar proportions, active states, account/usage presentation, page width rules, focus order, skip navigation, and mobile drawer behavior.
- Remove or implement the notification affordance; do not ship a dead control.
- Create intentional focus layouts for auth/onboarding and a mobile navigation model suitable for the Capacitor shell, including safe areas, virtual keyboards, uploads, and sticky actions that never obscure focused content.

Primary file: [`app/(dashboard)/_components/dashboard-shell.tsx`](app/(dashboard)/_components/dashboard-shell.tsx).

## 4. Redesign the core creation loop first
Make the Studio flow visibly read as: **source → formats → generate → progressive results → review/edit → export/save**.

- Break the 900-line workspace into stable source, configuration, job-status, result, and action modules without disturbing protected usage/error handling.
- Present paste/photo selection clearly, preserve entered source and settings through errors/retries, show selected formats before spend, and distinguish whole-run regeneration from per-format regeneration.
- Reveal each result progressively with explicit queued/analysing/generating/ready/failed states, accessible announcements, partial-success handling, and local retry.
- Turn each output into a labeled platform-native preview with inline editing, local character/format guidance, durable unsaved drafts, voice attribution, copy/share/export confirmation, and clear “preview” language.
- Replace every `alert()`, placeholder Edit action, missing icon, and raw one-off control with the system components.
- On mobile, show one output at a time with reachable actions rather than shrinking the desktop layout.

Key areas: [`app/(dashboard)/studio/_components/RepurposeWorkspace.tsx`](app/(dashboard)/studio/_components/RepurposeWorkspace.tsx), [`app/(dashboard)/studio/_components`](app/(dashboard)/studio/_components), [`components/repurpose`](components/repurpose).

## 5. Make Brand Voice and saved work tangible
- Redesign Brand Voice profiles around a clear name/summary, evidence samples, editable traits, default state, last-updated metadata, and a safe branded confirmation dialog. Show the active voice in Studio and the voice used on every saved output.
- Treat Library as the durable record: source-linked groups, strong preview hierarchy, search, high-value filters, workflow status, and “reuse as new” while preserving history.
- Treat Bundles as first-class objects containing source assets, generated outputs, progress, failures, metadata, and Library links. Allow safe navigation away from long-running work and restore the authoritative state on return.
- Align Dashboard with the user’s next best action: continue unfinished work, create from source, review recent output, complete voice setup, or resolve a limit/payment issue—without decorative metrics that do not drive action.

Key areas: [`app/(dashboard)/brand-voice`](app/(dashboard)/brand-voice), [`app/(dashboard)/library`](app/(dashboard)/library), [`app/(dashboard)/bundles`](app/(dashboard)/bundles), [`app/(dashboard)/dashboard/page.tsx`](app/(dashboard)/dashboard/page.tsx).

## 6. Complete account, billing, auth, and onboarding journeys
- Structure Account with clear sections/subnavigation for Profile, Usage, Plan and Billing, Brand Voice, and Danger Zone; show generations used, remaining, reset date, bundle allowance, renewal/payment state, and exactly what each gate unlocks.
- Make upgrade prompts contextual and infrequent, with one transparent comparison system reused by Account and feature gates.
- Bring sign-in/sign-up into the Voiceora visual language, improve recovery/error/success states, and retain accessible authentication and password-manager support.
- Replace static onboarding with a short learn-by-doing path: choose intent/channels, optionally add or skip a voice, start from sample or own content, and reach a real first draft quickly. Never use fabricated proof.

Key areas: [`app/(dashboard)/account`](app/(dashboard)/account), [`components/billing`](components/billing), [`components/auth/auth-form.tsx`](components/auth/auth-form.tsx), [`app/onboarding/_components/OnboardingForm.tsx`](app/onboarding/_components/OnboardingForm.tsx).

## 7. Upgrade marketing from attractive to demonstrably credible
- Keep the existing brand art direction, but tighten above-the-fold hierarchy around one primary CTA and an honest example/demo route.
- Show real product UI and real generated outputs earlier; replace placeholder proof slots before public launch.
- Build the narrative around the actual transformation: one source, chosen channels, progressive native drafts, consistent voice, review/export.
- Add concrete source examples, transparent pricing units, privacy/upload-retention explanations, complete legal/footer navigation, and polished mobile layouts.
- Keep motion demonstrative rather than decorative and protect page speed.

Key areas: [`app/page.tsx`](app/page.tsx), [`app/landing.css`](app/landing.css), [`components/landing`](components/landing), [`app/privacy/page.tsx`](app/privacy/page.tsx).

## 8. Add top-tier quality gates and release in slices
- Add automated component tests, keyboard/accessibility checks, critical Playwright journeys, and screenshot regression at representative viewports. Cover sign-up/onboarding, first generation, partial failure/retry, editing/export, Library reopen, Brand Voice CRUD, Bundle generation, upgrade gates, checkout return, and account deletion confirmation.
- Require WCAG 2.2 AA: visible/unobscured focus, complete keyboard operation, meaningful names, non-color status cues, accessible async announcements, 24×24 minimum pointer targets and preferably 44×44 touch targets.
- Set performance budgets: LCP ≤2.5 s, INP ≤200 ms, CLS ≤0.1 at p75; reserve preview space, defer media-heavy tooling, avoid unnecessary client JavaScript, and track submission-to-first-usable-output separately.
- Ship as reviewable vertical slices: foundation/shell, Studio loop, outputs/Library/Voice, Bundles/Dashboard/Account, then marketing/auth/onboarding. Validate each slice with real desktop and mobile screenshots before moving on.
- Run five-user usability checks on first-generation and review/export tasks after the Studio slice, then a second pass before public launch; prioritize observed blockers over ornamental polish.

## Definition of done
- All surfaces look and behave as one Voiceora product at desktop, tablet, mobile web, and Capacitor-safe sizes.
- The first usable output is faster to reach and every asynchronous state is understandable and recoverable.
- No dead controls, browser-native placeholder dialogs, unsupported icons, contradictory naming/pricing, or fabricated proof remain.
- Critical workflows pass automated interaction, visual, accessibility, and performance gates.
- The result is benchmark-quality through coherence, speed, trust, and task completion—not by copying another company’s visual style or expanding MVP scope.