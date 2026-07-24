---
name: voiceora-slice-2-studio
overview: Rebuild the Studio creation loop so Voiceora feels like a premium source-to-many content studio—progressive generation, native previews, inline edit, recovery—without changing billing/error fences.
todos:
  - id: s2-modularize
    content: Split RepurposeWorkspace into source, config, job-status, results, and action modules while preserving protected generate/limit error handling.
    status: pending
  - id: s2-source-formats
    content: Clarify paste/photo switching, preserve source+settings on retry, show selected formats before spend, separate whole-run vs per-format regenerate.
    status: pending
  - id: s2-progressive
    content: Progressive per-format states (queued/generating/ready/failed) with accessible status announcements, partial success, and local retry.
    status: pending
  - id: s2-preview-edit
    content: Platform-native labeled previews with inline edit (replace Edit alerts), durable drafts, voice attribution, copy/export confirmation.
    status: pending
  - id: s2-mobile
    content: Mobile one-output-at-a-time layout; sticky actions that do not obscure content; system Button/Dialog only.
    status: pending
  - id: s2-gates
    content: Manual + automated smoke for first generation path; desktop/mobile screenshots; open PR.
    status: pending
isProject: false
---

# Slice 2 — Studio core loop

Parent plan: [voiceora-product-quality_7100bba1.plan.md](voiceora-product-quality_7100bba1.plan.md)  
Depends on: [voiceora_slice_1_foundation.plan.md](voiceora_slice_1_foundation.plan.md)

**Goal:** The path **source → formats → generate → progressive results → review/edit → export** feels as smooth as Buffer/Typefully/Descript-class tools.

**Highest product leverage slice.** Validate with a short usability pass after merge readiness.

## In scope
- Refactor [`RepurposeWorkspace.tsx`](app/(dashboard)/studio/_components/RepurposeWorkspace.tsx) into maintainable modules
- **Hard constraint:** do not casually rewrite protected fence symbols (`GenerateApiError`, `callGenerateApi`, `callPhotoGenerateApi`, usage/`limit_exceeded` / `plan_required` / `rate_limited` handling)
- Input mode UX (paste vs photo) with clear confirm when switching clears data
- Format picker + pre-spend clarity
- Progressive loading/skeletons per format; `aria-live` / status regions
- Replace `alert("Edit modal coming soon")` with real inline edit (or Library-parity draft edit if already available)
- Replace raw `<button>` / FA icons with Slice 1 primitives + platform marks
- Sticky bottom bar polish; remove “~N min saved” clutter if it fights hierarchy (or restyle as secondary meta)
- Mobile: single-format focus / accordion, reachable primary actions

## Out of scope
- Brand Voice CRUD redesign (use existing voice banner + attribution only)
- Library list redesign
- Bundles workspace
- Marketing Voice Lab changes
- Scheduling / direct publish

## Key files
- [`app/(dashboard)/studio/_components/RepurposeWorkspace.tsx`](app/(dashboard)/studio/_components/RepurposeWorkspace.tsx)
- [`app/(dashboard)/studio/_components/*`](app/(dashboard)/studio/_components)
- [`components/repurpose/*`](components/repurpose)
- [`lib/repurpose/edit-draft-storage.ts`](lib/repurpose/edit-draft-storage.ts) (if present)

## Acceptance criteria
- First usable format appears without waiting for all four to finish
- Failed format can retry without regenerating successes
- Edit works without browser `alert()`
- Copy/export gives clear confirmation
- No FA icons; controls use design-system components
- Keyboard operable for generate, regenerate, copy, edit
- Desktop + mobile screenshots of empty studio, generating, and complete states
- Optional: 3–5 user timed “first generation” check vs baseline

## Branch / PR
- Branch: `feat/ui-slice-2-studio`
- One PR into `main`; do not merge unless asked
---
