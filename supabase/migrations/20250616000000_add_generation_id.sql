-- Group multi-format generations so "Regenerate All" counts as ONE repurpose.
-- Also fixes the stale target_format check that only allowed 'x_thread'.

-- 1. Relax the target_format constraint to match the four shipped formats.
alter table public.repurposes
  drop constraint if exists repurposes_target_format_check;

alter table public.repurposes
  add constraint repurposes_target_format_check
  check (target_format in ('x_thread', 'linkedin', 'instagram', 'email'));

-- 2. generation_id groups the 1–4 format rows produced by a single user action.
--    Nullable: legacy rows and single-format generations may share id = self,
--    but we default new rows to their own id so COUNT(DISTINCT) stays correct
--    even when the client omits it.
alter table public.repurposes
  add column generation_id uuid;

-- Backfill: each existing row is its own generation.
update public.repurposes
  set generation_id = id
  where generation_id is null;

-- New rows without an explicit generation_id fall back to their own id.
alter table public.repurposes
  alter column generation_id set default gen_random_uuid();

-- Index for the DISTINCT-count usage query (user + month + status + group).
create index repurposes_user_generation_idx
  on public.repurposes (user_id, status, created_at desc, generation_id);

-- Distinct-generation usage count for the current billing period.
create or replace function public.count_monthly_generations(
  p_user_id uuid,
  p_start timestamptz,
  p_end timestamptz
)
returns integer
language sql
security definer
set search_path = public
as $$
  select count(distinct generation_id)::int
  from public.repurposes
  where user_id = p_user_id
    and status = 'complete'
    and created_at >= p_start
    and created_at <= p_end;
$$;