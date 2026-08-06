# Voice eval artefact

Generated: 2026-08-06T12:16:41.006Z
Model: qwen/qwen3.5-397b-a17b
Provider pin: deepinfra/fp8
Temperature: 0.7 (from AI_CONFIG)
API key present: false

## Results

| ID | Status | Detail |
| --- | --- | --- |
| E3 | EXPECTED_FAIL | negative exemplar block contains user_output marker (USER_CORRECTED_VOICE_MARKER_should_not_appear_in_negative) - expected until Stage C (negative exemplar polarity) |
| E4 | EXPECTED_FAIL | fetchVoiceExemplarsText arity=3, need >= 4 (brandVoiceId). Unscoped assembly leaks voice B=true - expected until Stage C (brand_voice_id exemplar scope) |
| E5 | EXPECTED_FAIL | assembled prompt missing voice_range.summary marker (VOICE_RANGE_SUMMARY_MARKER_terse_technical_short_claims) - expected until Stage C (voice_range injection) |
| E6 | SKIP | learned rules not injected yet (Stage D); assembleVoiceLayers ignores rule fields on main |
| E7a | SKIP | lib/ai/voice-derive.ts not present yet (Stage D) |
| E1 | SKIP | no OPENROUTER_API_KEY |
| E2 | SKIP | no OPENROUTER_API_KEY |
| E7b | SKIP | no OPENROUTER_API_KEY |

## Expected-red map (Stage B)

E3, E4, E5 fail against main until Stage C. Entries in `EXPECTED_FAIL_UNTIL` keep the harness exit green while those bugs remain. Stage C deletes each entry when the matching fix lands, then adds `voice-eval` to CI.

- **E3** - Stage C (negative exemplar polarity)
- **E4** - Stage C (brand_voice_id exemplar scope)
- **E5** - Stage C (voice_range injection)

## Fixtures

Brand voices: terse, warm, blunt. Sources: news, anecdote, technical, opinion.
