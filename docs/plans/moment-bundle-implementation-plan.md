# Moment Bundle + Rendered Clips — Implementation Plan

**Date:** 2026-07-12  
**Baseline:** `main` @ `9a6c01c`  
**Status:** Planning only — no application code, migrations, or deps in this PR  
**Context:** Voiceora Moment Bundle Technical Plan v2 (2026-07-12) · Cursor planning brief 2026-07-12

This document is the decision-ready implementation plan for the **Moment Bundle** add-on: multimodal input (photos, short videos, optional voice/text) → social pack (captions, platform posts, finished rendered clips). Settled product decisions are taken as given; options below are ranked with a recommendation.

---

## Settled product constraints (not open)

- Bundle is an **add-on**; single-input studio remains primary and untouched beyond the plan-gate refactor (§7).
- No image generation — user's own photos only.
- Rendering is **in-app** (our compute), not a third-party clipping API.
- Gated behind new tier **Pro Plus** (~£59/mo); Free / Creator / Pro semantics unchanged.
- Analysis uses existing Qwen/OpenRouter stack. **Full video never goes to the AI provider** — client-sampled frames (+ ASR if speech) only. Full video → Supabase Storage → render worker only.
- Styled static captions v1; animated word-timed captions = fast-follow only.
- Landscape → center-crop v1 (no AI speaker tracking).

---

## 1. Data model

### Recommendation

Three new tables (`bundles`, `bundle_assets`, `bundle_clips`) plus nullable `repurposes.bundle_id`. Denormalize `user_id` onto every child row so RLS stays `auth.uid() = user_id` (matches existing `repurposes` / `brand_voices`; the repo has no join-based RLS examples).

### Alternatives considered

| Rank | Option | Verdict |
|------|--------|---------|
| 1 | Separate `bundles` / `bundle_assets` / `bundle_clips` + `repurposes.bundle_id` | **Recommended** — clear ownership, per-clip render status, text outputs reuse history |
| 2 | Stuff clip specs into `bundles.output` jsonb only | Rejected — cannot track per-clip render/retry cleanly |
| 3 | Parent/child under `repurposes` only | Rejected — ARCHITECTURE.md already rejected outputs split; bundles are a different product surface |

### Proposed columns

#### `bundles`

| Column | Type | Notes |
|--------|------|--------|
| `id` | `uuid` PK `gen_random_uuid()` | |
| `user_id` | `uuid` → `auth.users` ON DELETE CASCADE | |
| `title` | `text` nullable | Optional user label |
| `context` | `text` nullable | Free-text activity context |
| `status` | `text` | `pending` \| `analyzing` \| `rendering` \| `complete` \| `failed` |
| `error_message` | `text` nullable | |
| `generation_id` | `uuid` not null default `gen_random_uuid()` | Shared with linked `repurposes` for billing |
| `tokens_used` | `integer` nullable | Sum across multi-calls |
| `prompt_tokens` | `integer` nullable | |
| `completion_tokens` | `integer` nullable | |
| `model` | `text` nullable | Primary model id used |
| `created_at` | `timestamptz` default `now()` | |
| `updated_at` | `timestamptz` default `now()` | |

Indexes: `(user_id, created_at desc)`, `(status, updated_at)` for worker polling.

#### `bundle_assets`

| Column | Type | Notes |
|--------|------|--------|
| `id` | `uuid` PK | |
| `user_id` | `uuid` | Denormalized for RLS |
| `bundle_id` | `uuid` → `bundles` ON DELETE CASCADE | |
| `kind` | `text` | `photo` \| `video` \| `voice` \| `text` |
| `storage_path` | `text` nullable | Required for `video` / `voice`; null for photos (request-ephemeral base64, same as today) |
| `mime_type` | `text` nullable | |
| `duration_s` | `numeric` nullable | Video / voice |
| `width` / `height` | `integer` nullable | |
| `sort_order` | `integer` not null default 0 | Posting-order candidate / display |
| `metadata` | `jsonb` not null default `{}` | e.g. original filename, sample frame count |
| `created_at` | `timestamptz` | |

Indexes: `(bundle_id, sort_order)`, `(user_id, bundle_id)`.

**Photos are not persisted as bytes in DB or Storage in Phase 1** — only metadata + captions land; image bytes stay in the generate request (existing photo pattern). Videos/voice always use Storage.

#### `bundle_clips`

