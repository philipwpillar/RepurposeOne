-- Stable per-source grouping key: md5 hash of trimmed input_content.
-- STORED generated column — Postgres computes this for every existing row
-- automatically as part of the ALTER TABLE. No manual backfill needed.
alter table public.repurposes
  add column source_hash text generated always as (md5(trim(input_content))) stored;

create index repurposes_user_source_hash_idx
  on public.repurposes (user_id, source_hash, created_at desc);
