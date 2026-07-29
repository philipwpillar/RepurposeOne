-- voice_lab_hits is service-role-only: RLS on, no policies, no anon/authenticated grants.
-- Supabase default grants are not inherited in this project (see
-- 20260721140000_bundle_service_role_grants.sql) so service_role needs explicit DML.
-- update omitted — Voice Lab code only selects, inserts, and deletes.

grant select, insert, delete on public.voice_lab_hits to service_role;