| Column | Type | Notes |
|--------|------|--------|
| `id` | `uuid` PK | |
| `user_id` | `uuid` | Denormalized |
| `bundle_id` | `uuid` → `bundles` ON DELETE CASCADE | |
| `asset_id` | `uuid` → `bundle_assets` ON DELETE CASCADE | Source video |
| `start_s` / `end_s` | `numeric` not null | Clip window |
| `overlay_text` | `text` nullable | Burned-in caption text |
| `caption` | `text` nullable | Social caption (not necessarily burned in) |
| `tags` | `text[]` not null default `{}` | |
| `render_status` | `text` | `pending` \| `rendering` \| `complete` \| `failed` |
| `output_storage_path` | `text` nullable | Rendered MP4 |
| `error_message` | `text` nullable | |
| `attempt_count` | `integer` not null default 0 | |
| `created_at` / `updated_at` | `timestamptz` | |

Constraint: `end_s > start_s`. Indexes: `(bundle_id)`, `(render_status, updated_at)` for worker.

#### `repurposes.bundle_id`

```sql
alter table public.repurposes
  add column bundle_id uuid references public.bundles (id) on delete set null;

create index repurposes_bundle_id_idx on public.repurposes (bundle_id)
  where bundle_id is not null;
```

Platform posts (X, LinkedIn, Instagram, email) insert as normal `repurposes` rows with the shared `generation_id` and `bundle_id` set — history, copy, and export panels keep working.

### Draft migration SQL (documentation only — do not apply in this PR)

```sql
-- Moment Bundle schema (draft — implement in Brief 1a)
-- Mirrors RLS / grants patterns from 20250615000000_initial_schema.sql

create table public.bundles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text,
  context text,
  status text not null default 'pending'
    check (status in ('pending', 'analyzing', 'rendering', 'complete', 'failed')),
  error_message text,
  generation_id uuid not null default gen_random_uuid(),
  tokens_used integer,
  prompt_tokens integer,
  completion_tokens integer,
  model text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index bundles_user_id_created_at_idx
  on public.bundles (user_id, created_at desc);
create index bundles_status_updated_at_idx
  on public.bundles (status, updated_at);

alter table public.bundles enable row level security;

create policy "Users can view own bundles"
  on public.bundles for select using (auth.uid() = user_id);
create policy "Users can insert own bundles"
  on public.bundles for insert with check (auth.uid() = user_id);
create policy "Users can update own bundles"
  on public.bundles for update using (auth.uid() = user_id);
create policy "Users can delete own bundles"
  on public.bundles for delete using (auth.uid() = user_id);

create table public.bundle_assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  bundle_id uuid not null references public.bundles (id) on delete cascade,
  kind text not null check (kind in ('photo', 'video', 'voice', 'text')),
  storage_path text,
  mime_type text,
  duration_s numeric,
  width integer,
  height integer,
  sort_order integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint bundle_assets_storage_for_media
    check (
      (kind in ('video', 'voice') and storage_path is not null)
      or (kind in ('photo', 'text'))
    )
);

create index bundle_assets_bundle_id_sort_idx
  on public.bundle_assets (bundle_id, sort_order);
create index bundle_assets_user_bundle_idx
  on public.bundle_assets (user_id, bundle_id);

alter table public.bundle_assets enable row level security;

create policy "Users can view own bundle_assets"
  on public.bundle_assets for select using (auth.uid() = user_id);
create policy "Users can insert own bundle_assets"
  on public.bundle_assets for insert with check (auth.uid() = user_id);
create policy "Users can update own bundle_assets"
  on public.bundle_assets for update using (auth.uid() = user_id);
create policy "Users can delete own bundle_assets"
  on public.bundle_assets for delete using (auth.uid() = user_id);

create table public.bundle_clips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  bundle_id uuid not null references public.bundles (id) on delete cascade,
  asset_id uuid not null references public.bundle_assets (id) on delete cascade,
  start_s numeric not null,
  end_s numeric not null,
  overlay_text text,
  caption text,
  tags text[] not null default '{}',
  render_status text not null default 'pending'
    check (render_status in ('pending', 'rendering', 'complete', 'failed')),
  output_storage_path text,
  error_message text,
  attempt_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bundle_clips_window_valid check (end_s > start_s)
);

create index bundle_clips_bundle_id_idx on public.bundle_clips (bundle_id);
create index bundle_clips_render_status_idx
  on public.bundle_clips (render_status, updated_at);

alter table public.bundle_clips enable row level security;

create policy "Users can view own bundle_clips"
  on public.bundle_clips for select using (auth.uid() = user_id);
create policy "Users can insert own bundle_clips"
  on public.bundle_clips for insert with check (auth.uid() = user_id);
create policy "Users can update own bundle_clips"
  on public.bundle_clips for update using (auth.uid() = user_id);
create policy "Users can delete own bundle_clips"
  on public.bundle_clips for delete using (auth.uid() = user_id);

alter table public.repurposes
  add column bundle_id uuid references public.bundles (id) on delete set null;

create index repurposes_bundle_id_idx on public.repurposes (bundle_id)
  where bundle_id is not null;

grant select, insert, update, delete on public.bundles to authenticated;
grant select, insert, update, delete on public.bundle_assets to authenticated;
grant select, insert, update, delete on public.bundle_clips to authenticated;
```

