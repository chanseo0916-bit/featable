begin;
create table if not exists public.user_activity_events (
  id bigint generated always as identity primary key,
  user_id uuid references public.profiles(id) on delete set null,
  session_id text not null check (char_length(session_id) between 8 and 80),
  event_name text not null check (event_name in ('page_view','signup','login','brand_created','product_published','story_published','event_created','partner_inquiry')),
  path text not null default '/', entity_type text, entity_id text, referrer text,
  source text, medium text, campaign text, metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists activity_created_idx on public.user_activity_events(created_at desc);
create index if not exists activity_session_created_idx on public.user_activity_events(session_id, created_at desc);
create index if not exists activity_user_created_idx on public.user_activity_events(user_id, created_at desc) where user_id is not null;
create index if not exists activity_event_created_idx on public.user_activity_events(event_name, created_at desc);
alter table public.user_activity_events enable row level security;
drop policy if exists "activity_admin_select" on public.user_activity_events;
create policy "activity_admin_select" on public.user_activity_events for select using (public.is_admin());
commit;
