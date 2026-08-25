begin;

create table if not exists public.event_announcements (
  id uuid primary key default uuid_generate_v4(),
  event_id uuid not null references public.events(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete cascade,
  recipient_filter text not null check (recipient_filter in ('active', 'confirmed', 'pending', 'waitlisted')),
  subject text not null check (char_length(subject) between 5 and 80),
  body text not null check (char_length(body) between 10 and 4000),
  status text not null default 'sending' check (status in ('sending', 'sent', 'partial', 'failed')),
  recipient_count integer not null default 0 check (recipient_count >= 0),
  delivered_count integer not null default 0 check (delivered_count >= 0),
  failed_count integer not null default 0 check (failed_count >= 0),
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

create index if not exists event_announcements_event_created_idx
  on public.event_announcements(event_id, created_at desc);

alter table public.event_announcements enable row level security;
drop policy if exists "event_announcements_select_managers" on public.event_announcements;
create policy "event_announcements_select_managers" on public.event_announcements for select
  using (public.can_manage_event(event_id));

create or replace function public.create_event_announcement(
  p_event_id uuid,
  p_recipient_filter text,
  p_subject text,
  p_body text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  announcement_id uuid;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  if not public.can_manage_event(p_event_id) then raise exception 'forbidden'; end if;
  if p_recipient_filter not in ('active', 'confirmed', 'pending', 'waitlisted') then raise exception 'invalid_recipient_filter'; end if;
  if char_length(trim(coalesce(p_subject, ''))) not between 5 and 80 then raise exception 'invalid_subject'; end if;
  if char_length(trim(coalesce(p_body, ''))) not between 10 and 4000 then raise exception 'invalid_body'; end if;

  perform pg_advisory_xact_lock(hashtextextended(p_event_id::text, 0));
  if exists (
    select 1 from public.event_announcements
    where event_id = p_event_id
      and status in ('sending', 'sent', 'partial')
      and created_at > now() - interval '60 seconds'
  ) then
    raise exception 'announcement_rate_limited';
  end if;

  insert into public.event_announcements (event_id, created_by, recipient_filter, subject, body)
  values (p_event_id, auth.uid(), p_recipient_filter, trim(p_subject), trim(p_body))
  returning id into announcement_id;

  return announcement_id;
end;
$$;

revoke all on function public.create_event_announcement(uuid, text, text, text) from public, anon;
grant execute on function public.create_event_announcement(uuid, text, text, text) to authenticated;

commit;
