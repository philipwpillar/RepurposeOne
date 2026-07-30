# Model voice baseline (2026-07-30)

**Purpose:** Capture current production behaviour so the next model question is answerable in an afternoon. Not a comparison spike.

## Canary (`scripts/spike-stream.mjs`)

```
json_object: OK — model=qwen/qwen3.5-397b-a17b provider=DeepInfra chunks=155 first_partial=2060ms
json_schema: OK — model=qwen/qwen3.5-397b-a17b provider=DeepInfra chunks=146 first_partial=5202ms
OUTCOME: both wire formats stream partial JSON → design stands
```

Partial sample (json_object): `"Most founders make the same fatal mistake: they over-index on features and under"`

## Pins verified

- Strong slug resolves to DeepInfra under `provider: { only: ["deepinfra/fp8"] }`
- Streaming + structured JSON still work on the production strong model

## Follow-up for human voice read

When comparing a candidate later, generate X thread + LinkedIn from the same brand voice + source used in Studio, side by side with this canary. Score fidelity first, separation second. Do not promote on benchmarks alone.

See also: [`model-eval-2026-07-30.md`](model-eval-2026-07-30.md)
