-- Moment Bundle schema
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

-- Monthly bundle count for the N2 cap (30/mo on Pro Plus).
-- Failed bundles are excluded (mirrors the not-billed rule for failed
-- generations); in-flight bundles DO count, so concurrent creation
-- cannot bypass the cap.
create or replace function public.count_monthly_bundles(
  p_user_id uuid,
  p_start timestamptz,
  p_end timestamptz
)
returns integer
language sql
security definer
set search_path = public
as $$
  select count(*)::int
  from public.bundles
  where user_id = p_user_id
    and status <> 'failed'
    and created_at >= p_start
    and created_at <= p_end;
$$;

grant execute on function public.count_monthly_bundles(uuid, timestamptz, timestamptz) to authenticated;
