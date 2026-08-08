---
name: Stage C Plus C6
overview: "After PR #132 merges, implement Stage C on `fix/voice-exemplar-correctness` exactly as v2 (C1–C5), appending addendum C6 so E1 uses a pinned floor with a distinct `CALIBRATE` status — never a self-referential pass, never a guessed threshold."
todos:
  - id: merge-132
    content: "Wait for / confirm PR #132 merged; branch fix/voice-exemplar-correctness from main"
    status: completed
  - id: c1-polarity
    content: "C1: split resolveOutput by polarity in lib/ai/exemplars.ts"
    status: completed
  - id: c2-scope
    content: "C2: brandVoiceId on fetchVoiceExemplarsText + three API call sites"
    status: completed
  - id: c3-edits
    content: "C3: edited_at select, or-filter, rewrite buildVoiceExemplars positive bands"
    status: completed
  - id: c4-voice-range
    content: "C4: ResolvedBrandVoice + voice_range.summary in identity block"
    status: completed
  - id: c6-e1-floor
    content: "C6: E1_FLOOR constant, CALIBRATE status, no self-referential floor; null if no key"
    status: completed
  - id: c5-ci
    content: "C5: clear EXPECTED_FAIL_UNTIL for E3–E5; add voice-eval to CI"
    status: completed
  - id: gates-pr
    content: Run dashes/typecheck/build/voice-eval; open PR; leave E1_FLOOR null note if uncalibrated
    status: completed
isProject: false
---

# Stage C + C6 (E1 floor)

## Preconditions

- Merge [PR #132](https://github.com/philipwpillar/RepurposeOne/pull/132) (`feat/voice-eval-harness`) when ready.
- Branch from updated `main`: `fix/voice-exemplar-correctness` (do not reuse `feat/voice-eval-harness`).
- Contract: [brief-voice-learning-v2-2026-08-06.md](/Users/philipwpillar/Library/Mobile Documents/com~apple~Keynote/Documents/RepurposeOne SaaS App/Briefs August/brief-voice-learning-v2-2026-08-06.md) Stage C, plus [addendum-C6-e1-floor.md](/Users/philipwpillar/Library/Mobile Documents/com~apple~Keynote/Documents/RepurposeOne SaaS App/Briefs August/addendum-C6-e1-floor.md).
- C1–C5 unchanged. C6 only replaces the tautological E1 floor in [`scripts/voice-eval.mjs`](scripts/voice-eval.mjs).

## C1–C5 (unchanged from v2)

| ID | Work | Primary files | Eval |
| --- | --- | --- | --- |
| **C1** | Split `resolveOutput` by polarity: positive prefers `user_output`; negative uses `output` only (skip if missing) | [`lib/ai/exemplars.ts`](lib/ai/exemplars.ts) | E3 |
| **C2** | Add required `brandVoiceId: string \| null` to `fetchVoiceExemplarsText`; null returns `""`; update **all three** call sites | exemplars + [`app/api/generate/route.ts`](app/api/generate/route.ts) ~207, [`app/api/generate/stream/route.ts`](app/api/generate/stream/route.ts) ~241, [`app/api/bundles/generate/route.ts`](app/api/bundles/generate/route.ts) ~763 | E4 |
| **C3** | Select `edited_at`; widen `.or(...)`; **rewrite** positive ranking in `buildVoiceExemplars` (bands 1→2→3, never `-1` as positive) | [`lib/ai/exemplars.ts`](lib/ai/exemplars.ts) | — |
| **C4** | Select `voice_range` in brand-voice resolve; `ResolvedBrandVoice`; append `voice_range.summary` in identity block above precedence | [`lib/repurpose/brand-voice.ts`](lib/repurpose/brand-voice.ts), [`types/index.ts`](types/index.ts), [`lib/ai/voice-variants.ts`](lib/ai/voice-variants.ts), prompt contexts | E5 |
| **C5** | Add `npm run voice-eval` to [`.github/workflows/ci.yml`](.github/workflows/ci.yml) after E3–E5 are green; remove those ids from `EXPECTED_FAIL_UNTIL` | CI + harness | — |

Verification hot spots Phil called out: the three C2 call sites, and the C3 builder rewrite (query-only is insufficient).

## C6 — Make E1 capable of failing

Today’s bug in [`scripts/voice-eval.mjs`](scripts/voice-eval.mjs) `runE1()` (~579–589): floor is `observedMin - margin`, so `allAbove` is always true.

**C6a.** Module constants (replace per-run derivation):

```js
const E1_FLOOR = null; // or calibrated number
const E1_MARGIN = 0.05;
```

Keep a derivation comment history next to `E1_FLOOR`. Never recompute the gate floor from the distribution under test.

**C6b.** `runE1()` modes:

- `E1_FLOOR === null` → measure full distribution, artefact includes every voice-pair×source distance, status **`CALIBRATE`** with observed min + suggested floor (`max(0, observedMin - E1_MARGIN)`), print paste instructions. Exit 0. Not PASS, not FAIL.
- `E1_FLOOR` is a number → assert every distance `>= E1_FLOOR`. On FAIL, name the specific pair + source + measured value + floor.

**C6c.** Extend `record()` / console tag vocabulary and the artefact results table with `CALIBRATE` (alongside PASS, FAIL, EXPECTED_FAIL, SKIP, ADVISORY_FAIL). Ensure `hardFails` still only treats `FAIL` (so CALIBRATE does not fail the run and is not collapsed into PASS).

**C6d.** Calibration policy for this PR:

- Shell currently has **no** `OPENROUTER_API_KEY`. Default: leave `E1_FLOOR = null`, commit artefact only if a live run was possible, and **state plainly in the PR** that E1 is uncalibrated.
- If a key is available during Stage C: run once, set `E1_FLOOR` from the reported suggestion, fill the dated derivation comment, commit the artefact as evidence.
- **Never invent a floor to make acceptance look green.**

C6 does not change C5: E1 still SKIPs in CI without a key; CI still gates on offline E3–E5.

## Acceptance (gates)

Same as Stage C plus C6:

- `npm run voice-eval` (no key): E3–E5 PASS; E1 SKIP; exit 0.
- With key + `E1_FLOOR = null`: E1 `CALIBRATE`, full distance table in artefact, exit 0.
- With key + floor above observed min: E1 FAIL with named pair/source.
- With calibrated floor: E1 PASS.
- No path recomputes the gate floor from the checked distribution.
- `npm run test:voice-variants`, `check:dashes`, `typecheck`, `build` EXIT 0.
- Fence untouched.

## PR / stop

One PR from `fix/voice-exemplar-correctness` → `main`. Do not merge; Phil verifies C2 call sites + C3 builder + C6 status vocabulary.
