-- Named Brand Voice profiles + last-updated timestamp for Slice 3 durable work.
alter table public.brand_voices
  add column if not exists name text;

alter table public.brand_voices
  add column if not exists updated_at timestamptz not null default now();

comment on column public.brand_voices.name is
  'Short display name for the voice profile; optional for legacy rows.';

-- Keep updated_at current on row changes.
create or replace function public.set_brand_voices_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists brand_voices_set_updated_at on public.brand_voices;

create trigger brand_voices_set_updated_at
  before update on public.brand_voices
  for each row
  execute function public.set_brand_voices_updated_at();
