-- Grant service_role access to bundle tables for worker + admin API writes.
-- bundle schema migration granted authenticated only; billing hardening revoked
-- authenticated writes, so service_role grants are required for createAdminClient()
-- and the ffmpeg render worker.

grant select, insert, update, delete on public.bundles to service_role;
grant select, insert, update, delete on public.bundle_assets to service_role;
grant select, insert, update, delete on public.bundle_clips to service_role;
