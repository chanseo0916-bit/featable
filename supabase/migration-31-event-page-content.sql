begin;

alter table public.events
  add column if not exists description text not null default '',
  add column if not exists gallery_urls text[] not null default '{}',
  add column if not exists program jsonb not null default '[]'::jsonb;

alter table public.events drop constraint if exists events_program_is_array;
alter table public.events
  add constraint events_program_is_array check (jsonb_typeof(program) = 'array');

commit;
