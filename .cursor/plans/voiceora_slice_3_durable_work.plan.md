---
name: voiceora-slice-3-durable-work
overview: Make Brand Voice and Library feel like durable, trusted product objects—named voices with evidence, source-linked history, strong previews, and reuse—aligned with the Studio output system.
todos:
  - id: s3-brand-voice
    content: Redesign Brand Voice list/create/edit with names, samples evidence, default state, last-updated, and Dialog confirm for delete (no window.confirm).
    status: pending
  - id: s3-voice-attribution
    content: Surface active voice in Studio and voice used on Library detail outputs consistently.
    status: pending
  - id: s3-library
    content: Strengthen Library grouping, search/filter hierarchy, empty states, and “reuse as new” without mutating history.
    status: pending
  - id: s3-output-parity
    content: Align Library detail panels with Studio preview/edit/copy language and Slice 1 components.
    status: pending
  - id: s3-gates
    content: Desktop/mobile screenshots of Brand Voice + Library flows; open PR.
    status: pending
isProject: false
---

# Slice 3 — Durable work (Brand Voice + Library + output parity)

Parent plan: [voiceora-product-quality_7100bba1.plan.md](voiceora-product-quality_7100bba1.plan.md)  
Depends on: [voiceora_slice_2_studio.plan.md](voiceora_slice_2_studio.plan.md)

**Goal:** Creation is only half the product. Saved voices and past outputs must feel as finished as Studio.

## In scope
### Brand Voice
- Named profiles (not description-as-title only)
- Sample evidence, default badge, last updated
- Create/edit using shared form patterns; Checkbox from system
- Delete via Dialog (replace `window.confirm`)
- Empty state that teaches why voice matters

### Library
- Keep source_hash grouping as the default mental model
- Improve card hierarchy (title, formats, status, date, preview)
- Search + format filter polish; clearer empty/filter-empty copy
- Detail pages: preview chrome parity with Studio; feedback/workflow status remain
- “Reuse as new” / open in Studio without mutating historical rows

### Shared output layer
- Studio and Library share the same preview vocabulary and action patterns from [`components/repurpose`](components/repurpose)

## Out of scope
- Bundles workspace redesign (Slice 4)
- Dashboard home redesign (Slice 4)
- Account/billing (Slice 4)
- Marketing proof (Slice 5)
- Multi-voice A/B testing or advanced Brand Studio vocabulary locks (post-MVP)

## Key files
- [`app/(dashboard)/brand-voice/page.tsx`](app/(dashboard)/brand-voice/page.tsx)
- [`app/(dashboard)/brand-voice/_components/BrandVoiceManager.tsx`](app/(dashboard)/brand-voice/_components/BrandVoiceManager.tsx)
- [`app/(dashboard)/library/page.tsx`](app/(dashboard)/library/page.tsx)
- [`app/(dashboard)/library/[hash]/page.tsx`](app/(dashboard)/library/[hash]/page.tsx)
- [`app/(dashboard)/library/[hash]/[id]/page.tsx`](app/(dashboard)/library/[hash]/[id]/page.tsx)
- [`components/repurpose/*`](components/repurpose)

## Acceptance criteria
- Brand Voice cards show a clear name/summary, sample count, default state
- Delete confirmation is in-app and keyboard accessible
- Library list and detail feel like the same product as Studio
- Reopening a past output is one clear path; reuse does not overwrite history
- Desktop + mobile screenshots for list, empty, detail, voice CRUD

## Branch / PR
- Branch: `feat/ui-slice-3-durable-work`
- One PR into `main`; do not merge unless asked
---