**Worker access:** render updates use the Supabase **service role** (same pattern as Stripe webhook profile updates via `lib/supabase/admin.ts`). RLS does not need a special worker policy if all worker writes go through the service client.

---

## 2. Upload & storage

### Recommendation

- One private bucket: **`bundle-media`** in the existing London project (`eu-west-2`).
- Path scheme:
  - Source video/voice: `{user_id}/{bundle_id}/{asset_id}.{ext}`
  - Rendered clip: `{user_id}/{bundle_id}/clips/{clip_id}.mp4`
- Flow: authenticated Next.js route creates a **signed upload URL** (service role) → client PUTs directly to Storage (bypasses Vercel body limits) → app records `storage_path` on `bundle_assets`.
- Photos: **keep inline base64** after the existing 1024px downscale pipeline (`lib/image/downscale.ts`). Do not put photos in Storage for v1.

### Alternatives considered

| Rank | Option | Verdict |
|------|--------|---------|
| 1 | Signed upload URLs + private bucket | **Recommended** — avoids Vercel payload limits; owner-scoped paths |
| 2 | Upload through Next.js API body | Rejected for video — body size / timeout |
| 3 | Public bucket + obscurity | Rejected — GDPR / leakage risk |

### Caps (client + server)

| Asset | Cap | Where enforced |
|-------|-----|----------------|
| Photos / bundle | **8** | Client UI + generate Zod |
| Photo file | Existing 10 MB / 1024px edge | `lib/image/*` |
| Videos / bundle | **2** | Client + API |
| Video duration | **≤ 180 s** (~3 min) | Client metadata + server probe via worker / optional API check |
| Video size | **≤ 100 MB** each | Signed-upload route + Storage policy if available |
| Voice | **≤ 300 s**, **≤ 25 MB** | Same |
| Frame sample rate | ~1 / 2 s, max ~90 frames / video | Client sampler |

### Source-video lifecycle

1. Retain source until **all** `bundle_clips` for that `asset_id` are `complete` or `failed`.
2. Then delete the source object from Storage (keep DB row + metadata).
3. Retain rendered clips for a policy period (recommend **30 days**; exact days = Open Question for Phil).
4. Failed analysis before render: delete source on bundle `failed` after a short grace (e.g. 24 h) so retries are possible.

### Storage policies (draft intent)

- Bucket not public.
- Authenticated users: upload/read only under `{auth.uid()}/...`.
- Service role: full access for worker download/upload/delete.
- No anonymous access.

---

## 3. Client-side video frame sampling

### Recommendation

Primary path: **`HTMLVideoElement` + canvas draw** — seek to `t = 0, 2, 4, …`, draw frame, downscale longest edge to `PHOTO_MAX_EDGE_PX` (1024) via shared helpers (extract or reuse canvas scale logic from `lib/image/downscale.ts`), encode JPEG ~0.85, strip data-URL prefix → raw base64.

WebCodecs (`VideoFrame` extractor) as an **optional fast path** when available; **canvas fallback required** for Capacitor iOS WKWebView.

### Alternatives considered

| Rank | Option | Verdict |
|------|--------|---------|
| 1 | Canvas seek loop + 1024 JPEG | **Recommended** — widest support; matches photo pipeline |
| 2 | WebCodecs only | Rejected as sole path — Capacitor iOS risk |
| 3 | Server-side ffmpeg frame extract before analysis | Rejected — defeats “AI never sees full video” privacy story if frames are extracted server-side from full file in the same hop as provider; also couples analysis to worker |

### Payload shape (vision call)

