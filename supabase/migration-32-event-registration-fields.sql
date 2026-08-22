begin;

alter table public.events
  add column if not exists registration_fields jsonb not null default '[]'::jsonb;

alter table public.events drop constraint if exists events_registration_fields_is_array;
alter table public.events
  add constraint events_registration_fields_is_array check (jsonb_typeof(registration_fields) = 'array');

commit;
