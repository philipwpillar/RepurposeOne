-- Advisor hardening (Claude live infra review O3/O4):
-- 1. Revoke REST-callable EXECUTE on trigger-only SECURITY DEFINER helpers
-- 2. Pin search_path on set_brand_voices_updated_at
--
-- Postgres grants EXECUTE to PUBLIC at CREATE FUNCTION time; anon/authenticated
-- inherit that. Revoking only those two roles is a no-op while PUBLIC retains =X.
-- Mirror 20260723160000_revoke_reservation_rpc_execute.sql: revoke PUBLIC too.
--
-- Do NOT revoke count_monthly_* / library list RPCs — those have auth.uid()
-- guards and are used by the authenticated client (advisor false positives).

revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;

create or replace function public.set_brand_voices_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
