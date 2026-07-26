-- Enable Realtime for the Phase 5 job tray (insert + update events).
-- REPLICA IDENTITY FULL is required so RLS can evaluate UPDATE events:
-- default replica identity only carries the PK, which is not enough for
-- auth.uid() = user_id filtering on the old row.
--
-- MANUAL APPLY: applied to production (RepurposeOne / mfkprihkqdgysjprbzbz)
-- on 2026-07-26 via Supabase MCP `apply_migration`
-- `bundle_clips_realtime_replica_identity`. This file is the repo record of
-- that change; statements below are idempotent for re-runs.

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'bundle_clips'
  ) then
    alter publication supabase_realtime add table public.bundle_clips;
  end if;
end $$;

alter table public.bundle_clips replica identity full;
