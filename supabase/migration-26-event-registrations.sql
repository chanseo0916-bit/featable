begin;

-- Keep role/admin authority off the public profile update surface.
revoke update on table public.profiles from authenticated;
grant update (
  full_name,
  member_type,
  terms_agreed_at,
  privacy_agreed_at,
  marketing_agreed_at,
  onboarding_completed_at
) on table public.profiles to authenticated;

drop policy if exists "partner_submissions_update" on public.partner_submissions;
create policy "partner_submissions_update" on public.partner_submissions for update
  using ((user_id = auth.uid() and status in ('draft', 'rejected')) or public.is_admin())
  with check (
    (user_id = auth.uid() and status in ('draft', 'submitted'))
    or public.is_admin()
  );

alter table public.events
  alter column apply_url drop not null,
  add column if not exists registration_mode text not null default 'external',
  add column if not exists approval_mode text not null default 'instant',
  add column if not exists capacity integer,
  add column if not exists waitlist_enabled boolean not null default true;

alter table public.events drop constraint if exists events_registration_mode_check;
alter table public.events add constraint events_registration_mode_check
  check (registration_mode in ('external', 'internal', 'closed'));
alter table public.events drop constraint if exists events_approval_mode_check;
alter table public.events add constraint events_approval_mode_check
  check (approval_mode in ('instant', 'manual'));
alter table public.events drop constraint if exists events_capacity_check;
alter table public.events add constraint events_capacity_check
  check (capacity is null or capacity > 0);
alter table public.events drop constraint if exists events_registration_destination_check;
alter table public.events add constraint events_registration_destination_check
  check (registration_mode <> 'external' or nullif(trim(apply_url), '') is not null);

create table if not exists public.event_registrations (
  id uuid primary key default uuid_generate_v4(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null check (status in ('pending', 'confirmed', 'waitlisted', 'rejected', 'cancelled')),
  applicant_name text not null check (char_length(applicant_name) between 2 and 60),
  applicant_email text not null check (char_length(applicant_email) between 3 and 254),
  note text check (note is null or char_length(note) <= 500),
  consented_at timestamptz not null,
  applied_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id) on delete set null,
  cancelled_at timestamptz,
  unique (event_id, user_id)
);

create index if not exists event_registrations_event_status_idx
  on public.event_registrations(event_id, status, applied_at);
create index if not exists event_registrations_user_idx
  on public.event_registrations(user_id, applied_at desc);

create or replace function public.can_manage_event(target_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.events e
    where e.id = target_event_id
      and (e.submitted_by = auth.uid() or public.is_admin())
  );
$$;

revoke all on function public.can_manage_event(uuid) from public, anon;
grant execute on function public.can_manage_event(uuid) to authenticated;

alter table public.event_registrations enable row level security;
drop policy if exists "event_registrations_select_related" on public.event_registrations;
create policy "event_registrations_select_related" on public.event_registrations for select
  using (user_id = auth.uid() or public.can_manage_event(event_id));

create or replace function public.register_for_event(
  target_event_id uuid,
  input_name text,
  input_email text,
  input_note text default null
)
returns table (registration_id uuid, registration_status text)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  target_event public.events%rowtype;
  current_registration public.event_registrations%rowtype;
  confirmed_count integer;
  next_status text;
  saved_id uuid;
begin
  if current_user_id is null then raise exception 'authentication_required'; end if;
  if char_length(trim(coalesce(input_name, ''))) not between 2 and 60 then raise exception 'invalid_name'; end if;
  if char_length(trim(coalesce(input_email, ''))) not between 3 and 254 then raise exception 'invalid_email'; end if;
  if char_length(trim(coalesce(input_note, ''))) > 500 then raise exception 'note_too_long'; end if;

  select * into target_event from public.events where id = target_event_id for update;
  if not found or target_event.status <> 'published' then raise exception 'event_not_found'; end if;
  if target_event.registration_mode <> 'internal' then raise exception 'internal_registration_unavailable'; end if;
  if target_event.deadline is not null and target_event.deadline < now() then raise exception 'registration_closed'; end if;
  if target_event.starts_at <= now() then raise exception 'registration_closed'; end if;

  select * into current_registration
  from public.event_registrations
  where event_id = target_event_id and user_id = current_user_id;

  if found and current_registration.status in ('pending', 'confirmed', 'waitlisted') then
    return query select current_registration.id, current_registration.status;
    return;
  end if;

  select count(*) into confirmed_count
  from public.event_registrations
  where event_id = target_event_id and status = 'confirmed';

  if target_event.capacity is not null and confirmed_count >= target_event.capacity then
    if not target_event.waitlist_enabled then raise exception 'event_full'; end if;
    next_status := 'waitlisted';
  elsif target_event.approval_mode = 'manual' then
    next_status := 'pending';
  else
    next_status := 'confirmed';
  end if;

  insert into public.event_registrations (
    event_id, user_id, status, applicant_name, applicant_email, note,
    consented_at, applied_at, updated_at, reviewed_at, reviewed_by, cancelled_at
  ) values (
    target_event_id, current_user_id, next_status, trim(input_name), lower(trim(input_email)),
    nullif(trim(coalesce(input_note, '')), ''), now(), now(), now(), null, null, null
  )
  on conflict (event_id, user_id) do update set
    status = excluded.status,
    applicant_name = excluded.applicant_name,
    applicant_email = excluded.applicant_email,
    note = excluded.note,
    consented_at = excluded.consented_at,
    applied_at = now(),
    updated_at = now(),
    reviewed_at = null,
    reviewed_by = null,
    cancelled_at = null
  returning id into saved_id;

  if target_event.submitted_by is not null and target_event.submitted_by <> current_user_id then
    insert into public.notifications (user_id, actor_id, type, title, message, href, data)
    values (
      target_event.submitted_by,
      current_user_id,
      'system',
      '새 행사 신청이 도착했어요.',
      target_event.name || ' 신청자를 확인해주세요.',
      '/my/events/' || target_event.slug,
      jsonb_build_object('kind', 'event_registration', 'event_id', target_event.id, 'registration_id', saved_id)
    );
  end if;

  return query select saved_id, next_status;
