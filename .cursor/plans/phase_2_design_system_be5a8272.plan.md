---
name: Phase 2 design system
overview: "Unify Voiceora on one token system: add a surface scale, eliminate 65 raw hex literals, rename `.dark` to `.chrome-dark`, then ship real user-selectable dark mode behind a mechanical WCAG contrast gate."
todos:
  - id: commit0
    content: "Commit 0: branch off fresh main; CI ac-check 1→2; extend HEXALLOW with the three Satori files; replace run_2() with the 15 gates including the fixed className-dark and og-description regexes; Part D layout.tsx title + og:description strings"
    status: completed
  - id: commit1
    content: "Commit 1: surface scale + --aurora-foreground + seven missing brand primitives in globals.css; landing.css deletes --ink/--paper/--aurora, aliases the rest, replaces all 20 inline hex with var(); verify pixel-identical"
    status: completed
  - id: commit2
    content: "Commit 2: mechanical rename .dark → .chrome-dark at five sites, reword the globals.css line-56 comment, ensure .chrome-dark is declared after .dark; verify pixel-identical"
    status: completed
  - id: commit3
    content: "Commit 3: apply chrome-dark to AuthShell; replace all 65 in-scope hex literals with tokens; delete the .vo-auth colour overrides; promote the translucent card bg to --panel-translucent; document the four accepted deltas"
    status: completed
  - id: commit4
    content: "Commit 4: .dark palette; ~40-line ThemeProvider with blocking no-flash head script and suppressHydrationWarning; AppearanceSection with Light/Dark/System tabs on Account"
    status: completed
  - id: contrast
    content: Write scripts/contrast-check.mjs parsing globals.css and resolving var() chains, compositing rgba tokens over their backdrop; wire npm run contrast-check into package.json and CI
    status: completed
  - id: verify
    content: "Verify: ac-check floor + 2 exit 0, contrast-check exit 0, Playwright 8/1; capture desktop and 390px screenshots of seven routes in both themes; write phase-2 acceptance note and update UI_REDESIGN_CONTRACT.md"
    status: completed
  - id: pr
    content: Push the five unsquashed commits and open the PR; report branch and PR link; do not merge
    status: completed
isProject: false
---

# Phase 2 — one design system

Branch `feat/ui-quality-design-system` off fresh `main` (`10ee7a7`). Five commits, unsquashed: an infra commit plus the brief's four. Do not merge.

## Verification of the brief

Every count in the brief is accurate at `10ee7a7`: 22 Tailwind-arbitrary hex, 65 in-scope raw hex across 10 files, 9 in the three Satori files, 4 `className="dark"` matches, `--surface-*`/`--aurora-foreground`/`chrome-dark`/theme-provider all at 0.

Six corrections, all verified:

- **The `legacy className="dark" gone` gate can never pass.** `\bdark\b` matches inside `chrome-dark` (`-` is a non-word character, so the boundary holds). I confirmed this: `className="chrome-dark hidden"` matches the proposed pattern. Replace with a space-delimited token match, `className="([^"]* )?dark( [^"]*)?"`, which matches `dark` alone but not `chrome-dark`.
- **The `og:description trimmed` gate already passes at baseline.** Its first alternative `description:\s*$` matches [app/layout.tsx](app/layout.tsx) lines 40 and 46 today, so it returns 2 and the brief's "every one currently fails" is wrong here. Drop that alternative and assert the trimmed string only.
- **`.vo-landing` cannot alias `--ink`, `--paper`, or `--aurora` to themselves.** `--ink: var(--ink)` inside `.vo-landing` is a self-reference cycle and computes to the guaranteed-invalid value. Those three must be *deleted* so they inherit from `:root`; only the differently-named ones (`--aur-1/2/3`, `--ink-2`, `--paper-2`, `--text-hi/lo`, `--ink-text`, `--ink-muted`, `--line-light`) can alias.
- **Seven landing primitives have no canonical counterpart.** `--text-hi #F1F2F7`, `--text-lo #9AA1B2`, `--ink-text #0E1230`, `--ink-muted #5B6178`, `--paper-2 #FAFBFC`, `--line-light #E6E8F0`, and `#C2C3C6` (6 inline sites) exist only in `landing.css`. They need to be added to `:root` as brand primitives.
- **`landing.css` is 33 hex, but only 13 sit in the primitives block.** The other 20 are inline values — `#0B0D14` (4), `#C2C3C6` (6), `#E7E7EC` (2), `#2DD4BF` (2), and the entire `.vo-auth` colour block at lines 447-482. The brief's "delete the duplicate primitives" treatment covers 13 of 33.
- **`.chrome-dark` must be declared after `.dark`** in [app/globals.css](app/globals.css). Both are single-class selectors, so source order decides which wins on nested chrome inside a dark `<html>`.

Confirmed decisions: the landing stays theme-invariant (aliases point at brand primitives, never at `--foreground`/`--background`), and non-hex hardcoded colour like `bg-[rgba(11,13,20,0.65)]` is tokenised only where it shares a line with a hex fix.

## Commit 0 — infra, no visual change

