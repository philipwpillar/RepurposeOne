# Phase 2 acceptance — one design system

**Branch:** `feat/ui-quality-design-system`  
**Baseline:** `10ee7a7`  
**Commits:** five, unsquashed (infra → tokens → chrome rename → hex elimination → dark mode)

## Gate output

```
bash scripts/ac-check.sh floor  → PASS, exit 0
bash scripts/ac-check.sh 2      → PASS, exit 0
npm run contrast-check          → PASS, exit 0
```

### Phase 2 gates (14)

| Check | Gate |
| --- | --- |
| Tailwind arbitrary hex | `eq 0` |
| Raw hex outside extended allowlist | `eq 0` |
| Orphan `#A78BFA` | `eq 0` |
| Legacy `className="dark"` (space-delimited; not `chrome-dark`) | `eq 0` |
| `chrome-dark` scope | `ge 4` |
| `--surface-0..3` | `ge 8` |
| `--aurora-foreground` | `ge 2` |
| ThemeProvider / setTheme / useTheme | `ge 3` |
| No-flash script in layout | `ge 1` |
| Theme toggle Light/Dark/System on Account | `ge 3` |
| `scripts/contrast-check.mjs` | `eq 1` |
| CI runs contrast-check | `ge 2` |
| og:description trimmed | `ge 1` |
| Default title lengthened | `ge 1` |

Dropped from the brief: `landing.css aliases, not values` — redundant with the raw-hex gate.

## Nine-file HEXALLOW

Permanent raw-hex exemptions: `globals.css`, `global-error.tsx`, `loading.tsx`, `vo-logo-mark.tsx`, `google-sign-in-button.tsx` (Google `fill=` only; its `text-[#…]` was tokenised), `app/dev/**`, `opengraph-image.tsx`, `icon.tsx`, `apple-icon.tsx` (Satori — no stylesheet).

## Accepted visual deltas (Commit 3)

1. Auth `#F4F4F5` → `#f1f2f7` (`--foreground` in chrome-dark) — sub-perceptual  
2. Auth `#A1A1AA` → `rgba(241,242,247,0.72)` (`--muted-foreground`) — sub-perceptual  
3. Onboarding `#A78BFA` → `--primary` (indigo) — intended  
4. Landing LinkedIn `#3B82F6` → `--platform-linkedin: #0a66c2` — intended brand correction  

## Theme-invariant landing tokens

Landing aliases brand primitives only. `#F1F2F7`, `#0E1230`, `#5B6178`, and `#E6E8F0` *do* map to `--foreground` / `--muted-foreground` / `--border`, but those flip in dark mode — so landing uses `--ink-foreground`, `--paper-foreground`, `--paper-foreground-muted`, `--hair-light` instead. Do not “simplify” by aliasing to the semantic tokens.

## Remaining `rgba()` in `landing.css`

**39** hardcoded `rgba()` / `rgb()` literals. Deliberately out of Phase 2 scope; carried to Phase 6.

## Contrast table notes

- Platform accents are checked on `--panel` (landing format cards) **and** on `--surface-1` for LinkedIn / Instagram / Email (Studio `bg-card` glyphs). `--platform-x` has no `--surface-1` pair — Studio uses `text-foreground` for the X mark.
- Light `--platform-email` is `#0d9488` (darker than brand `--teal`) so Studio glyphs clear 3:1 on white cards.
- `--input` on `--surface-1` is gated at **3.0** (WCAG 1.4.11 form edges). Light `--input` is `#8b90a5`; dark is `rgba(255,255,255,0.42)`.
- Hairline `--border` uses min **1.1** deliberately (decorative only; inputs are gated separately). `--ring` keeps **3.0** for focus.
- Light `--primary` is `#5b5ff0` (slightly darker than brand `--indigo`) so white label text clears AA 4.5.
- Dark `--platform-linkedin` is `#4d9fff` because `#0a66c2` fails on dark canvases.

## Deliberate non-actions

- OpenGraph validator “image is missing conversion text” — marketing opinion, not a standard; ignored.  
- No `next-themes` dependency — ~40-line `ThemeProvider` + blocking head script.  
- `RepurposeWorkspace.tsx` untouched.

## Screenshots

Use `node e2e/capture.mjs` (with the app running and e2e credentials) for seven routes × 390/1440 × light/dark under `e2e/captures/` (gitignored).
