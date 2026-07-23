# ARCHITECTURE.md — Voiceora

> **Living document.** Technical decisions, stack, data model, and the patterns we commit to.
> Update whenever an architectural decision is made. Last updated: 2026-07-23

---

## 1. Stack

| Layer | Choice | Why |
| --- | --- | --- |
| Framework | Next.js (App Router) + TypeScript | Server components, fast to ship, Vercel-native |
| Styling | Tailwind CSS + shadcn/ui + lucide-react `^1.18.0` | Speed, consistent components; lucide 1.x verified with Next 15 + React 19 |
| Auth | Supabase Auth (email + Google OAuth) | One provider for auth + DB + storage |
| Database | Supabase Postgres | Row-Level Security, easy from Next.js |
| Storage | Supabase Storage | Private `bundle-media` for Moment Bundle video sources/clips; `.txt`/`.pdf` still not wired |
| Payments | Stripe Checkout + Customer Portal | Standard, UK/GBP-friendly, minimal custom billing UI |
| Hosting | Vercel | Zero-config Next.js deploys, preview envs |
| AI | OpenRouter (Qwen fast/strong/vision tiers) | Model choice per task — see §6 |
| Mobile | Capacitor iOS shell → production URL | See `docs/MOBILE.md` |

---

## 2. High-level flow

```
Input (paste text, or photo + guided context)
  → POST /api/generate (server-side only)
      1. Authenticate (Supabase session)
      2. Validate request (Zod)
      3. Check monthly usage (count DISTINCT generation_id, complete rows — reject before AI)
      4. Insert repurposes row (status: pending)
      5. Build prompt → LLM → validate JSON output (Zod)
      6. Update row (status: complete | failed)
  → return structured output to client
  → render outputs with one-click copy/export
```

Text inputs are plain text at the prompt layer. Photo inputs use a vision model with user context as the authoritative intent signal (image informs specificity only).

### Generation slice (implemented)

| Piece | Path | Notes |
| --- | --- | --- |
| API route | `app/api/generate/route.ts` | Auth → usage → AI → save. Returns 402 on limit. |
| AI layer | `lib/ai/generate.ts` | Config-driven models via `AI_MODEL_FAST` / `AI_MODEL_STRONG` / `AI_MODEL_VISION` |
| Prompts | `lib/ai/prompts.ts` | Canonical copy also in `AI_PROMPTS.md` |
| Usage | `lib/usage.ts` | Counts DISTINCT `generation_id` (complete) in current calendar month via `count_monthly_generations` RPC; burst rate limit still counts rows |
| Types | `types/index.ts` | Zod schemas for request, output, API responses |

### Auth + product UI slice (implemented)

| Piece | Path | Notes |
| --- | --- | --- |
| Auth pages | `app/(auth)/sign-in`, `sign-up` | Email/password + optional Google OAuth |
| OAuth callback | `app/auth/callback/route.ts` | Exchanges code for session |
| Middleware | `lib/supabase/middleware.ts` | Session refresh + route protection |
| Dashboard shell | `app/(dashboard)/layout.tsx` | Protected layout + onboarding gate; usage from `lib/usage.ts` |
| Dashboard | `app/(dashboard)/dashboard` | Usage summary + recent library items |
| Studio | `app/(dashboard)/studio` | Paste + photo create flow → `/api/generate` |
| Library | `app/(dashboard)/library` | Grouped by `source_hash`; detail at `/library/[hash]/[id]` |
| Brand voice | `app/(dashboard)/brand-voice` | Samples + description; `is_default` |
| Billing | `app/(dashboard)/billing` | Stripe Checkout + Customer Portal |
| Bundles | `app/(dashboard)/bundles` | Moment Bundle photo (+ video when flagged) |
| Account | `app/(dashboard)/settings/account` | In-app account deletion |

Permanent redirects (bookmarks / old Stripe cancel URLs): `/history` → `/library`, `/upgrade` → `/billing`, `/new` → `/studio`.

---

## 3. Folder structure (current)

