begin;

create table if not exists public.event_cohosts (
  id uuid primary key default uuid_generate_v4(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  email text not null,
  role text not null default 'cohost' check (role in ('cohost', 'editor')),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (event_id, user_id)
);

create index if not exists event_cohosts_user_idx on public.event_cohosts(user_id, created_at desc);
alter table public.event_cohosts enable row level security;
drop policy if exists "event_cohosts_select_related" on public.event_cohosts;
create policy "event_cohosts_select_related" on public.event_cohosts for select using (user_id = auth.uid() or can_manage_event(event_id));

create or replace function public.can_manage_event(target_event_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from events e
    where e.id = target_event_id and (
      e.submitted_by = auth.uid()
      or is_admin()
      or exists (select 1 from event_cohosts c where c.event_id = e.id and c.user_id = auth.uid())
    )
  );
$$;

commit;
