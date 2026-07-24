# Slice 1 — Foundation acceptance notes

Branch: `feat/ui-slice-1-foundation`

## Delivered
- Redesign contract: `docs/UI_REDESIGN_CONTRACT.md`
- Unified brand tokens in `app/globals.css` + aligned `app/landing.css`
- Primitives: Dialog, Checkbox, Tabs, PageHeader
- Shared `planLabel()` — no raw `pro_plus` in UI
- Shell: skip link, `aria-current`, progressbar usage, removed dead notification bell, `font-display` logo
- Library page title matches nav (“Library”)
- Font Awesome removed from Studio headers + copy/share buttons (Lucide + platform SVGs)
- Brand Voice delete uses Dialog; default toggle uses Checkbox
- Global `prefers-reduced-motion` for app transitions
- Consistent page title typography on dashboard surfaces

## Review checklist (desktop + ~390px)
- [ ] Dashboard — plan label human-readable; upgrade banner uses warning tokens
- [ ] Brand Voice — list + delete dialog
- [ ] Studio — platform icons visible; input tabs; no FA missing glyphs
- [ ] Shell — skip link (Tab once), mobile drawer, no notification bell
- [ ] Library — page titled “Library”

## Commands
```bash
npm run lint
npm run typecheck
```
