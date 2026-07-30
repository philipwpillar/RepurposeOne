# Model failover runbook

**Sourced from:** OpenRouter's DeepInfra provider listing, read 26 July 2026

---

## The decision: manual failover, not automatic

The architecture principle settles this:

> *"Brand voice consistency is the product's differentiator; silent model swaps are riskier than loud failures caught in testing."*

Automatic model failover contradicts that directly. If the 397B goes down and the app quietly switches to a smaller model, every user's output changes character without anyone being told — in a product whose entire proposition is *"it sounds like you."* A 500 error is recoverable. Silently degraded voice, shipped to a customer's LinkedIn, is not.

So: **a pre-blessed chain, swapped by hand via an env var.** No code, no automatic retry, no new dependency. The chain exists so that an incident is a two-minute lookup rather than a research project.

---

## The blessed chain

Every model below is served by DeepInfra and is a **native vision-language** model, so the same slug works for the text and photo paths. Prices are DeepInfra list from the provider page.

### Strong tier — X thread, LinkedIn, email (`AI_MODEL_STRONG`)

| Order | Slug | In / Out per M (DeepInfra) | Positioning |
|---|---|---|---|
| **1 (current)** | `qwen/qwen3.5-397b-a17b` | $0.45 / $3.00 | Flagship (`max_completion_tokens` 81,920). Watch DeepInfra uptime. |
| **2** | `qwen/qwen3.5-122b-a10b` | $0.29 / $2.40 | Qwen: *"second only to Qwen3.5-397B-A17B"*; text beats Qwen3-235B-2507 |
| **3** | `qwen/qwen3.5-35b-a3b` | $0.14 / $1.00 | Current fast tier - degraded but functional |

### Fast tier — Instagram (`AI_MODEL_FAST`)

| Order | Slug | In / Out per M |
|---|---|---|
| **1 (current)** | `qwen/qwen3.5-35b-a3b` | $0.14 / $1.00 |
| **2** | `qwen/qwen3.5-9b` | $0.10 / $0.15 |

### Vision — photo path (`AI_MODEL_VISION`)

| Order | Slug | Note |
|---|---|---|
| **1 (current)** | `qwen/qwen3.5-397b-a17b` | |
| **2** | `qwen/qwen3.5-122b-a10b` | Qwen: *"visual capabilities surpass Qwen3-VL-235B"* |
| **3** | `qwen/qwen3.5-9b` | Multimodal, cheapest; last resort |

### Deliberately excluded

- **`qwen/qwen3.5-27b`** — $0.26 / $2.60. It is **more expensive per output token than the 122B-A10B and less capable.** Dense vs MoE. The 122B strictly dominates it; there is no scenario where the 27B is the right fallback.
- **`qwen/qwen3.6-27b`** — $0.32 / $3.20, released 27 Apr 2026. A *newer generation*, not a fallback. Different generation means different voice, and it costs more than the 122B. Evaluate it as a deliberate upgrade with a voice check, never as an incident substitute.
- **Anything not on DeepInfra.** GPT and Claude slugs will 404 against `provider: { only: ["deepinfra/fp8"] }` — exactly the failure the local spike hit.

**Note the fallback is cheaper, not just weaker.** The 122B-A10B is 20% less per output token than the 397B. Cost is not the constraint; voice fidelity is.

---

## Compliance: no new assessment required

The GDPR posture is about **where the data goes**, not which weights run. Every model above is served by DeepInfra, which is already assessed and covered. So:

- **Same provider, different model** → no new transfer assessment, no new DPA. Swap freely within this list.
- **Different provider** → requires a transfer assessment and DPA *before* it enters `OPENROUTER_ALLOWED_PROVIDERS`. **Never do this reactively during an incident.** That is how the original structural transfer problem gets reintroduced under time pressure.

`OPENROUTER_ALLOWED_PROVIDERS` stays a code constant. It is not env-configurable, by design.

---

## Pre-flight, before an incident: bless the chain on voice, not benchmarks

The chain above is ordered on Qwen's own capability claims. **That is not the same as sounding like the user.** You cannot discover mid-incident whether the 122B holds a brand voice.

One-off task, roughly thirty minutes and a few pence:

