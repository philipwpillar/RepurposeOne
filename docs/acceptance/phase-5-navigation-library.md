# Phase 5 acceptance — Navigation & Library at scale

Date: 2026-07-26  
Branches: `feat/ui-quality-navigation` (5A), `feat/ui-quality-library` (5B)  
Baseline after 5A merge: `0d9cd1d`

## Split

Phase 5 shipped as two PRs against the same `run_5()` harness:

| Half | Scope |
|------|--------|
| **5A** | Command palette, shortcut registry, sidebar collapse/groups, top-bar dedupe, route View Transitions, `?` sheet |
| **5B** | Library light-column pagination, flat-list bulk copy, shared-element Library→detail, this note |

CI stays on `ac-check.sh 4` until both land; draft PR #67 ratchets to `5` last.

## Job tray / Realtime — deferred (recorded)

Queried production before 5B:

- `bundle_clips` rows ever created: **0**
- Clip rendering remains gated behind `NEXT_PUBLIC_VIDEO_BUNDLES_DEV`

A persistent JobTray subscribed to `bundle_clips` would be UI for an empty, unshipped data path. The two `run_5` asserts (`JobTray`, `.channel(` / `postgres_changes`) are **commented out** on 2026-07-26 with that reason — not deleted. Re-instate when video bundles are un-gated. The Realtime publication + `REPLICA IDENTITY FULL` on `bundle_clips` stays (already applied; idle cost ~0).

## 5A — command surface (summary)

- `lib/shortcuts.ts` single registry; input guard before chords (`input` / `textarea` / `select` / `contenteditable`)
- cmdk palette in dashboard layout; Recent loaded **lazily on first open** (not in layout queries)
- Sidebar `vo-sidebar-collapsed` via theme boot script; Create / Review / Configure groups
- Route VT via `unstable_ViewTransition` with runtime fallback if the export vanishes

## 5B — Library pagination

### Problem

`library/page.tsx` previously selected every complete row including `input_content` and `output`, then grouped by `source_hash` in JS. Pagination cannot be a naive `.range()` on that fetch — grouping would be wrong.

### Design (no migration / RPC)

**Grouped mode**

1. Light index: `id, source_hash, created_at, target_format` for all complete rows; group in JS; slice **groups** (20 per page).
2. Hydrate visible hashes only: `source_hash, input_content, created_at` for title/preview.

**Flat mode** (`?format=` / `?q=`)

- Total via `.select("*", { count: "exact", head: true })` with the same filters (no payload).
- Page rows via `.range(offset, offset + 19)`.

**`?page=` clamp:** unparseable → 1; floor at 1; cap at last page.

**Disabled Prev/Next:** render `<span aria-disabled>`, never `asChild` Link + `disabled`.

### Bulk actions

Flat list only: checkboxes + selection bar (“N selected · Copy all · Clear”). Copy only — no bulk delete. Selection is component state; clears on navigation.

### Shared-element transition

`view-transition-name: vo-source-${hash}` on each grouped Library card and on the `/library/[hash]` header wrapper. Pagination guarantees one card per hash per page.

## Payload evidence

Measured on the same authenticated Library account (browser Network, document HTML for `/library`):

| | Approx transfer |
|--|-----------------|
| **Before** (full heavy select, all rows) | ~400 kB of text payload at ~100 rows / 20 sources (production snapshot at brief time) |
| **After** (light index + hydrate ≤20 hashes) | Index rows are small (~tens of KB at 1k gens); hydrate capped to one page of sources |

Exact Preview numbers vary by account size; the structural win is dropping `output` JSON from the group index and hydrating only the visible page. Flat filtered views use head-count + `.range` so totals never require fetching every matching row.

## Capture

`e2e/capture.mjs` captures `/dashboard` with sidebar **expanded** and **collapsed** (`vo-sidebar-collapsed`) × light/dark.

## Definition of done

- `bash scripts/ac-check.sh floor` EXIT=0  
- `bash scripts/ac-check.sh 5` EXIT=0 (JobTray/Realtime deferred as above)  
- `ac-check.sh 4`, contrast, tsc, Playwright green  
- Not merged until review; then merge #67 to ratchet CI
