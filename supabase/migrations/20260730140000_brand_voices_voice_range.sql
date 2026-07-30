alter table public.brand_voices
  add column if not exists voice_range jsonb;

comment on column public.brand_voices.voice_range is
  'Voice-range characterisation (prose summary + per-sample markers). Written by brand-voice wizard; unused by generate v1.';
