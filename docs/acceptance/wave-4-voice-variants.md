# Wave 4: Voice Variants v1

## Acceptance checklist

1. Studio offers Your voice, Teach, and Take on every format generation path.
2. Format defaults are Take for X, Teach for LinkedIn, Your voice for Instagram, and Teach for email.
3. Explicit choices persist in `vo-variant-override`; defaults are not persisted.
4. Length choices are filtered by variant and invalid choices snap to the nearest valid default.
5. The separation protocol produces materially different delivery while preserving voice identity.
6. Voice Lab keeps its three sample voices and adds the same variant choices (hybrid demo).
7. Text, stream, and photo generation receive `voice_variant`.
8. Bundles resolve the same per-format default as Studio (`DEFAULT_VOICE_VARIANT_BY_FORMAT`).
9. `bash scripts/ac-check.sh floor` passes, including `npm run test:voice-variants`.

## Criterion 4 note (accepted cosmetic deviation)

The signature path is not byte-identical to the pre-variant prompt plus fragment and precedence line. `Description: X` became `Voice identity (follow strictly - this is your primary tone anchor):\nX`, and the old `Brand voice:` header is gone. No `BrandVoiceInput` field is lost. Accept this deviation explicitly: the layering change is the feature.

## Criterion 5 protocol

Run:

```sh
OPENROUTER_API_KEY=... npm run variant-separation
```

The script:
- imports fragments from `lib/ai/voice-variants.ts` (not a local copy)
- defaults to `qwen/qwen3.5-397b-a17b` with `provider.only: deepinfra/fp8` and `reasoning: { enabled: false }`
- generates across X thread, LinkedIn, and Instagram
- repeats each cell three times
- adds a foreign-voice control output for the fidelity half
- computes mean sentence length, hedge count, first/second-person ratio, and lexicon overlap
- mechanical gate: explain vs provoke sentence-length + second-person separation; lexicon overlap relatively flat
- writes `docs/acceptance/variant-separation-artefact.md`
- exits non-zero if the mechanical gate fails

Without `OPENROUTER_API_KEY`, the script exits successfully and prints instructions. That stub result does not satisfy criterion 5.

**2026-07-30 run:** mechanical gate **PASS** against production Qwen on DeepInfra. Artefact committed. Blind human match of unlabeled outputs remains a reviewer checkbox.

## Copy decisions locked for merge

- **Voice Lab demo:** hybrid (sample voices + variant row). Headline stays **Same Idea. Different Voice.** (title-cased by polish PR). Pure one-voice-three-deliveries demo is deferred.
- **Voice Lab length presets:** 20 / 50 / 75 only. The ~100 option stays off the anonymous demo for abuse-surface reasons.
