# Brief — Provider 429 / no DeepInfra failover

**Priority:** P1 before taking money (availability), not a P0 launch blocker while user count is tiny
**Baseline:** `main` @ current; Sentry top live failure cause as of 5 Aug 2026
**Related (not this brief):** [`docs/runbooks/model-failover.md`](../runbooks/model-failover.md) covers **model** swaps (`AI_MODEL_*`). This brief is about **provider** rate-limits under a hard `provider.only` pin.
**Size:** design + small code change; voice/GDPR constraints dominate

---

## 1. Why

Live failures are dominated by `429 Provider returned error` (nine occurrences across bundles and generations at last count). Generation paths pin OpenRouter with:

```ts
provider: { only: ["deepinfra/fp8"] }
```

That pin is intentional (GDPR / transfer posture — see review brief and model-failover runbook). It also means a DeepInfra rate-limit or brief outage is a **dead request**: OpenRouter cannot fall through to another provider, and we do not retry.

At four users this is a curiosity. At launch volume it is the primary availability risk on the paid path.

Silent **model** failover is already rejected (voice differentiator). This brief asks for a deliberate answer to **provider 429**, which is a different failure mode.

---

## 2. Locked constraints

Do **not**:

- Widen `OPENROUTER_ALLOWED_PROVIDERS` to non-DeepInfra providers without a transfer assessment + DPA
- Make `OPENROUTER_ALLOWED_PROVIDERS` env-configurable (settled)
- Auto-swap to a different **model** on 429 (that is the model-failover runbook, and it stays manual)
- Retry forever / hide failures from the user

Do keep:

- Loud, user-visible failure when the request cannot complete
- `repurposes.model` / equivalent logging so blast radius stays queryable

---

## 3. Decision needed (pick one before coding)

| Option | Idea | Trade-off |
|---|---|---|
| **A. Bounded retry** | Same model + same `deepinfra/fp8`; 1–2 retries with jitter on 429 only | Simple; helps burst limits; does not help sustained DeepInfra outage |
| **B. Same-provider model step-down** | On 429 after retries, one attempt on the next blessed slug in the model-failover chain, still `deepinfra/fp8` | Availability ↑; voice may shift — must be logged + optionally surfaced |
| **C. Queue / later** | Accept 429, show clear “try again in a minute”, optional job retry | Safest for voice; worse UX under load |
| **D. Capacity** | Raise DeepInfra / OpenRouter limits; keep fail-loud | Ops-only; no code |

Recommendation to debate: **A then C** for launch; consider **B** only after the voice-parity check in the model-failover runbook is done for the step-down slug.

---

## 4. Out of scope

- Unsetting `HOLDING_MODE`
- Changing GDPR provider allowlist to add a second cloud
- Automatic cross-provider failover
- Moment Bundle worker architecture beyond generation/bundle client errors

---

## 5. Acceptance (once an option is chosen)

- [ ] Documented decision in this brief (§3 marked chosen)
- [ ] Code or ops change matches the chosen option
- [ ] 429 responses remain distinguishable in Sentry (do not collapse into generic 500 without a tag)
- [ ] Manual smoke: force or simulate 429 path once on Preview

---

## 6. Suggested placement in the launch chain

After C4 paid smoke is green (and A4 reconcile if still open), **before** marketing push / paid ads. Not ahead of revenue-path smoke.
