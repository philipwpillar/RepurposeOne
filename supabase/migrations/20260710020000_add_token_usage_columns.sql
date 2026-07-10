alter table public.repurposes
  add column tokens_used integer,
  add column prompt_tokens integer,
  add column completion_tokens integer,
  add column model text;