1. Run `scripts/spike-stream.mjs` with `SPIKE_MODEL` set to each candidate, using a real brand voice and one real source.
2. Generate an X thread and a LinkedIn post from each.
3. Read them side by side against the 397B output.
4. Record the outputs in this runbook, and **reorder the chain if the ranking disagrees with the benchmarks.**

That converts the fallback list from a guess into a tested decision, and the artifacts double as evidence if you ever need to justify a swap.

**Status of voice-parity check:** baseline capture run 2026-07-30 (current models only). See [`docs/acceptance/model-voice-baseline-2026-07-30.md`](../acceptance/model-voice-baseline-2026-07-30.md) and the eval note [`docs/acceptance/model-eval-2026-07-30.md`](../acceptance/model-eval-2026-07-30.md). No production swap. Re-check candidates in 4 to 6 weeks.

### Watch list (not blessed)

- **`qwen/qwen3.6-35b-a3b`** - may appear on `deepinfra/fp8` at lower $/token, but DeepInfra `max_completion_tokens` has been **16,384** vs 81,920 on 3.5. Re-verify endpoints + voice before any trial. Not an incident fallback.
- **`moonshotai/kimi-k2.6`** - DeepInfra is `deepinfra/fp4` only; no video modality; do not add without allowlist + Moment Bundle decision.

---

## The incident runbook

**Symptom:** generations return 500s, or a specific format consistently fails.

1. **Confirm it's the provider, not you.** Check [status.openrouter.ai](https://status.openrouter.ai), then the model's **Providers** tab on OpenRouter — has DeepInfra dropped the slug?
2. **Confirm the model is what you think it is.** Run `scripts/spike-stream.mjs` and compare the printed resolved-model string against the canary baseline in [`docs/acceptance/phase-4-streaming.md`](../acceptance/phase-4-streaming.md). The slugs are unpinnable, so this is the only check you have.
3. **Swap the env var.** Vercel → Settings → Environment Variables → set `AI_MODEL_STRONG` (or `_FAST` / `_VISION`) to the next slug in the chain. **Production environment only.** Redeploy.
4. **Verify** with one real generation and read the output.
5. **Tell affected users** if any generation completed on a fallback model. The `repurposes.model` column records which model produced each row, so the blast radius is queryable:
   ```sql
   select id, target_format, model, created_at
   from repurposes
   where model <> 'qwen/qwen3.5-397b-a17b'
     and created_at > '<incident start>';
   ```
6. **Revert** once the primary is healthy. Unset the override so the code default wins again.
7. **Log it here** — date, symptom, model swapped, duration, rows affected.

### Incident log

| Date | Symptom | Model swapped | Duration | Rows affected | Notes |
|---|---|---|---|---|---|
| — | — | — | — | — | — |

---

## The real gap is detection, not failover

Today you would learn about this **from a user**, because there is no error monitoring until Phase 8. The runbook shortens the fix; it does nothing for time-to-detect.

That's acceptable at zero paying users. It stops being acceptable the day someone pays, because the failure is silent revenue loss with no alert. Sentry in Phase 8 closes it — and this runbook is what makes the Sentry alert actionable when it fires.

---

## When automatic failover would be justified

Not now. Revisit when **all three** are true:

1. Paying users exist, so an outage costs money.
2. Sentry is live, so you find out in seconds rather than days.
3. The chain has been voice-blessed per the pre-flight above.

And even then it must be **loud, not silent**:

- One retry only, to the next slug in the same tier.
- The fallback model surfaced in the UI on the affected output — *"generated with a backup model"* — not just recorded in the database.
- A Sentry event on every fallback, so it is never routine.

Silent automatic degradation stays permanently out of scope. That is a product decision, not a technical limitation.

---

## Open question

It is not clear from OpenRouter's provider page whether **`deepinfra` and `deepinfra/fp8` are distinct provider slugs**. The page lists models, not precision variants.

Open the Providers tab on `qwen/qwen3.5-397b-a17b` and check whether DeepInfra appears as **one row or two** (e.g. an fp8 row and a bf16/fp16 row). If two, adding both to `OPENROUTER_ALLOWED_PROVIDERS` removes a single point of failure at **zero compliance cost** — same company, same data location, different quantisation. Output would vary very slightly with precision, which is a smaller voice risk than a model swap.

If it's one row, there is nothing to gain and the current constant is already optimal.
