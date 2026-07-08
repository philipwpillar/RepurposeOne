-- Allow image input type for photo repurpose
alter table public.repurposes
  drop constraint if exists repurposes_input_type_check;

alter table public.repurposes
  add constraint repurposes_input_type_check
  check (input_type in ('paste', 'txt', 'pdf', 'audio', 'image'));
