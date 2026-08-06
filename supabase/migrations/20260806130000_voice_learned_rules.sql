-- Stage D: learned voice preference rules (additive only, no backfill).
-- Rules are derived off the hot path; samples remain ground truth.
-- Deliberately no distilled_profile column (self-compression risk).

create table public.voice_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  brand_voice_id uuid not null references public.brand_voices(id) on delete cascade,
  rule text not null,
  evidence_ids uuid[] not null default '{}',
  status text not null default 'active'
    check (status in ('active', 'dismissed', 'pinned')),
  created_at timestamptz not null default now()
);

create index voice_rules_voice_status_idx
  on public.voice_rules (brand_voice_id, status);

alter table public.voice_rules enable row level security;

alter table public.brand_voices
  add column if not exists rules_derived_at timestamptz;

-- Column-level grants: owner may select/delete and update status only.
-- Cannot rewrite rule text or evidence_ids (privilege system, not RLS alone).
revoke all on public.voice_rules from anon, authenticated;
grant select, delete on public.voice_rules to authenticated;
grant update (status) on public.voice_rules to authenticated;
grant select, insert, update, delete on public.voice_rules to service_role;

create policy "Users can view own voice rules"
  on public.voice_rules for select
  using (auth.uid() = user_id);

create policy "Users can update own voice rules"
  on public.voice_rules for update
  using (auth.uid() = user_id);

create policy "Users can delete own voice rules"
  on public.voice_rules for delete
  using (auth.uid() = user_id);

-- Insert is service-role only (no insert policy for authenticated).
