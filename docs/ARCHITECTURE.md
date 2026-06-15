# ARCHITECTURE.md — RepurposeOne

> **Living document.** Technical decisions, stack, data model, and the patterns we commit to.
> Update whenever an architectural decision is made. Last updated: 2026-06-15

---

## 1. Stack

| Layer | Choice | Why |
| --- | --- | --- |
| Framework | Next.js (App Router) + TypeScript | Server components, fast to ship, Vercel-native |
| Styling | Tailwind CSS + shadcn/ui | Speed, consistent components, no design debt early |
| Auth | Supabase Auth (email + Google OAuth) | One provider for auth + DB + storage |
| Database | Supabase Postgres | Row-Level Security, easy from Next.js |
| Storage | Supabase Storage | Uploaded `.txt`/`.pdf`/audio files |
| Payments | Stripe Checkout + Customer Portal | Standard, UK/GBP-friendly, minimal custom billing UI |
| Hosting | Vercel | Zero-config Next.js deploys, preview envs |
| AI | LLM API for generation; transcription API for audio | Model choice per task — see §6 |

---

## 2. High-level flow

```
Input (paste / .txt / .pdf / audio)
  → [parse / transcribe to plain text]
  → POST /api/generate (server-side only)
      1. Authenticate (Supabase session)
      2. Validate request (Zod)
      3. Check monthly usage (count repurposes rows — reject before AI)
      4. Insert repurposes row (status: pending)
      5. Build prompt → LLM → validate JSON output (Zod)
      6. Update row (status: complete | failed)
  → return structured output to client
  → render outputs with one-click copy/export
```

Keep the core loop boringly simple. Inputs normalise to plain text **before** the prompt layer, so the generation code never cares whether the source was a PDF or a transcript.

### Generation slice (implemented)

| Piece | Path | Notes |
| --- | --- | --- |
| API route | `app/api/generate/route.ts` | Auth → usage → AI → save. Returns 402 on limit. |
| AI layer | `lib/ai/generate.ts` | Config-driven models via `AI_MODEL_FAST` / `AI_MODEL_STRONG` |
| Prompts | `lib/ai/prompts.ts` | Canonical copy also in `AI_PROMPTS.md` |
| Usage | `lib/usage.ts` | Counts `repurposes` rows in current calendar month |
| Types | `types/index.ts` | Zod schemas for request, output, API responses |
| Test UI | `app/test-generate/page.tsx` | Manual test page + curl example |

---

## 3. Suggested folder structure

```
/app
  /(marketing)        # landing page, waitlist — public
  /(app)              # authed product
    /dashboard
    /repurpose        # the core create flow
    /library          # history
    /settings         # brand voice, billing
  /api
    /generate         # generation endpoint (server-side only) — IMPLEMENTED
    /stripe/webhook   # Stripe events
    /transcribe       # audio → text
/components           # shadcn/ui + app components
/lib
  /supabase           # server + browser clients
  /ai                 # prompt builders, model wrappers
  /stripe
/docs                 # this folder — source of truth
  PRODUCT_SPEC.md
  ARCHITECTURE.md
  AI_PROMPTS.md
```

> Prompts themselves live in code under `/lib/ai`, but the canonical, reviewed versions are documented in `AI_PROMPTS.md`. Keep them in sync.

---

## 4. Data model (implemented — generation slice)

Migration: `supabase/migrations/20250615000000_initial_schema.sql`

All tables protected by RLS. Usage is **derived** by counting `repurposes` rows in the current calendar month (no mutable counter table).

```sql
profiles (
  id                      uuid primary key references auth.users(id),
  stripe_customer_id      text,
  stripe_subscription_id  text,
  plan                    text not null default 'free',  -- 'free' | 'creator' | 'pro'
  created_at              timestamptz default now()
)

brand_voices (
  id          uuid primary key,
  user_id     uuid not null references auth.users(id),
  samples     text[],
  description text,
  created_at  timestamptz default now()
)

repurposes (
  id              uuid primary key,
  user_id         uuid not null references auth.users(id),
  input_type      text not null,       -- 'paste' | 'txt' | 'pdf' | 'audio'
  input_content   text not null,
  brand_voice_id  uuid references brand_voices(id),
  target_format   text not null,       -- 'x_thread' (more formats later)
  output          jsonb,               -- validated structured output
  status          text default 'pending',  -- 'pending' | 'complete' | 'failed'
  error_message   text,
  created_at      timestamptz default now()
)
```

> **Metering:** one `repurposes` row = one unit, regardless of format. Multi-format runs in a future slice may use one parent row + child outputs; for now each generation is one row.

---

## 5. Security (non-negotiable)

- **RLS on every table.** Default policy: a user can only `select/insert/update/delete` rows where `user_id = auth.uid()`.
- **Server-side only AI calls.** Never expose model API keys to the client. Generation runs in `/api/repurpose` (route handler / server action).
- **Auth guards** on every `(app)` route — redirect unauthenticated users to login.
- **Input validation** at the API boundary (zod): max input length, allowed formats, allowed file types/sizes.
- **Stripe webhook signature verification** — never trust unverified webhook payloads.
- **Rate limiting** on generation endpoints to cap abuse and runaway cost.

---

## 6. AI: model selection & cost control

The single biggest variable cost is AI tokens. Treat model choice as a per-task decision, not a global default.

| Task | Priority | Notes |
| --- | --- | --- |
| Output generation | Quality first, then cost | Test a cheaper/faster model; only upgrade formats that visibly need it |
| Transcription | Accuracy + cost | Use a dedicated transcription API, not a chat model |
| Brand-voice extraction | Quality | Run once per voice, cache the distilled profile — don't re-derive every generation |

Cost-control patterns:
- **Cache the brand-voice profile** rather than re-sending raw samples on every call.
- **Cap input length**; summarise very long inputs before generation if needed.
- **Store `tokens_used`** per output for ongoing cost visibility.
- **One generation call per format** (parallelise), so a slow/expensive format can be swapped independently.

> Concrete model strings and pricing change frequently — confirm current models/prices before locking in. (Proposed default: Sonnet-tier for quality-sensitive formats, Haiku-tier where it holds up. Needs A/B on real inputs.)

---

## 7. Environments & secrets

- `.env.local` (never committed): Supabase URL/anon/service-role keys, Stripe keys + webhook secret, AI API keys.
- Vercel project env vars mirror `.env.local` for preview + production.
- Service-role key used **only** server-side.

---

## 8. Decisions log (technical)

Newest first.

| Date | Decision | Notes |
| --- | --- | --- |
| 2026-06-15 | Normalise all inputs to plain text before the prompt layer | Keeps generation code source-agnostic |
| 2026-06-15 | `repurposes` (run) + `outputs` (per format) split | Clean history, per-format cost tracking, independent format swaps |
| 2026-06-15 | RLS on all tables; AI calls server-side only | Security baseline |
| 2026-06-15 | Generation slice: `/api/generate`, single `repurposes` row with `output` jsonb | Simpler MVP schema; usage from row count |
| 2026-06-15 | Model selection via env (`AI_MODEL_FAST`, `AI_MODEL_STRONG`) | Swap models without code changes |
