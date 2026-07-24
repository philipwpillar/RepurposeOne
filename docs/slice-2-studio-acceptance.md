# Slice 2 — Studio acceptance notes

Branch: `feat/ui-slice-2-studio`

## Delivered
- Progressive per-format generation with live status region
- `repurpose_id` stored and passed into output panels → Library-parity **Edit / Save / draft**
- Removed stub `alert("Edit modal coming soon")` and browser `confirm` for mode switch (Dialog instead)
- Extracted `StudioFormatResultCard` + `ModeSwitchDialog`
- Sticky actions use design-system `Button`; bar offsets sidebar on desktop
- Mobile accordion (one format expanded); desktop shows all cards
- Removed redundant mid-page usage + “~N min saved” clutter
- Export confirms via status message (no `alert`)

## Fence note
`callGenerateApi` / `callPhotoGenerateApi` return values extended with `repurposeId` only — error/limit handling unchanged.

## Review checklist
- [ ] Empty Studio → Generate All → first format appears before others finish
- [ ] Fail one format (or disconnect) → Try again on that card only
- [ ] Edit on a ready card → Save → refresh keeps edit (via feedback API)
- [ ] Switch Paste ↔ Photo with content → Dialog asks to clear
- [ ] Mobile: format headers accordion; sticky Generate/Export reachable
- [ ] Export Bundle shows confirmation strip
