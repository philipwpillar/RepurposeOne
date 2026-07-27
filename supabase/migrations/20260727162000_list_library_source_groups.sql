-- Paginated library source groups (M3). Avoids loading every complete
-- repurpose row into the grouped Library view.

create or replace function public.count_library_source_groups(p_user_id uuid)
returns bigint
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
    select count(distinct r.source_hash)::bigint
    from public.repurposes r
    where r.user_id = p_user_id
      and r.status = 'complete'
      and r.source_hash is not null
  );
end;
$$;

create or replace function public.list_library_source_groups(
  p_user_id uuid,
  p_limit integer,
  p_offset integer
)
returns table (
  source_hash text,
  latest_created_at timestamptz,
  formats text[],
  repurpose_count integer
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select auth.role()) = 'authenticated'
     and (select auth.uid()) is distinct from p_user_id then
    raise exception 'forbidden';
  end if;

  if p_limit is null or p_limit < 1 or p_limit > 100 then
    raise exception 'invalid_limit';
  end if;

  if p_offset is null or p_offset < 0 then
    raise exception 'invalid_offset';
  end if;

  return query
  select
    r.source_hash,
    max(r.created_at) as latest_created_at,
    array_agg(distinct r.target_format order by r.target_format) as formats,
    count(*)::integer as repurpose_count
  from public.repurposes r
  where r.user_id = p_user_id
    and r.status = 'complete'
    and r.source_hash is not null
  group by r.source_hash
  order by max(r.created_at) desc
  limit p_limit
  offset p_offset;
end;
$$;

revoke execute on function public.count_library_source_groups(uuid)
  from public, anon;
grant execute on function public.count_library_source_groups(uuid)
  to authenticated, service_role;

revoke execute on function public.list_library_source_groups(uuid, integer, integer)
  from public, anon;
grant execute on function public.list_library_source_groups(uuid, integer, integer)
  to authenticated, service_role;
