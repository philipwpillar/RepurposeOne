-- Grants for the authenticated role.
-- RLS policies already restrict rows; these grants are what allow the
-- authenticated role to attempt the query in the first place. Without them,
-- every request fails with "permission denied for table X" regardless of RLS.
--
-- Idempotent: GRANT is safe to re-run, including against the live DB where
-- these privileges were previously applied manually via the SQL Editor.

grant usage on schema public to authenticated;

grant select, insert, update on public.profiles to authenticated;

grant select, insert, update, delete on public.brand_voices to authenticated;

grant select, insert, update, delete on public.repurposes to authenticated;

grant execute on function public.count_monthly_generations(uuid, timestamptz, timestamptz) to authenticated;
