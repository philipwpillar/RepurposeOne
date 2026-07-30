# Studio fence specification (floor re-spec 2026-07-30)

**Branch:** `fix/studio-fence-spec`  
**File:** `app/(dashboard)/studio/_components/RepurposeWorkspace.tsx`  
**Harness:** `scripts/ac-check.sh` floor fence

## Why

PR #26 consolidated usage error handling into `resolveGenerateError`. The old floor gates required exact mention counts (`GenerateApiError` eq 8, `callGenerateApi` eq 3, …). Those counts drift upward whenever Studio UI is added around the fence, which blocked Wave 4 length/variant work.

## Proposed floor pattern (pending explicit ratification)

Floors use **current counts as minimums** (`ge N`), not `ge 1`. That tolerates additions while still catching deletions of usage-sync or error-class wiring.

| Symbol / pattern | Gate |
|---|---|
| `GenerateApiError` | present (`ge 8`) |
| `PhotoGenerateApiError` | present (`ge 2`) |
| `callGenerateApi` | present (`ge 3`) |
| `callPhotoGenerateApi` | present (`ge 2`) |
| `resolveGenerateError` | present (`ge 1`) |
| `setUsedCount(apiErr.usage.used)` | exactly once (`eq 1`) — consolidated error path |
| `setUsedCount(usage.used)` | at least three (`ge 3`) — success paths |
| `setUsedCount(err.usage.used)` | forbidden (`eq 0`) — obsolete pre-consolidation pattern |

## Rules for later Studio PRs

- Keep usage sync consolidated through `resolveGenerateError` on error paths.
- Do not restore literal `setUsedCount(err.usage.used)` branches.
- Product UI (length chips, variant chips) may touch this file; the fence gates above must still pass.
- Do not describe this re-spec as "ratified" until Phil explicitly accepts it.
