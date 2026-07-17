-- Brief S2: human guidance loop — ratings and free-text edits
alter table public.repurposes
  add column user_rating smallint check (user_rating in (-1, 1)),
  add column user_output jsonb,
  add column edited_at timestamptz;

create index repurposes_feedback_idx
  on public.repurposes (user_id, target_format, user_rating, created_at desc)
  where user_rating is not null;