```ts
// Conceptual — Zod in §4
{
  context: string;
  photos: Array<{ asset_id: string; image_base64: string; image_mime: "jpeg"|"png"|"webp" }>;
  video_frames: Array<{
    asset_id: string;
    frames: Array<{ timestamp_s: number; image_base64: string; image_mime: "jpeg" }>;
  }>;
  transcript?: string; // ASR if speech present
}
```

OpenRouter multimodal message: system prompt + user parts = text block (context, timestamps legend, brand voice) + ordered `image_url` parts (photos first, then frames labeled by timestamp in adjacent text parts).

**Invariant:** full video file bytes never appear in the OpenRouter request.

### Capacitor iOS risks & validation

| Risk | Mitigation / spike |
|------|-------------------|
| Memory with ~90 JPEGs | Process & upload/discard incrementally; hard cap frames; spike on device |
| Codec (HEVC from Camera) | Validate `video/mp4` + HEVC decode in WKWebView; fallback message if seek fails |
| Seek accuracy | Allow ±0.25 s; don't require frame-accurate cuts for analysis |
| Background tab throttling | Keep sampling on foreground; show progress UI |

**Spike (before Brief 2a ships):** sample a 3-min phone vertical MP4 on iOS Capacitor shell; record peak JS heap and wall time.

---

## 4. Generation contract

### Recommendation

**New parallel surface** — do not overload `POST /api/generate` or studio fan-out:

- `POST /api/bundles/generate` (and later upload/status routes under `/api/bundles/*`)
- Client: `lib/repurpose/bundle-generate-client.ts` → `BundleGenerateApiError` + `callBundleGenerateApi`
- New workspace under `/studio/bundles` (or `/bundles`) — **sibling** to `RepurposeWorkspace`, not inside it

### Reuse vs duplicate

| Concern | Reuse (import) | Do not fork |
|---------|----------------|-------------|
| Auth session | `createClient` pattern from generate route | — |
| Usage / rate limit | `checkUsageLimit`, `checkRateLimit`, `getUserPlan` | — |
| Brand voice | `resolveBrandVoice`, `buildBrandVoiceBlock` | — |
| Audit status | pending → complete/failed on `bundles` + `repurposes` | Don't invent a second billing counter |
| Token fields | Write per-call; **sum** onto `bundles` | — |
| Output shapes for platforms | Existing `RepurposeOutputSchema` per format | Don't redefine X/LinkedIn/IG/email |
| Photo downscale | `lib/image/*` | — |