- [.github/workflows/ci.yml](.github/workflows/ci.yml): `ac-check.sh 1` → `2`.
- [scripts/ac-check.sh](scripts/ac-check.sh): add `app/opengraph-image.tsx`, `app/icon.tsx`, `app/apple-icon.tsx` to `HEXALLOW`; replace `run_2()` with the brief's 15 gates, carrying the two regex fixes above.
- Part D in [app/layout.tsx](app/layout.tsx): trim `openGraph.description` to ~120 chars, change `title.default` to `"Voiceora — content repurposing in your brand voice"`.

## Commit 1 — tokens, pixel-identical

In [app/globals.css](app/globals.css) `:root`:

- Surface scale `--surface-0: #f5f6fa` / `-1: #ffffff` / `-2: #edeff5` / `-3: #e3e6ef`, then re-point `--background`/`--card`/`--secondary`/`--muted`/`--accent` at it, plus four `--color-surface-*` entries in `@theme inline`.
- `--aurora-foreground: var(--ink)`.
- The seven missing brand primitives, named for the zone they serve rather than the page: `--ink-foreground: #f1f2f7`, `--ink-foreground-muted: #9aa1b2`, `--paper-foreground: #0e1230`, `--paper-foreground-muted: #5b6178`, `--paper-elevated-2: #fafbfc`, `--hair-light: #e6e8f0`, `--metal: #c2c3c6`.

In [app/landing.css](app/landing.css): delete `--ink`, `--paper`, `--aurora` from `.vo-landing` (inherit), alias the rest to primitives, and replace all 20 inline hex values with `var()`. Structure, spacing and animation untouched.

## Commit 2 — rename `.dark` to `.chrome-dark`, pixel-identical

Five sites: [app/globals.css](app/globals.css) lines 56 and 58, and [dashboard-shell.tsx](app/(dashboard)/_components/dashboard-shell.tsx) lines 207, 240, 297. The line-56 comment must be reworded because it literally contains `className="dark"` and would otherwise trip the gate. Nothing else belongs in this commit. Done before hex elimination, since that depends on the rename.

## Commit 3 — hex elimination, no unintended change

Apply `chrome-dark` to the outer div in [components/auth/auth-shell.tsx](components/auth/auth-shell.tsx), making the class mean "always-dark zone" — sidebar, top bar, drawer, auth/onboarding shell. Then the 65 literals resolve to tokens: `text-[#F4F4F5]` → `text-foreground`, `#A1A1AA` → `text-muted-foreground`, `#71717A` → a placeholder token, `#0B0D14` on `.aurora` → `text-[color:var(--aurora-foreground)]`, platform colours → `--platform-*`, `#A78BFA` → `--primary`.

The `.vo-auth` colour overrides in `landing.css` (including the `.text-muted-foreground` override at line 456) get deleted, since `chrome-dark` now carries them. Keep the translucent card background as `rgba()` — promoted to `--panel-translucent` in globals so there's one source of truth.

**Four accepted, documented deltas** — this commit is not literally pixel-identical, and framing it that way would fail its own screenshot review:

- `#F4F4F5` → `#f1f2f7` and `#A1A1AA` → `rgba(241,242,247,0.72)` on auth surfaces (sub-perceptual)
- `#A78BFA` → indigo `--primary` in onboarding (intended, visible)
- LinkedIn `#3B82F6` → `--platform-linkedin: #0a66c2` in [app/page.tsx](app/page.tsx) and [format-previews.tsx](components/landing/format-previews.tsx) (intended, visible)

## Commit 4 — real dark mode, the only visual change

- `.dark` palette in globals per the brief's 4a, declared before `.chrome-dark`.
- A ~40-line client `ThemeProvider` (no dependency): reads `localStorage["vo-theme"]`, falls back to `prefers-color-scheme`, applies `dark` to `<html>`, exposes `useTheme()`. An inline blocking script in the `<head>` of [app/layout.tsx](app/layout.tsx) sets the class before first paint; `<html>` needs `suppressHydrationWarning`.
- A new `AppearanceSection` above `ProfileSection` on [account/page.tsx](app/(dashboard)/account/page.tsx), using the existing [tabs.tsx](components/ui/tabs.tsx) primitive for Light / Dark / System.
- `scripts/contrast-check.mjs`: parses the `:root` and `.dark` blocks of `globals.css` and resolves `var()` chains rather than hardcoding values, so it cannot drift. It must composite `rgba()` tokens (`--muted-foreground`, `--border`, `--input`) over their backdrop before computing the ratio, or every alpha token reports a wrong number. Wired as `npm run contrast-check` and added to CI after the AC steps.

## Definition of done

`ac-check.sh floor` and `ac-check.sh 2` both PASS with exit code 0 (checking the code, not the green lines); `npm run contrast-check` exit 0; Playwright 8 passed / 1 skipped; CI green; desktop and ~390px screenshots of `/`, `/sign-in`, `/onboarding`, `/dashboard`, `/studio`, `/library`, `/account` in both themes; `docs/acceptance/phase-2-design-system.md` with the gate output, contrast table, nine-file exemption list, the four accepted deltas, and the deliberate non-action on the OG call-to-action warning; `docs/UI_REDESIGN_CONTRACT.md` updated with the zone model and surface scale. PR opened, not merged.

## Out of scope

No touching `RepurposeWorkspace.tsx`; no theme library; no layout, spacing, radius, font or copy changes beyond Part D's two strings; no tokenising the four Google `fill=` values or anything in the nine allowlisted files; no Phase 3 work; no squashing; no merge.