end;
$$;

create or replace function public.cancel_my_event_registration(target_event_id uuid)
returns table (registration_id uuid, registration_status text)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  target_event public.events%rowtype;
  current_registration public.event_registrations%rowtype;
  saved_id uuid;
  promoted_id uuid;
  confirmed_count integer;
begin
  if current_user_id is null then raise exception 'authentication_required'; end if;
  select * into target_event from public.events where id = target_event_id for update;
  if not found then raise exception 'event_not_found'; end if;

  select * into current_registration from public.event_registrations
  where event_id = target_event_id and user_id = current_user_id
  for update;
  if not found or current_registration.status not in ('pending', 'confirmed', 'waitlisted') then
    raise exception 'active_registration_not_found';
  end if;

  update public.event_registrations
  set status = 'cancelled', cancelled_at = now(), updated_at = now()
  where id = current_registration.id
  returning id into saved_id;

  if current_registration.status = 'confirmed' and target_event.approval_mode = 'instant' then
    select count(*) into confirmed_count from public.event_registrations
    where event_id = target_event_id and status = 'confirmed';
    select id into promoted_id from public.event_registrations
    where event_id = target_event_id and status = 'waitlisted'
      and (target_event.capacity is null or confirmed_count < target_event.capacity)
    order by applied_at asc for update skip locked limit 1;
    if promoted_id is not null then
      update public.event_registrations
      set status = 'confirmed', reviewed_at = now(), updated_at = now()
      where id = promoted_id;
      insert into public.notifications (user_id, type, title, message, href, data)
      select user_id, 'system', '행사 신청이 확정됐어요.', target_event.name || ' 대기 신청이 참가 확정으로 변경됐습니다.',
        '/events/' || target_event.slug,
        jsonb_build_object('kind', 'event_registration_status', 'event_id', target_event.id, 'registration_id', promoted_id, 'status', 'confirmed')
      from public.event_registrations where id = promoted_id;
    end if;
  end if;

  if target_event.submitted_by is not null and target_event.submitted_by <> current_user_id then
    insert into public.notifications (user_id, actor_id, type, title, message, href, data)
    values (
      target_event.submitted_by,
      current_user_id,
      'system',
      '행사 신청이 취소됐어요.',
      target_event.name || ' 신청 현황을 확인해주세요.',
      '/my/events/' || target_event.slug,
      jsonb_build_object('kind', 'event_registration_cancelled', 'event_id', target_event.id, 'registration_id', saved_id)
    );
  end if;

  return query select saved_id, 'cancelled'::text;
end;
$$;

create or replace function public.review_event_registration(
  target_registration_id uuid,
  decision text
)
returns table (registration_id uuid, registration_status text)
language plpgsql
security definer
set search_path = public
as $$
declare
  target_registration public.event_registrations%rowtype;
  target_event public.events%rowtype;
  confirmed_count integer;
  next_status text;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  if decision not in ('confirm', 'reject') then raise exception 'invalid_decision'; end if;

  select * into target_registration from public.event_registrations
  where id = target_registration_id for update;
  if not found then raise exception 'registration_not_found'; end if;
  if not public.can_manage_event(target_registration.event_id) then raise exception 'forbidden'; end if;
  select * into target_event from public.events where id = target_registration.event_id for update;

  if decision = 'reject' then
    next_status := 'rejected';
  else
    select count(*) into confirmed_count from public.event_registrations
    where event_id = target_event.id and status = 'confirmed' and id <> target_registration.id;
    if target_event.capacity is not null and confirmed_count >= target_event.capacity then
      next_status := 'waitlisted';
    else
      next_status := 'confirmed';
    end if;
  end if;

  update public.event_registrations set
    status = next_status,
    reviewed_at = now(),
    reviewed_by = auth.uid(),
    cancelled_at = null,
    updated_at = now()
  where id = target_registration.id;

  insert into public.notifications (user_id, actor_id, type, title, message, href, data)
  values (
    target_registration.user_id,
    auth.uid(),
    'system',
    case next_status
      when 'confirmed' then '행사 신청이 승인됐어요.'
      when 'waitlisted' then '행사 대기자로 등록됐어요.'
      else '행사 신청 결과를 확인해주세요.'
    end,
    target_event.name || ' 신청 상태가 변경됐습니다.',
    '/events/' || target_event.slug,
    jsonb_build_object('kind', 'event_registration_status', 'event_id', target_event.id, 'registration_id', target_registration.id, 'status', next_status)
  );

  return query select target_registration.id, next_status;
end;
$$;

revoke all on function public.register_for_event(uuid, text, text, text) from public, anon;
revoke all on function public.cancel_my_event_registration(uuid) from public, anon;
revoke all on function public.review_event_registration(uuid, text) from public, anon;
grant execute on function public.register_for_event(uuid, text, text, text) to authenticated;
grant execute on function public.cancel_my_event_registration(uuid) to authenticated;
grant execute on function public.review_event_registration(uuid, text) to authenticated;

commit;
