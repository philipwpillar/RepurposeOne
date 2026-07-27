-- Advisor hardening (Claude live infra review O3/O4):
-- 1. Revoke REST-callable EXECUTE on trigger-only SECURITY DEFINER helpers
-- 2. Pin search_path on set_brand_voices_updated_at
--
-- Do NOT revoke count_monthly_* — those have auth.uid() guards and are used
-- by the authenticated client (advisor false positives).

revoke execute on function public.handle_new_user() from anon, authenticated;
revoke execute on function public.rls_auto_enable() from anon, authenticated;

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
