-- Billing hardening follow-ups
-- 1. Auth check on count RPCs (authenticated may only count self)
-- 2. Revoke profiles INSERT from authenticated (handle_new_user remains sole creator)
-- 3. Atomic quota reservation RPCs (advisory xact lock + insert)

-- ---------------------------------------------------------------------------
-- 1. Count RPCs: require auth.uid() = p_user_id for authenticated callers
-- ---------------------------------------------------------------------------
create or replace function public.count_monthly_generations(
  p_user_id uuid,
  p_start timestamptz,
  p_end timestamptz
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select auth.role()) = 'authenticated'
     and (select auth.uid()) is distinct from p_user_id then
    raise exception 'forbidden';
  end if;

  return (
    select count(distinct generation_id)::int
    from public.repurposes
    where user_id = p_user_id
      and status = 'complete'
      and created_at >= p_start
      and created_at <= p_end
  );
end;
$$;

create or replace function public.count_monthly_bundles(
  p_user_id uuid,
  p_start timestamptz,
  p_end timestamptz
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select auth.role()) = 'authenticated'
     and (select auth.uid()) is distinct from p_user_id then
    raise exception 'forbidden';
  end if;

  return (
    select count(*)::int
    from public.bundles
    where user_id = p_user_id
      and status <> 'failed'
      and created_at >= p_start
      and created_at <= p_end
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 2. Profiles: no client INSERT (signup trigger is sole creator)
-- ---------------------------------------------------------------------------
drop policy if exists "Users can insert own profile" on public.profiles;
revoke insert on public.profiles from authenticated;

-- ---------------------------------------------------------------------------
-- 3a. Atomic pending repurpose reservation (generation monthly quota)
-- Counts DISTINCT generation_id for complete+pending under lock, then inserts.
-- ---------------------------------------------------------------------------
create or replace function public.reserve_pending_repurpose(
  p_user_id uuid,
  p_limit integer,
  p_start timestamptz,
  p_end timestamptz,
  p_input_type text,
  p_input_content text,
  p_brand_voice_id uuid,
  p_target_format text,
  p_generation_id uuid default null
)
returns table (id uuid, source_hash text)
language plpgsql
security definer
set search_path = public
as $$
declare
  used integer;
  new_id uuid;
  new_hash text;
begin
  if (select auth.role()) = 'authenticated'
     and (select auth.uid()) is distinct from p_user_id then
    raise exception 'forbidden';
  end if;

  perform pg_advisory_xact_lock(hashtext('gen-quota:' || p_user_id::text));

  select count(distinct generation_id)::int into used
  from public.repurposes
  where user_id = p_user_id
    and status in ('complete', 'pending')
    and created_at >= p_start
    and created_at <= p_end;

  if used >= p_limit then
    raise exception 'quota_exceeded';
  end if;

  insert into public.repurposes (
    user_id,
    input_type,
    input_content,
    brand_voice_id,
    target_format,
    status,
    generation_id
  )
  values (
    p_user_id,
    p_input_type,
    p_input_content,
    p_brand_voice_id,
    p_target_format,
    'pending',
    coalesce(p_generation_id, gen_random_uuid())
  )
  returning repurposes.id, repurposes.source_hash into new_id, new_hash;

  id := new_id;
  source_hash := new_hash;
  return next;
end;
$$;

grant execute on function public.reserve_pending_repurpose(
  uuid, integer, timestamptz, timestamptz, text, text, uuid, text, uuid
) to service_role;

-- ---------------------------------------------------------------------------
-- 3b. Atomic bundle reservation (N2 monthly cap)
-- ---------------------------------------------------------------------------
create or replace function public.reserve_bundle_under_cap(
  p_user_id uuid,
  p_limit integer,
  p_start timestamptz,
  p_end timestamptz,
  p_status text,
  p_title text default null,
  p_context text default null
)
returns table (id uuid, generation_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  used integer;
  new_id uuid;
  new_gen uuid;
begin
  if (select auth.role()) = 'authenticated'
     and (select auth.uid()) is distinct from p_user_id then
    raise exception 'forbidden';
  end if;

  if p_status is null or p_status = '' then
    raise exception 'invalid_status';
  end if;

  perform pg_advisory_xact_lock(hashtext('bundle-quota:' || p_user_id::text));

  select count(*)::int into used
  from public.bundles
  where user_id = p_user_id
    and status <> 'failed'
    and created_at >= p_start
    and created_at <= p_end;

  if used >= p_limit then
    raise exception 'bundle_quota_exceeded';
  end if;

  insert into public.bundles (
    user_id,
    title,
    context,
    status
  )
  values (
    p_user_id,
    p_title,
    p_context,
    p_status
  )
  returning bundles.id, bundles.generation_id into new_id, new_gen;

  id := new_id;
  generation_id := new_gen;
  return next;
end;
$$;

grant execute on function public.reserve_bundle_under_cap(
  uuid, integer, timestamptz, timestamptz, text, text, text
) to service_role;
