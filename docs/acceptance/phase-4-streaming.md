# Phase 4 acceptance — Streaming Studio

Date: 2026-07-26  
Branch: `feat/ui-quality-stream`  
Feature flag: `NEXT_PUBLIC_STREAM_STUDIO` (default off)

## Outcome

The text Studio now has a parallel, flag-gated streaming path. The existing
`/api/generate` route and photo generation client are byte-unchanged. Streaming
can also be enabled per request with `/studio?stream=1` for Preview QA.

The server performs auth, validation, rate limiting, monthly usage checking,
and the atomic pending-row reservation before `streamObject(`. Client-side Stop
cancels the request; `after()` keeps the abort settlement alive long enough to
mark the pending row failed.

## Stream protocol

`POST /api/generate/stream` returns newline-delimited JSON after all gates pass:

- `{"type":"meta","repurpose_id","source_hash","model"}`
- `{"type":"partial","object"}` (zero or more)
- `{"type":"done","output","usage","model","tokens_used","repurpose_id","source_hash"}`
- `{"type":"error","error","code"}` instead of `done` on stream failure

Gate failures such as 401, 402, and 429 are ordinary JSON responses. No stream
is opened.

## 402-before-spend proof

Automated proof run on 2026-07-26:

1. Built and started the production Next.js server with `PLAN_LIMIT_FREE=0`.
2. Replaced `OPENROUTER_API_KEY` in that server process with the unusable
   sentinel value `sentinel-must-not-be-called`.
3. Authenticated as the free E2E user and posted a valid request directly to
   `/api/generate/stream`.
4. Asserted status `402`, JSON content type, and
   `{"code":"limit_exceeded"}`.

Command result:

```text
[chromium] returns 402 before opening an OpenRouter stream
2 passed (setup + proof)
EXIT=0
```

Why the sentinel matters: the streaming route returns `200` as soon as it
opens. If execution had crossed the quota fence and reached OpenRouter, the
test would have received a stream and then failed against the sentinel key,
not received the asserted pre-stream `402`. The mechanical gate also places
`reservePendingRepurpose(` before `streamObject(`.

The Preview/OpenRouter Activity cross-check remains a release-owner action:
run the same request on Preview with `PLAN_LIMIT_FREE=0`, then attach the
timestamped 402 response and the matching no-request Activity window to the PR.
This document does not claim that external dashboard evidence was captured.

## Canary

The canary now exercises BOTH wire formats in one run and reports which
succeeded, because the production route sends `json_schema` (the AI SDK's
`supportsStructuredOutputs: true`) rather than `json_object`. A `json_object`-only
canary would pass while production broke if structured-output support regressed
on DeepInfra. Running both distinguishes the incidents:

- both fail → DeepInfra / model down;
- only `json_schema` fails → structured-output regression, production broken.

Rerun on 2026-07-26:

```text
json_object: OK — model=qwen/qwen3.5-397b-a17b provider=DeepInfra chunks=152 first_partial=2225ms
json_schema: OK — model=qwen/qwen3.5-397b-a17b provider=DeepInfra chunks=151 first_partial=6181ms
OUTCOME: both wire formats stream partial JSON → design stands
EXIT=0
```

Both requests use the production temperature default, the fixed
`deepinfra/fp8` allowlist, and reasoning disabled. Each fails unless the
complete output is valid JSON matching the X-thread shape with every tweet at
most 280 characters, and a partial `tweets[0].text` was readable before the
stream ended.

## Client behavior

- Flag off and no query parameter: existing non-streaming behavior.
- Flag on or `?stream=1`: partial objects paint as they arrive.
- Regenerate appends a client-only variant; no schema migration.
- Refinement chips add a bounded prompt directive and create another variant.
- Aborting an in-flight v2 clears only its preview, restores v1, and does not
  append a phantom v2 chip.
- Provider spend already incurred before an abort is **not refundable**. The
  reserved row is marked `failed`; failed rows do not count toward monthly
  usage.
- LinkedIn and Instagram edit fields show soft feed-truncation warnings and
  enforce their hard platform maxima. Email subject and every tweet enforce
  their existing hard maxima.

## Fence counts

| Guard | Expected | Actual |
| --- | ---: | ---: |
| `class GenerateApiError` | 1 | 1 |
| `callGenerateApi` | 3 | 3 |
| `callPhotoGenerateApi` | 2 | 2 |
| `PhotoGenerateApiError` | 2 | 2 |
| `setUsedCount(apiErr.usage.used)` | 1 | 1 |

Live-region count: 11 (baseline: 11).  
Variant migrations added: 0.

## Verification

- `bash scripts/ac-check.sh floor`: `EXIT=0`
- `bash scripts/ac-check.sh 4`: expected `EXIT=0`
- `npx tsc --noEmit`: `EXIT=0`
- scoped ESLint: `EXIT=0`
- `npm run build`: `EXIT=0`
- streaming partial/done/abort Playwright test: `EXIT=0`
- sentinel 402 route proof: `EXIT=0`
- OpenRouter canary: `EXIT=0`

