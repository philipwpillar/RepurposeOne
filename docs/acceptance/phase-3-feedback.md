# Phase 3 acceptance — feedback layer + motion tier 1

**Branch:** `feat/ui-quality-feedback`  
**Baseline:** `614be2b`  
**Commits:** five, unsquashed (ratchet → Sonner → motion → Studio fence → deferred delete)

## Gate output

```
bash scripts/ac-check.sh floor  → PASS, exit 0
bash scripts/ac-check.sh 3      → PASS, exit 0
npm run contrast-check          → PASS, exit 0
npm run typecheck               → PASS
npx playwright test             → 8 passed, 1 skipped
```

### Phase 3 gates (13)

| Check | Gate |
| --- | --- |
| sonner / Toaster wired | `ge 3` |
| no tailwindcss-animate | `eq 0` |
| studio ad-hoc msg state removed (case-insensitive) | `eq 0` (baseline 16) |
| live regions STILL preserved | `ge 11` |
| dialog enter/exit via `vo-overlay\|vo-dialog` | `ge 2` |
| motion keyframes `@keyframes vo-` | `ge 6` |
| motion tokens consumed | `ge 4` |
| drawer animated (`vo-slide-in-left\|vo-fade-in`) | `ge 2` |
| undo action toast `label: "Undo"` | `ge 1` |
| deferred-delete timer `pendingDelete\|PENDING_DELETE` | `ge 2` |
| account delete form untouched (git diff name-only) | `eq 0` |
| reduced-motion block intact | `ge 4` |
| acceptance note committed | `eq 1` |

### Gate refinements applied

1. Studio message gate is **case-insensitive** (`rg -ni 'statusmessage|exportmessage'`) so it also catches `setStatusMessage` / `setExportMessage`.
2. Account delete assert is **file untouched** via `git diff --name-only origin/main...HEAD -- DeleteAccountForm.tsx`.

### Toast position nit

Sonner `position="bottom-center"` always — no `matchMedia` client branch.

## Fence `grep -c` table (RepurposeWorkspace.tsx)

Recorded after every Studio edit; final counts match the floor:

| Symbol | Count |
| --- | --- |
| `class GenerateApiError` | 1 |
| `callGenerateApi` | 3 |
| `callPhotoGenerateApi` | 2 |
| `PhotoGenerateApiError` | 2 |
| `setUsedCount(apiErr.usage.used)` | 1 |

## Status split (Studio)

| Event | Action |
| --- | --- |
| Continuous generation (`formatLoading`) | Kept on `liveStatus` + `role="status"` banner + sticky button labels |
| Run complete (text + photo paths) | `toast.success("Run complete", { description: "Review each format below" })` |
| Export copy success | `toast.success("All formats copied")` |
| Clipboard failure | `toast.error("Could not copy", { description: "…" })` |
| Per-format `` `${title} ready` `` | Deleted — card already shows readiness |
| Run-start strings (Analysing… / Generating N… / Generating from updated source…) | Deleted — continuous feedback via live region |

## Deliberate non-actions

- No `tailwindcss-animate` / Framer Motion.
- No per-format completion or failure toasts (card error UI stays).
- No re-implementation of copy-success state (`copy-action-button.tsx` unchanged).
- `DeleteAccountForm.tsx` untouched (inline typed-DELETE form, not Dialog).
- Mobile drawer stays custom (entry-only CSS); not converted to Radix Dialog.
- ModeSwitchDialog remains on the Dialog primitive.
- Live regions not removed or weakened.
- Fence symbols unmodified.
- Phase 4 streaming not started.

## Motion notes

Hand-written `@keyframes vo-*` (fade/scale/slide) plus `.vo-overlay` / `.vo-dialog` / `.vo-fade-in` / `.vo-slide-in-left` / `.vo-tabs-content`. Global `prefers-reduced-motion` block left intact (not duplicated).

## Screenshots

Optional: `node e2e/capture.mjs` with the app running for drawer + Dialog spot-checks in both themes.
