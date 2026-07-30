# Model evaluation note (2026-07-30)

**Decision: no production model change.** Re-check in 4 to 6 weeks.

## Current pins (`lib/config.ts`)

| Tier | Slug | Provider pin |
|---|---|---|
| Fast | `qwen/qwen3.5-35b-a3b` | `deepinfra/fp8` |
| Strong / vision | `qwen/qwen3.5-397b-a17b` | `deepinfra/fp8` |

## Live OpenRouter DeepInfra prices (2026-07-30)

| Slug | DeepInfra in / out per 1M | `max_completion_tokens` | Notes |
|---|---|---|---|
| `qwen/qwen3.5-397b-a17b` | $0.45 / $3.00 | 81,920 | DeepInfra uptime soft (watch); keep as strong |
| `qwen/qwen3.5-35b-a3b` | $0.14 / $1.00 | 81,920 | Keep as fast |
| `qwen/qwen3.6-35b-a3b` | ~$0.10 / $0.95 when DeepInfra listed | **16,384** | Watch candidate only; re-verify endpoints before any trial. Lower completion cap vs 3.5. |

Provider listings move. Always re-hit `https://openrouter.ai/api/v1/models/{slug}/endpoints` before promoting a candidate.

## Disqualified / high bar

| Candidate | Why not |
|---|---|
| `moonshotai/kimi-k2.6` | DeepInfra tag is `deepinfra/fp4` (breaks allowlist); text+image only (no video for Moment Bundles); lower completion cap; fp4 voice risk |
| `qwen/qwen3.6-flash` | Alibaba-only historically; fails GDPR pin |
| `z-ai/glm-5.2` | Text-only / endpoint gaps |

## Baseline voice-parity

Protocol: `scripts/spike-stream.mjs` on current strong slug, plus side-by-side X thread / LinkedIn reads against a fixed brand voice. Artefact: [`docs/acceptance/model-voice-baseline-2026-07-30.md`](acceptance/model-voice-baseline-2026-07-30.md).

This is a **baseline capture**, not a comparison spike. Comparison against Qwen3.6 (or anything else) waits until a candidate clears DeepInfra `fp8` + modality + headroom.

## Production rule

Silent auto-failover remains forbidden. Manual env swap only per [`docs/runbooks/model-failover.md`](../runbooks/model-failover.md).
