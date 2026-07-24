# UI Redesign Contract — Voiceora

> Slice 1 foundation. Living companion to `PRODUCT_SPEC.md`.
> Last updated: 2026-07-24

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

## 3. Density & hierarchy

| Surface | Density | Page width |
| --- | --- | --- |
| Brand Voice, Account, Library list | Calm / sparse | `max-w-3xl` (Account `max-w-lg`) |
| Dashboard | Medium | `max-w-4xl` |
| Studio, Bundles | Richer working surface | Studio `max-w-screen-md`; Bundles `max-w-3xl` |

Page titles use `font-display`, `text-2xl`, `font-semibold`, `tracking-tight`. Subtitles use `text-sm text-muted-foreground`.

## 4. Icons

- **Lucide** for UI chrome and actions
- **SVG platform marks** from `components/landing/platform-marks.tsx` for X, LinkedIn, Instagram, Email
- **No Font Awesome** stylesheet dependency

## 5. Motion

| Token | Duration | Use |
| --- | --- | --- |
| `--motion-fast` | 100ms | Hover, focus ring settle |
| `--motion-base` | 200ms | Component state change |
| `--motion-slow` | 300ms | Panel / drawer enter |

Animate `opacity` and `transform` only. Decorative motion must stop under `prefers-reduced-motion: reduce`.

## 6. Component states

Every interactive primitive must define: default, hover, focus-visible, disabled, loading (where async), and error (where validating).

Destructive actions use an in-app Dialog — never `window.confirm` / `alert` for product flows.

## 7. Acceptance floor (every slice)

- `npm run lint` + `npm run typecheck` pass
- Desktop + ~390px mobile screenshots of touched surfaces
- No dead controls
- No unsupported icon fonts
- Plan labels human-readable (`Pro Plus`, not `pro_plus`)
