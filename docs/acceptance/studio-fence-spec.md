# Studio fence specification (re-spec 2026-07-30)

**Branch:** `fix/studio-fence-spec`  
**File:** `app/(dashboard)/studio/_components/RepurposeWorkspace.tsx`  
**Harness:** `scripts/ac-check.sh` floor fence

## Why

PR #26 consolidated usage error handling into `resolveGenerateError`. The old floor gates required brittle mention counts (`GenerateApiError` eq 8, `callGenerateApi` eq 3, …). Those counts drift whenever Studio UI is added around the fence, so Wave 4 length/variant work could not be verified.

## Ratified pattern

| Symbol / pattern | Gate |
|---|---|
| `GenerateApiError` | present (`ge 1`) |
| `PhotoGenerateApiError` | present (`ge 1`) |
| `callGenerateApi` | present (`ge 1`) |
| `callPhotoGenerateApi` | present (`ge 1`) |
| `resolveGenerateError` | present (`ge 1`) |
| `setUsedCount(apiErr.usage.used)` | exactly once (`eq 1`) — consolidated error path |
| `setUsedCount(usage.used)` | at least once (`ge 1`) — success paths |
| `setUsedCount(err.usage.used)` | forbidden (`eq 0`) — obsolete pre-consolidation pattern |

## Rules for later Studio PRs

- Keep usage sync consolidated through `resolveGenerateError` on error paths.
- Do not restore literal `setUsedCount(err.usage.used)` branches.
- Product UI (length chips, variant chips) may touch this file; the fence gates above must still pass.
