-- RepurposeOne initial schema: profiles, brand_voices, repurposes
-- Run via Supabase CLI: supabase db push
-- Or paste into Supabase SQL Editor

-- ---------------------------------------------------------------------------
-- profiles (1:1 with auth.users)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  stripe_customer_id text,
  stripe_subscription_id text,
  plan text not null default 'free' check (plan in ('free', 'creator', 'pro')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id)
  values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- brand_voices
-- ---------------------------------------------------------------------------
create table public.brand_voices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  samples text[] not null default '{}',
  description text,
  created_at timestamptz not null default now()
);

alter table public.brand_voices enable row level security;

create policy "Users can view own brand voices"
  on public.brand_voices for select
  using (auth.uid() = user_id);

create policy "Users can insert own brand voices"
  on public.brand_voices for insert
  with check (auth.uid() = user_id);

create policy "Users can update own brand voices"
  on public.brand_voices for update
  using (auth.uid() = user_id);

create policy "Users can delete own brand voices"
  on public.brand_voices for delete
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- repurposes
-- ---------------------------------------------------------------------------
create table public.repurposes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  input_type text not null check (input_type in ('paste', 'txt', 'pdf', 'audio')),
  input_content text not null,
  brand_voice_id uuid references public.brand_voices (id) on delete set null,
  target_format text not null check (target_format in ('x_thread')),
  output jsonb,
  status text not null default 'pending' check (status in ('pending', 'complete', 'failed')),
  error_message text,
  created_at timestamptz not null default now()
);

create index repurposes_user_id_created_at_idx
  on public.repurposes (user_id, created_at desc);

alter table public.repurposes enable row level security;

create policy "Users can view own repurposes"
  on public.repurposes for select
  using (auth.uid() = user_id);

create policy "Users can insert own repurposes"
  on public.repurposes for insert
  with check (auth.uid() = user_id);

create policy "Users can update own repurposes"
  on public.repurposes for update
  using (auth.uid() = user_id);

create policy "Users can delete own repurposes"
  on public.repurposes for delete
  using (auth.uid() = user_id);
