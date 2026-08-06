# Voice eval artefact

Generated: 2026-08-06T13:57:27.304Z
Model: qwen/qwen3.5-397b-a17b
Provider pin: deepinfra/fp8
Temperature: 0.7 (from AI_CONFIG)
API key present: false

## Results

| ID | Status | Detail |
| --- | --- | --- |
| E3 | PASS | negative block uses model output only |
| E4 | PASS | arity=4; scoped assembly excludes voice B marker |
| E5 | PASS | voice_range.summary present above precedence; null path well-formed |
| E6 | SKIP | learned rules not injected yet (Stage D); assembleVoiceLayers ignores rule fields on main |
| E7a | SKIP | lib/ai/voice-derive.ts not present yet (Stage D) |
| E1 | SKIP | no OPENROUTER_API_KEY |
| E2 | SKIP | no OPENROUTER_API_KEY |
| E7b | SKIP | no OPENROUTER_API_KEY |

## Expected-red map

Empty after Stage C. E3, E4, E5 pass. Stage D may add entries for E6.

## Fixtures

Brand voices: terse, warm, blunt. Sources: news, anecdote, technical, opinion.
