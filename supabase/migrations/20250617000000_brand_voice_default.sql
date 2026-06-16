-- Add default-voice flag: at most one default per user
alter table public.brand_voices
  add column is_default boolean not null default false;

create unique index brand_voices_one_default_per_user
  on public.brand_voices (user_id)
  where is_default;
