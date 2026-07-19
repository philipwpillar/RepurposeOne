-- Brief 3a: private bucket for source videos (and later rendered clips).
-- Deliberately NO storage.objects policies for authenticated users.
-- All access is via route-issued signed URLs (upload) + service role
-- (worker download/upload/delete in 3b). Signed-URL auth makes
-- user-level Storage RLS unnecessary and tighter.

insert into storage.buckets (id, name, public, file_size_limit)
values ('bundle-media', 'bundle-media', false, 524288000)
on conflict (id) do nothing;
