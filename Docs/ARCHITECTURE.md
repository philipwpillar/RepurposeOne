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
  → build prompt (brand voice + input + format spec)
  → LLM generation per selected format
  → store result (repurposes table)
  → render outputs with one-click copy/export
```

Keep the core loop boringly simple. Inputs normalise to plain text **before** the prompt layer, so the generation code never cares whether the source was a PDF or a transcript.

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
    /repurpose        # generation endpoint (server-side only)
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

## 4. Data model (initial)

All tables namespaced to the user via `user_id` and protected by RLS.

```sql
-- profiles: 1:1 with auth.users, holds plan + usage
profiles (
  id            uuid primary key references auth.users(id),
  email         text,
  plan          text not null default 'free',   -- 'free' | 'creator' | 'pro'
  stripe_customer_id text,
  created_at    timestamptz default now()
)

-- brand_voices: a user can save voice profiles
brand_voices (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id),
  name        text not null,
  description text,                  -- short written description, OR
  samples     text[],               -- 2–3 pasted samples
  created_at  timestamptz default now()
)

-- repurposes: one record per run (one input, many outputs)
repurposes (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id),
  brand_voice_id uuid references brand_voices(id),
  source_type   text not null,      -- 'paste' | 'txt' | 'pdf' | 'audio'
  source_text   text not null,      -- normalised plain text
  created_at    timestamptz default now()
)

-- outputs: one record per (repurpose, format)
outputs (
  id            uuid primary key default gen_random_uuid(),
  repurpose_id  uuid not null references repurposes(id) on delete cascade,
  user_id       uuid not null references auth.users(id),
  format        text not null,      -- 'x_thread' | 'linkedin' | 'instagram' | 'email' | ...
  content       text not null,
  tokens_used   int,                -- for cost tracking
  created_at    timestamptz default now()
)

-- usage_counters: monthly metering for plan limits
usage_counters (
  user_id       uuid not null references auth.users(id),
  period        text not null,      -- 'YYYY-MM'
  repurpose_count int not null default 0,
  primary key (user_id, period)
)
```

> **Metering decision needed** (see PRODUCT_SPEC §8): does `repurpose_count` increment per run or per output format? Schema above assumes **per run** (1 input → many formats = 1 unit). Confirm with Grok before wiring billing.

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
