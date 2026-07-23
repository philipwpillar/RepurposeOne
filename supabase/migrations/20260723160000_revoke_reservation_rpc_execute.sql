-- Explicitly revoke reservation RPCs from public/authenticated.
-- EXECUTE was granted only to service_role; default PUBLIC grants can still
-- leave authenticated able to call SECURITY DEFINER reservation helpers.

revoke execute on function public.reserve_pending_repurpose(
  uuid, integer, timestamptz, timestamptz, text, text, uuid, text, uuid
) from public;

revoke execute on function public.reserve_pending_repurpose(
  uuid, integer, timestamptz, timestamptz, text, text, uuid, text, uuid
) from authenticated;

revoke execute on function public.reserve_bundle_under_cap(
  uuid, integer, timestamptz, timestamptz, text, text, text
) from public;

revoke execute on function public.reserve_bundle_under_cap(
  uuid, integer, timestamptz, timestamptz, text, text, text
) from authenticated;

grant execute on function public.reserve_pending_repurpose(
  uuid, integer, timestamptz, timestamptz, text, text, uuid, text, uuid
) to service_role;

grant execute on function public.reserve_bundle_under_cap(
  uuid, integer, timestamptz, timestamptz, text, text, text
) to service_role;
