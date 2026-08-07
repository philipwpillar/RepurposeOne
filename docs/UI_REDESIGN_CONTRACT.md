# UI Redesign Contract — Voiceora

> Slice 1 foundation. Living companion to `PRODUCT_SPEC.md`.
> Last updated: 2026-07-25 (Phase 2 design system)

## 1. Product feel

Voiceora is a **focused creator studio**, not an AI chatbot and not an enterprise social dashboard.

Preserve:
- Navy / pale canvas two-zone architecture
- Aurora gradient (teal → indigo → magenta)
- Space Grotesk (display) + Inter (body) + JetBrains Mono (meta)
- Honest marketing (no fabricated social proof)

## 2. Principles

1. **One system** — marketing, auth, onboarding, and app share the same tokens, type scale, radius, and icon language.
2. **Job-based IA** — Dashboard, Studio, Bundles, Library, Brand Voice, Account. Creation is the dominant action.
3. **Progressive clarity** — show status as it happens; never block the whole run for one format.
4. **Native previews, labeled as previews** — platform chrome helps trust; do not claim pixel-perfect third-party rendering.
5. **Accessible by default** — WCAG 2.2 AA target; visible focus; keyboard complete; `prefers-reduced-motion` honored.
6. **MVP scope guard** — no scheduling, direct publishing, teams, or analytics inside this redesign.

## 3. Zones

| Zone | Class | Meaning |
| --- | --- | --- |
| Content canvas | `:root` / `.dark` on `<html>` | User-selected light or dark theme |
| Always-dark chrome | `.chrome-dark` | Sidebar, top bar, mobile drawer, auth/onboarding shell — brand-dark in both themes |

`.chrome-dark` is not "navigation only"; it is any surface that must stay dark regardless of theme. Do not invent auth-specific colour tokens — put the shell in `.chrome-dark` and use semantic tokens (`text-foreground`, `text-muted-foreground`).

The marketing landing (`.vo-landing`) is **theme-invariant**. It aliases to brand primitives (`--ink`, `--paper`, `--teal`, `--ink-foreground`, …), never to semantic tokens that flip (`--foreground`, `--muted-foreground`, `--border`). Four values (`#F1F2F7`, `#0E1230`, `#5B6178`, `#E6E8F0`) *do* have semantic counterparts — they are not used for landing because those counterparts flip in dark mode.

## 4. Surface scale

| Token | Light role | Notes |
| --- | --- | --- |
| `--surface-0` | Page canvas | Also `--background` |
| `--surface-1` | Cards | Also `--card` |
| `--surface-2` | Raised / inset | Also `--secondary` / `--muted` / `--accent` (light) |
| `--surface-3` | Overlays, popovers | Reserved for Phase 3 |

Semantic tokens re-point at the scale so elevation has one source of truth. `.dark` redefines the scale; `.chrome-dark` keeps its own palette.

## 5. Density & hierarchy

| Surface | Density | Page width |
| --- | --- | --- |
| Brand Voice, Account, Library list | Calm / sparse | `max-w-3xl` (Account `max-w-lg`) |
| Dashboard | Medium | `max-w-4xl` |
| Studio, Bundles | Richer working surface | Studio `max-w-screen-md`; Bundles `max-w-3xl` |

### Type roles

Pick a **role**, not a one-off pixel size. Utilities live in `app/globals.css`.

| Role | Utility | Size | Family | Weight | Use for |
| --- | --- | --- | --- | --- | --- |
| Page title | `.text-page-title` | 24px | Body | 600 | `PageHeader` `<h1>` only |
| Section | `.text-section` | 18px | Body | 600 | Page subsections `<h2>` |
| Panel | `.text-panel` | 16px | Body | 600 | `CardTitle`, `DialogTitle` |
| Body | `text-sm` (default) | 14px | Body | 400 | UI copy, inputs, buttons |
| Subheading | `text-sm font-semibold` | 14px | Body | 600 | Nested labels under a section |
| Caption | `.text-caption` / `text-xs` | 12px | Body | 400–500 | Helpers, timestamps, badges |
| Meta | `.eyebrow` | 11px | Mono | 500 | Uppercase group labels only |
| Micro | `.text-micro` | 10px | Mono | 500 | `<kbd>` and bottom-tab labels only |
| Display | `.font-display` | as sized | Display | 600–700 | **Voiceora wordmark only** (BrandLockup, landing brand/footer name) |

Subtitles under a page title use `text-sm text-muted-foreground`. Do not use `text-[10px]` / `text-[11px]` outside Micro / Meta. Do not size card titles at page-title scale. Main page and section titles use Title Case. Space Grotesk is reserved for the Voiceora brand name - all other reading UI uses Inter.

## 6. Icons

- **Lucide** for UI chrome and actions
- **SVG platform marks** from `components/landing/platform-marks.tsx` for X, LinkedIn, Instagram, Email
- **No Font Awesome** stylesheet dependency

## 7. Motion

| Token | Duration | Use |
| --- | --- | --- |
| `--motion-fast` | 100ms | Hover, focus ring settle |
| `--motion-base` | 200ms | Component state change |
| `--motion-slow` | 300ms | Panel / drawer enter |

Animate `opacity` and `transform` only. Decorative motion must stop under `prefers-reduced-motion: reduce`.

## 8. Component states

Every interactive primitive must define: default, hover, focus-visible, disabled, loading (where async), and error (where validating).

Destructive actions use an in-app Dialog — never `window.confirm` / `alert` for product flows.

## 9. Acceptance floor (every slice)

- `npm run lint` + `npm run typecheck` pass
- Desktop + ~390px mobile screenshots of touched surfaces
- No dead controls
- No unsupported icon fonts
- Plan labels human-readable (`Pro Plus`, not `pro_plus`)
- `npm run contrast-check` pass (both themes) after Phase 2
