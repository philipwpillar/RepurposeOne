-- Make reserve_pending_repurpose idempotent per generation_id.
--
-- Bug: the DISTINCT generation_id count included the generation currently
-- being reserved. A multi-format Studio run (shared generation_id) at
-- used = limit - 1 reserved format 1, then raised quota_exceeded on
-- formats 2–4 — truncating the user's final generation of the month.
--
-- Fix: exclude p_generation_id from the count when provided. When null,
-- the insert uses gen_random_uuid() so no existing row can match.

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
    and created_at <= p_end
    and (p_generation_id is null or generation_id is distinct from p_generation_id);

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

-- reserve_bundle_under_cap: each call inserts a new bundle row (new id).
-- There is no shared "generation" key across multiple reservations for one
-- user action, so the same exclusion is not required for N2.
