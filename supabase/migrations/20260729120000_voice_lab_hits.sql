-- Voice Lab public demo: DB-backed IP rate limiting (service-role only).

create table public.voice_lab_hits (
  id uuid primary key default gen_random_uuid(),
  ip_hash text not null,
  created_at timestamptz not null default now()
);

create index voice_lab_hits_ip_created_idx
  on public.voice_lab_hits (ip_hash, created_at desc);

alter table public.voice_lab_hits enable row level security;

revoke all on public.voice_lab_hits from anon, authenticated;
