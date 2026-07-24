---
name: voiceora-slice-5-acquisition
overview: Bring marketing, auth, and onboarding to the same quality bar as the product—real proof, clear conversion, and a learn-by-doing first session that uses the finished Studio.
todos:
  - id: s5-marketing
    content: Tighten landing hierarchy, CTA discipline, mobile layouts; replace REAL OUTPUT SLOT placeholders with real product proof.
    status: pending
  - id: s5-auth
    content: Bring sign-in/sign-up into Voiceora visual language with strong recovery/error/success states; keep accessible auth patterns.
    status: pending
  - id: s5-onboarding
    content: Learn-by-doing onboarding — intent/channels optional, voice save or skip with quality explanation, land in Studio with sample or own content.
    status: pending
  - id: s5-trust
    content: Align privacy/footer/support links and upload-retention messaging with honest brand voice.
    status: pending
  - id: s5-gates
    content: CWV-aware landing checks, desktop/mobile screenshots of marketing+auth+onboarding; open PR; optional second usability pass.
    status: pending
isProject: false
---

# Slice 5 — Acquisition journey (marketing + auth + onboarding)

Parent plan: [voiceora-product-quality_7100bba1.plan.md](voiceora-product-quality_7100bba1.plan.md)  
Depends on: [voiceora_slice_4_monetisation_jobs.plan.md](voiceora_slice_4_monetisation_jobs.plan.md)

**Goal:** The path from first visit to first draft matches the quality of the product built in Slices 1–4. Marketing shows the real app, not placeholders.

## In scope
### Marketing ([`app/page.tsx`](app/page.tsx), [`app/landing.css`](app/landing.css), [`components/landing`](components/landing))
- Keep aurora/navy art direction; tighten hero: one primary CTA + honest secondary
- Replace dashed “REAL OUTPUT SLOT” cards with genuine outputs / product UI captures
- Ensure Voice Lab and format previews still demonstrate value without fabricating customers
- Pricing/trust lines use the same generation unit language as Account
- Mobile polish at ≤860px breakpoint; reduced-motion remains correct
- Footer/legal completeness (privacy, support)

### Auth ([`components/auth/auth-form.tsx`](components/auth/auth-form.tsx))
- Visual continuity with Voiceora (not generic shadcn card island)
- Clear errors, confirmation email state, Google vs email paths
- Password-manager friendly; no cognitive CAPTCHA-style barriers

### Onboarding ([`app/onboarding/_components/OnboardingForm.tsx`](app/onboarding/_components/OnboardingForm.tsx))
- Short path: voice sample/description or skip with explicit quality tradeoff
- Optional light intent (e.g. primary channels) only if it improves first Studio session
- Land in Studio (or dashboard with clear CTA) ready to generate
- Use sample content path if user has no paste yet (`?example=1` or equivalent)

## Out of scope
- Fake testimonials or invented user counts
- Waitlist product rebuild unless already needed
- Expanding MVP feature set
- App Store submission work
- Re-opening Slices 1–4 architecture unless a launch blocker appears

## Acceptance criteria
- No placeholder proof slots on production landing
- Auth and onboarding feel branded and continuous with the app shell
- New user can reach a first draft with minimal friction (measure vs Slice 2 baseline)
- Landing LCP/INP/CLS within budget on a representative mobile profile
- Desktop + mobile screenshots: landing, sign-up, onboarding, first Studio land

## Branch / PR
- Branch: `feat/ui-slice-5-acquisition`
- One PR into `main`; do not merge unless asked
- After this slice: optional full-product visual pass + second 5-user check before public launch
---
