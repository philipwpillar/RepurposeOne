# UX polish: greys, title case, dash sweep, Voice Lab fonts

**Branch:** `feat/ux-polish-greys-copy`

## Changes

- Voice Lab input + output both 15px
- Hero / OG / metadata title case: One Piece of Content. Every Platform. Your Voice. (lowercase *of*)
- Voice Lab: Same Idea. Different Voice.
- Light surfaces: canvas `#f1f3f7`, elevated `#f9fafc`
- Em / en / horizontal dashes removed from `app/` + `components/` (spaced hyphen or ASCII hyphen)
- Floor AC: `no em/en/horizontal dashes in UI` eq 0 under app + components

## Out of scope

- Logo
- Studio length / voice variants
- `lib/ai/strip-em-dashes.ts` (must keep dash chars to strip model output)