```
/app
  /(auth)             # sign-in, sign-up
  /(dashboard)        # authed product shell
    /dashboard
    /studio           # core create flow
    /bundles          # Moment Bundles
    /library          # history (by source_hash)
    /brand-voice
    /billing
    /settings/account # delete account
  /onboarding
  /account-deleted
  /api
    /generate
    /bundles/*        # prepare, generate, [id]
    /account/delete
    /stripe/*         # checkout, portal, webhook
/components
/lib
  /supabase
  /ai                 # prompts, generate, bundle-generate
  /image
  /video              # storage paths, verify
  /repurpose
/workers
  /ffmpeg-renderer    # Railway clip worker
/docs
```

> Prompts themselves live in code under `/lib/ai`, but the canonical, reviewed versions are documented in `AI_PROMPTS.md`. Keep them in sync.

### Conventions (going forward)

These apply to **new** code. Do not mass-reformat the repo to match.

- **Quotes:** double quotes for strings.
- **Filenames:** kebab-case for shared modules under `components/` (e.g. `sign-out-button.tsx`). PascalCase is fine for route-local `app/.../_components/` (e.g. `RepurposeWorkspace.tsx`).
- **Exports:** prefer named exports for new shared modules.

---

## 4. Data model (implemented — generation slice)

Migration: `supabase/migrations/20250615000000_initial_schema.sql` (+ follow-on migrations)

All tables protected by RLS. Usage is **derived** by counting distinct `generation_id` values on complete `repurposes` rows in the current calendar month (no mutable counter table).

```sql
profiles (
  id                      uuid primary key references auth.users(id),
  stripe_customer_id      text,
  stripe_subscription_id  text,
  plan                    text not null default 'free',  -- 'free' | 'creator' | 'pro'
  onboarding_completed_at timestamptz,
  created_at              timestamptz default now()
)

brand_voices (
  id          uuid primary key,
  user_id     uuid not null references auth.users(id),
  samples     text[],
  description text,
  is_default  boolean not null default false,
  created_at  timestamptz default now()
)

repurposes (
  id              uuid primary key,
  user_id         uuid not null references auth.users(id),
  input_type      text not null,       -- 'paste' | 'image' (+ reserved: txt/pdf/audio)
  input_content   text not null,
  brand_voice_id  uuid references brand_voices(id),
  generation_id   uuid,                -- groups multi-format runs
  source_hash     text,                -- library grouping
  target_format   text not null,       -- 'x_thread' | 'linkedin' | 'instagram' | 'email'
  output          jsonb,
  status          text default 'pending',
  error_message   text,
  tokens_used     int,                 -- (+ related token columns)
  created_at      timestamptz default now()
)
```

> **Metering:** billing counts *generations*, not rows. A multi-format "Regenerate All" run shares one `generation_id` and counts as ONE unit; single-format runs each get their own. See §4a.

## 4a. Metering & billing

**Billing unit = one generation, not one row.** A single user action that fans out to multiple formats ("Regenerate All") produces several `repurposes` rows but counts once. Single-format generations and single-format regenerates each count as their own unit.

**Why:** repurposing one input into 4 formats is one unit of delivered value. Charging 4 would burn the free-tier limit in a single click and damage free→paid conversion (target 8–15%). The meter should match perceived value.

| Concern | Mechanism |
| --- | --- |
| Grouping | Shared `generation_id` (uuid) on `repurposes` |
| Multi-format run | Client mints ONE `crypto.randomUUID()`, passes it to every format |
| Single-format run | No id sent → DB default `gen_random_uuid()` per row |
| Usage count | `count_monthly_generations` RPC: `COUNT(DISTINCT generation_id)` where status='complete' in period |
| Abuse protection | `checkRateLimit` counts ROWS (unchanged) — a shared id must not mask high-volume abuse |

**Deliberate asymmetry (do not "simplify"):** usage metering counts generations (billing fairness); rate limiting counts rows (abuse protection). Collapsing both to one counter either over-charges users or opens an abuse hole.

**Key files:** `supabase/migrations/20250616000000_add_generation_id.sql` (column + RPC + backfill), `lib/usage.ts` (`getMonthlyUsage`), `app/api/generate/route.ts` (passes `generation_id`), `types/index.ts` (`GenerateRequestSchema.generation_id`), `app/(dashboard)/studio/_components/RepurposeWorkspace.tsx` (`regenerateAll` shares the id).

**Open:** credit packs — confirm a credit maps to a generation (recommended, consistent), not a row. Carousel image generation (post-MVP) — decide if images are a separate unit or bundled into the parent generation.