| Concern | New / parallel |
|---------|----------------|
| Request Zod | `BundleGenerateRequestSchema` |
| Structured pack output | `BundlePackOutputSchema` (captions, order, clip_specs) |
| Vision multi-image orchestration | `lib/ai/bundle-generate.ts` |
| Prompts | `buildBundleGenerationPrompt` in `lib/ai/prompts.ts` (extend file, don't rewrite format systems) |

### Zod sketches

```ts
// Clip spec from model (then persisted as bundle_clips)
ClipSpecSchema = z.object({
  asset_id: z.string().uuid(),
  start_s: z.number().nonnegative(),
  end_s: z.number().positive(),
  overlay_text: z.string().max(120).optional(),
  caption: z.string().max(2200),
  tags: z.array(z.string().max(40)).max(12),
}).refine((c) => c.end_s > c.start_s && c.end_s - c.start_s <= 45);

PhotoCaptionSchema = z.object({
  asset_id: z.string().uuid(),
  caption: z.string().max(2200),
  alt_text: z.string().max(500).optional(),
});

BundlePackOutputSchema = z.object({
  posting_order: z.array(z.string().uuid()), // asset ids
  photo_captions: z.array(PhotoCaptionSchema),
  hashtags: z.array(z.string()).max(20).optional(),
  clip_specs: z.array(ClipSpecSchema).max(6), // 2–3 per video × ≤2 videos
  // Platform posts: either embedded or produced as separate generateRepurpose calls
  // sharing generation_id — prefer separate calls writing repurposes rows (reuse schemas)
});
```

### Model tiering

| Call | Model | Rationale |
|------|-------|-----------|
| Multimodal pack (frames + photos → captions, order, clip_specs, hashtags, alt) | `AI_MODEL_VISION` | Needs images |
| Platform posts (X / LinkedIn / email) from pack summary text | `AI_MODEL_STRONG` via existing `getModelForFormat` | Coherence |
| Instagram caption polish | `AI_MODEL_FAST` via format tier | Short / cheap |

**v1 recommendation:** **one vision structured call** for the pack + clip specs; then **up to four** format calls (or fewer if UI selects formats) sharing `generation_id`, feeding condensed pack JSON + brand voice as `input_content` — **without** re-sending images. That keeps vision cost bounded and reuses `generateRepurpose`.

### Fence confirmation (protected)

Under this plan, the following in `app/(dashboard)/studio/_components/RepurposeWorkspace.tsx` receive **zero modification**:

- `GenerateApiError`
- `callGenerateApi`
- `402` / error-path `setUsedCount(err.usage.used)` branches tied to those callers
- Imports / usage of `PhotoGenerateApiError` / `callPhotoGenerateApi`

Phase 0 may edit **only** the plan-gate expressions (`userPlan !== 'free'` / `userPlan === 'free'` → `planAllowsVision`) in that file — those lines are outside the API fence. If a brief would need to touch the fence blocks, the brief is wrong; redesign.

---

## 5. Render worker (new runtime)

### Host options

| Rank | Host | Cost / ops | Verdict |
|------|------|------------|---------|
| 1 | **Railway** | ~£5–10/mo; scale-to-zero; simple Dockerfile + env UI | **Recommended** for solo founder |
| 2 | Fly.io | Similar cost; more knobs (machines, volumes) | Viable runner-up |
| 3 | Render / EC2 always-on | Higher idle cost | Overkill at v1 volume |
| 4 | Vercel / Supabase Edge | No practical ffmpeg | Rejected |

### Worker responsibilities

1. Claim next clip job (`render_status = pending`, `attempt_count < 2`) — optimistic lock via `update … where render_status = 'pending'`.
2. Download source from Storage with service role.
3. ffmpeg: trim `[start_s, end_s]`; if landscape, center-crop to 9:16; scale to **1080×1920**; burn **static** overlay via `drawtext` or ASS `subtitles` filter; encode H.264 + AAC, sensible bitrate (~4–6 Mbps video).
4. Bundle fonts (Inter and/or Space Grotesk) in the worker image — do not rely on system fonts.
5. Upload rendered MP4 to `output_storage_path`; set `render_status = complete`.
6. On failure: increment `attempt_count`; set `failed` after max attempts; leave sibling clips alone (**partial success OK**).
7. When all clips for a bundle are terminal, set `bundles.status` to `complete` or `failed` (failed only if **zero** clips succeeded and analysis had clips — define: `complete` if ≥1 clip ok or no clips; `failed` if analysis failed earlier).

### Job dispatch

| Rank | Mechanism | Verdict |
|------|-----------|---------|
| 1 | **DB polling ~5 s** + optional authenticated HTTP wake from Vercel on clip insert | **Recommended** — poll is source of truth; wake cuts latency |
| 2 | Queue (Inngest / SQS / Redis) | Extra infra; defer |
| 3 | Wake-only webhook | Rejected alone — missed wakes leave jobs stuck |

Env (worker): `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `WORKER_WAKE_SECRET`, optional `SENTRY_DSN`.

### Failure / timeout / idempotency

- Max **2** attempts per clip.
- Bundle render wall-clock timeout ~**10 minutes**; stuck `rendering` rows reaped back to `pending` or `failed` by a sweeper.
- Idempotent: if `render_status = complete` and `output_storage_path` set, skip.
- Validate clip specs server-side before insert: duration ≤ 45 s, within source duration, `asset_id` belongs to bundle and `kind = video`.

### Security

- Service role only on worker; never expose to browser.
- Worker HTTP wake endpoint: shared secret + no public admin UI.
- Network: outbound only to Supabase; no open inbound except wake + health.
- Reject path traversal in storage paths; always prefix with known `user_id/bundle_id`.

---

## 6. Async job model & UI states

### State machine

```
bundles.status:
  pending → analyzing → rendering → complete
                    ↘ failed
              analyzing → complete   (photo-only pack, no clips)
```

```
bundle_clips.render_status:
  pending → rendering → complete
                     ↘ failed (retry → pending until attempt_count max)
```

Job state lives on **`bundles` + `bundle_clips`** (no separate `bundle_jobs` table in v1 — status columns are enough). Revisit a jobs table only if we add non-render async work.

### Client observation

| Rank | Option | Verdict |
|------|--------|---------|
| 1 | **HTTP polling 2–3 s** on `GET /api/bundles/[id]` | **Recommended** for v1 — simple, no Realtime wiring |
| 2 | Supabase Realtime on `bundles` / `bundle_clips` | Fast-follow when polling UX feels laggy |

### UI surfaces (new files; not inside fenced studio generate path)

- Multi-asset uploader (photos + videos + optional voice/text)
- Progress: analyzing / rendering / per-clip status
- Clip preview `<video>` + download (signed download URL)
- Text layer: per-photo captions, platform posts — **reuse** existing copy-button / export patterns from history/studio output panels (extract shared presentational bits if needed; do not route through `callGenerateApi`)

Nav: add entry once Phase 1 ships (exact placement = Open Question; default recommend under Studio as **Bundles** tab/route `/studio/bundles`).

---

## 7. Pro Plus tier & gating

### Stripe / plan plumbing

1. Stripe Product + Price (~£59/mo) → env `STRIPE_PRICE_ID_PRO_PLUS`.
2. Extend `PlanSchema`: `"free" | "creator" | "pro" | "pro_plus"`.
3. Migration: alter `profiles.plan` CHECK to include `pro_plus`.
4. `lib/config.ts`: `PLAN_LIMITS.pro_plus`, `UPGRADE_MESSAGES` (Pro at-limit should mention Pro Plus).
5. `lib/stripe.ts`: `getStripePriceId` / `planFromPriceId` include Pro Plus.
6. `app/api/stripe/checkout/route.ts`: checkout enum includes `pro_plus`.
7. Webhook handlers: widen plan unions to `Plan`.
8. `UpgradePlans.tsx`: third card; fix `PaidPlan`, `hasPaidPlan`, downgrade matrix (Pro Plus ↔ Pro ↔ Creator via portal).

### Plan-gate refactor (blocking before third tier)

Today: server uses allowlist `VISION_ALLOWED_PLANS`; client hardcodes `!== 'free'`. A fourth plan that is paid-but-not-vision (or vision-but-not-bundle) would diverge.

**Pattern to ship:**

```ts
// lib/config.ts
export const VISION_ALLOWED_PLANS: Plan[] = ["creator", "pro", "pro_plus"];
export const BUNDLE_ALLOWED_PLANS: Plan[] = ["pro_plus"];

export function planAllowsVision(plan: Plan): boolean { … }
export function planAllowsBundles(plan: Plan): boolean { … }
```

### Every file the plan-gate refactor touches

| File | Change |
|------|--------|
| `lib/config.ts` | Shared allowlists + `planAllowsBundles` |
| `types/index.ts` | `PlanSchema` (+ later with 0b) |
| `app/(dashboard)/studio/_components/PhotoUpgradeGate.tsx` | `!planAllowsVision(plan)` instead of `plan !== "free"` |
| `app/(dashboard)/studio/_components/RepurposeWorkspace.tsx` | **Only** `canGeneratePhoto` / `generatePhotoFormat` plan checks → `planAllowsVision`; **do not** touch fence blocks |
| `app/api/generate/route.ts` | Keep `planAllowsVision`; update 403 copy to include Pro Plus when 0b lands |
| `app/(dashboard)/upgrade/_components/UpgradePlans.tsx` | Cards / PaidPlan (with 0b) |
| `lib/stripe.ts` | Price mapping (0b) |
| `app/api/stripe/checkout/route.ts` | Enum (0b) |
| `app/api/stripe/webhook/route.ts` | Plan unions (0b) |
| `.env.example` | `STRIPE_PRICE_ID_PRO_PLUS`, `PLAN_LIMIT_PRO_PLUS` |
| DB migration | `profiles.plan` CHECK |

Bundle API routes gate with `planAllowsBundles` only.

### Billing semantics

- One Moment Bundle run = **one** billable generation: shared `generation_id` on `bundles` and all linked `repurposes` rows; `count_monthly_generations` unchanged.
- Failed analysis → `bundles.status = failed`, no complete `repurposes` → **not billed** (same as today).
- Partial render failure after successful analysis: still billed (user received text pack); clips retryable.
- Token recording: store per AI call on `repurposes` where applicable; **sum** `tokens_used` / prompt / completion onto `bundles` for economics dashboards. No quota change based on tokens.

**Pro Plus monthly limit:** recommend starting at **500** (between Creator 100 and Pro 1000) given heavier per-run cost — **Phil confirms** (Open Questions).

---

## 8. Impact map & sequencing

### File-level impact map (implementation phases — not this PR)

#### Existing files touched

| File | Why |
|------|-----|
| `types/index.ts` | `Plan`, bundle Zod schemas |
| `lib/config.ts` | Limits, allowlists, upgrade copy |
| `lib/stripe.ts` | Pro Plus price IDs |
| `lib/usage.ts` | Possibly `getUpgradeMessage` paths only |
| `lib/ai/prompts.ts` | Bundle prompt builders |
| `lib/ai/generate.ts` | Or sibling `bundle-generate.ts` importing shared pieces |
| `app/api/generate/route.ts` | Copy / vision allowlist only |
| `app/api/stripe/checkout/route.ts` | `pro_plus` |
| `app/api/stripe/webhook/route.ts` | Plan mapping |
| `app/(dashboard)/upgrade/_components/UpgradePlans.tsx` | UI card |
| `app/(dashboard)/upgrade/page.tsx` | If plan props widen |
| `app/(dashboard)/_components/dashboard-shell.tsx` | Nav link |
| `components/app/app-shell.tsx` | Plan label if needed |
| `app/(dashboard)/studio/_components/PhotoUpgradeGate.tsx` | Allowlist |
| `app/(dashboard)/studio/_components/RepurposeWorkspace.tsx` | Plan-gate lines **only** |
| `.env.example` | New env vars |
| `docs/PRODUCT_SPEC.md` / `docs/ARCHITECTURE.md` | Sync when implementing (optional per brief) |

#### New files / directories (expected)

| Path | Role |
|------|------|
| `supabase/migrations/*_moment_bundle_tables.sql` | §1 |
| `supabase/migrations/*_profiles_plan_pro_plus.sql` | Plan CHECK |
| `supabase/migrations/*_bundle_media_bucket.sql` | Storage bucket/policies (or dashboard + SQL) |
| `app/api/bundles/**` | create, upload URL, generate, get status |
| `app/api/transcribe/route.ts` | ASR (Phase 2) |
| `lib/repurpose/bundle-generate-client.ts` | Client fence sibling |
| `lib/image/sample-video-frames.ts` | Frame sampler |
| `lib/ai/bundle-generate.ts` | Vision pack call |
| `app/(dashboard)/studio/bundles/**` | Bundle workspace UI |
| `workers/ffmpeg-renderer/**` | Dockerfile, poll loop, ffmpeg pipeline |

#### New env vars

**App (Vercel):** `STRIPE_PRICE_ID_PRO_PLUS`, `PLAN_LIMIT_PRO_PLUS`, `WORKER_WAKE_URL` (optional), `WORKER_WAKE_SECRET`, Storage already via Supabase keys.

**Worker (Railway):** `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `WORKER_WAKE_SECRET`, font paths if needed.

### Fence confirmation

**Confirmed:** this plan requires **zero modification** to the protected fence (`GenerateApiError`, `callGenerateApi`, 402 `setUsedCount` branches for those callers, `PhotoGenerateApiError` / `callPhotoGenerateApi` usage). Bundle work is a parallel client + route. Plan-gate-only edits in `RepurposeWorkspace.tsx` are allowed and listed in §7.

### Brief decomposition (12 briefs)

| ID | Scope | Depends on | Out-of-scope fence |
|----|-------|------------|--------------------|
| **0a** | Shared `planAllowsVision` client refactor; no Stripe yet | — | No Pro Plus product; no bundle UI; **no studio generate fence edits** |
| **0b** | `pro_plus` enum, Stripe price, checkout, webhook, upgrade card, `BUNDLE_ALLOWED_PLANS` | 0a | No bundle generate; no worker |
| **1a** | Migrations: bundles / assets / clips + `repurposes.bundle_id` + RLS/grants | — | No API UI; no Storage bucket required yet |
| **1b** | `POST /api/bundles/generate` photo-pack only (captions, order, platform posts); Zod; usage | 0a, 1a | No video frames; no clips; no worker |
| **1c** | `/studio/bundles` photo-only workspace + uploader + copy actions | 1b | No video; no render UI |
| **2a** | Client frame sampler lib + unit/manual spike notes; feature-flagged | — | No production generate wiring required to merge spike harness |
| **2b** | `POST /api/transcribe` (ASR) for audio blobs / voice assets | — | No bundle UI wiring yet |
| **2c** | Wire frames (+ optional transcript) into bundle generate → `clip_specs` + UI list (timestamps, no MP4 yet) | 2a, 1b | No ffmpeg; no Storage video upload required if frames-only path tested with local file |
| **3a** | `bundle-media` bucket, signed upload/download routes, video asset rows | 1a | No worker |
| **3b** | Railway worker, poll/wake, ffmpeg trim+caption burn, clip row updates | 3a, 2c | No animated captions; no smart crop |
| **3c** | Clip preview players, download, bundle status polling UX | 3b | No scheduling/publish |
| **4** | Voice-note upload → transcribe → bundle `context` | 2b, 1c | No new render features |

**Phases 0–4 ≈ 12 briefs** (within 9–13 target). Phase 1 (0a–1c) is independently demo-able without the worker. Phase 3 is the Pro Plus headline.

### Per-phase manual QA outline

**Phase 0:** Free user blocked from vision via allowlist; Creator/Pro still allowed; Pro Plus checkout maps plan; portal upgrades/downgrades.

**Phase 1:** 3–8 photos → captions + order + 4 formats; one generation_id billed; history shows linked rows; free/creator/pro **cannot** call bundle API; Pro Plus can.

**Phase 2:** Frame sampler on desktop + iOS; clip specs sensible; ASR on short voice; full video absent from OpenRouter network tab.

**Phase 3:** Upload video → render 2–3 clips; partial failure leaves successful clips downloadable; source deleted after terminal clips; 1080×1920 playback.

**Phase 4:** Voice memo alone adds context to pack quality.

---

## 9. Costs, risks, open questions

### Estimated per-bundle cost (order of magnitude)

| Component | Estimate | Notes |
|-----------|----------|-------|
| Vision call (~8 photos + ~40–90 frames) | **Dominant** — roughly $0.05–0.30+ depending on Qwen/OpenRouter pricing and image tokens | Biggest variable |
| 4× text format calls | Low cents | Existing strong/fast mix |
| ASR (if voice/speech) | Low cents | Whisper-class |
| Railway CPU for 2–3 clips | **Pennies** | Seconds of ffmpeg each |
| Storage + egress | Low | Delete sources promptly |

Validate with `tokens_*` columns after Phase 1–2 betas before locking Pro Plus limit.

### Top technical risks (ranked) + validation spikes

| Rank | Risk | Spike |
|------|------|-------|
| 1 | Capacitor iOS memory / codec during frame sampling | Device spike: 3-min HEVC/MP4 → frames; measure crashes |
| 2 | Qwen quality with many images (clip pick + captions) | Offline eval: 40 frames + 5 photos → structured JSON quality |
| 3 | ffmpeg static caption styling (brand-consistent, safe margins) | One-off script on sample vertical clip; font bundle |
| 4 | Worker ops (secrets, wake auth, stuck jobs) | Deploy empty health worker on Railway; exercise claim SQL |
| 5 | GDPR / Alibaba-hosted analysis for photos & frames | Policy review **before** Phase 1 beta (see Standing flags in tech plan v2) |

### Open questions (Phil decides)

These are **not** recommendations — implementation should not guess silently:

1. Exact **Pro Plus monthly generation limit** (plan recommends 500 as a starting proposal).
2. **Rendered clip retention** days (plan recommends 30).
3. Stripe **product/price naming** in Dashboard (customer-facing “Pro Plus”).
4. Bundle IA: **`/studio/bundles` vs top-level `/bundles`** nav.
5. Timing of **GDPR / data-policy review** relative to photo-pack beta (tech plan: gates Phase 1).
6. Whether Pro Plus includes a higher **burst rate limit** than Pro for multi-call bundle runs.

### Recommendations summary (agent decisions, not Phil blockers)

- Railway + DB poll (+ optional wake)
- Client polling for UI status
- Photos base64 / video Storage
- 8 photos, 2 videos, 3 min, canvas frame sampling
- Parallel `/api/bundles/*` + sibling client
- One vision pack call + reused format generates sharing `generation_id`
- Static captions, center-crop landscape
- Plan allowlists before enabling Pro Plus checkout

---

## Out of scope (extension points only)

| Item | Note |
|------|------|
| Animated / word-timed captions | Extension: replace `drawtext` with ASS karaoke / Whisper timestamps in worker |
| AI reframing / speaker tracking | Extension after center-crop v1 |
| Image generation or editing | Never in v1 |
| Longform (>5 min) / podcast clipping | Different product |
| Scheduling / direct publishing | Separate |
| Annual pricing | Existing “not yet supported”; extend with three tiers later |
| Single-input studio changes | Only plan-gate refactor in §7 |

---

## Acceptance for this planning PR

- [x] Branch `plan/moment-bundle`
- [x] Single added file `docs/plans/moment-bundle-implementation-plan.md`
- [ ] PR opened; **do not merge**; **do not start Brief 0a** from this session
