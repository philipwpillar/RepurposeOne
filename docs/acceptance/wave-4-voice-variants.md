# Wave 4: Voice Variants v1

## Acceptance checklist

1. Studio offers Your voice, Teach, and Take on every format generation path.
2. Format defaults are Take for X, Teach for LinkedIn, Your voice for Instagram, and Teach for email.
3. Explicit choices persist in `vo-variant-override`; defaults are not persisted.
4. Length choices are filtered by variant and invalid choices snap to the nearest valid default.
5. The separation protocol produces materially different delivery while preserving voice identity.
6. Voice Lab keeps its three sample voices and adds the same variant choices.
7. Text, stream, and photo generation receive `voice_variant`.
8. `bash scripts/ac-check.sh floor` passes.

## Criterion 5 protocol

Run:

```sh
OPENROUTER_API_KEY=... node scripts/variant-separation.mjs
```

The script holds source content, identity, sample, model, temperature, and budget constant. It changes only the variant fragment. Review the three outputs without relying on their labels, record the result in `variant-separation-artefact.md`, and do not claim separation before the reviewer checklist passes.

Without `OPENROUTER_API_KEY`, the script exits successfully and prints instructions. That stub result does not satisfy criterion 5.