---

## 5. Security (non-negotiable)

- **RLS on every table.** Users may SELECT their own rows; metering tables (`repurposes`, `bundles`, `bundle_assets`, `bundle_clips`) are **SELECT-only for authenticated** — writes go through the service-role API after auth checks. Profile billing columns are service-role-only on UPDATE; client INSERT into `profiles` is revoked (signup trigger creates the row).
- **Server-side only AI calls.** Never expose model API keys to the client. Generation runs in `/api/generate` and bundle routes.
- **Auth guards** on every `(dashboard)` route — redirect unauthenticated users to login.
- **Input validation** at the API boundary (zod): max input length, allowed formats, allowed file types/sizes.
- **Stripe webhook signature verification** — never trust unverified webhook payloads.
- **Rate / usage limits** enforced server-side before paid provider spend (monthly DISTINCT generation quota, burst caps, bundle N2).

---

## 6. AI: model selection & cost control

The single biggest variable cost is AI tokens. Treat model choice as a per-task decision, not a global default. Production provider is **OpenRouter only** (`AI_PROVIDER=openrouter`); a mis-set provider fails loudly in `lib/ai/generate.ts`.

| Task | Priority | Notes |
| --- | --- | --- |
| Output generation | Quality first, then cost | Per-format tier via `FORMAT_MODEL_TIER` (`fast` / `strong`) |
| Photo / vision | Quality + multimodal | `AI_MODEL_VISION` (defaults to strong Qwen VLM) |
| Voice input (bundles) | Native OS dictation | Server ASR withdrawn (PR #46); type or dictate into bundle `context` |
| Brand-voice extraction | Quality | Run once per voice, cache the distilled profile — don't re-derive every generation |

Cost-control patterns:
- **Cache the brand-voice profile** rather than re-sending raw samples on every call.
- **Cap input length**; summarise very long inputs before generation if needed.
- **Store token usage** per output for ongoing cost visibility.
- **One generation call per format** (parallelise), so a slow/expensive format can be swapped independently.

> Default OpenRouter Qwen 3.5 slugs (`qwen/qwen3.5-35b-a3b`, `qwen/qwen3.5-397b-a17b`) are floating (no dated OpenRouter pin as of 2026-07-23). Override via `AI_MODEL_FAST` / `AI_MODEL_STRONG` / `AI_MODEL_VISION` when you need a hard pin.

---

## 7. Environments & secrets

- `.env.local` (never committed): Supabase URL/anon/service-role keys, Stripe keys + webhook secret, OpenRouter API key.
- Vercel project env vars mirror `.env.local` for preview + production.
- Service-role key used **only** server-side.

---

## 8. Decisions log (technical)

Newest first.

| Date | Decision | Notes |
| --- | --- | --- |
| 2026-07-14 | Routes rename: `/history` → `/library`, `/upgrade` → `/billing`; drop legacy `(app)` shell | Permanent redirects retained for bookmarks + pre-deploy Stripe cancel URLs |
| 2026-07-14 | OpenRouter-only AI client; no silent OpenAI fallback | Mis-set `AI_PROVIDER` throws |
| 2026-06-16 | Billing unit = generation, not row: `generation_id` + `count_monthly_generations` DISTINCT RPC; rate limit still counts rows | Supersedes the 2026-06-15 "one row = one unit" assumption. See §4a |
| 2026-06-15 | Normalise text inputs to plain text before the prompt layer | Keeps generation code source-agnostic for text paths |
| 2026-06-15 | `repurposes` (run) + `outputs` (per format) split — **SUPERSEDED / NOT BUILT** | Considered early for clean history, per-format cost tracking, and independent format swaps. Never implemented: shipped model is a single `repurposes` table (one row per format) + `generation_id` grouping. Rejected for MVP to avoid migration on working code and protect speed to first revenue. Revisit only post-revenue if library/history UX or per-run features demand native parent/child. (Decision: 2026-06-16) |
| 2026-06-15 | RLS on all tables; AI calls server-side only | Security baseline |
| 2026-06-15 | Generation slice: `/api/generate`, single `repurposes` row with `output` jsonb | Simpler MVP schema; usage from generation count |
| 2026-06-15 | Model selection via env (`AI_MODEL_FAST`, `AI_MODEL_STRONG`) | Swap models without code changes |
