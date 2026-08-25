begin;

alter table public.event_cohosts
  add column if not exists status text not null default 'accepted',
  add column if not exists responded_at timestamptz,
  add column if not exists invitation_version integer not null default 1;

alter table public.event_cohosts drop constraint if exists event_cohosts_status_check;
alter table public.event_cohosts add constraint event_cohosts_status_check
  check (status in ('pending', 'accepted', 'declined'));

create index if not exists event_cohosts_event_status_idx
  on public.event_cohosts(event_id, status, created_at desc);

drop policy if exists "event_cohosts_select_related" on public.event_cohosts;
create policy "event_cohosts_select_related" on public.event_cohosts for select
  using (
    user_id = auth.uid()
    or public.is_admin()
    or exists (
      select 1 from public.events e
      where e.id = event_id and e.submitted_by = auth.uid()
    )
  );

create or replace function public.can_manage_event(target_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.events e
    where e.id = target_event_id
      and (
        e.submitted_by = auth.uid()
        or public.is_admin()
        or exists (
          select 1
          from public.event_cohosts c
          where c.event_id = e.id
            and c.user_id = auth.uid()
            and c.status = 'accepted'
        )
      )
  );
$$;

revoke all on function public.can_manage_event(uuid) from public, anon;
grant execute on function public.can_manage_event(uuid) to authenticated;

create or replace function public.respond_to_event_cohost_invitation(
  p_cohost_id uuid,
  p_accept boolean
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  invitation public.event_cohosts%rowtype;
  result_slug text;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;

  select * into invitation
  from public.event_cohosts
  where id = p_cohost_id and user_id = auth.uid()
  for update;

  if not found then raise exception 'invitation_not_found'; end if;
  if invitation.status <> 'pending' then raise exception 'invitation_already_resolved'; end if;

  update public.event_cohosts
  set status = case when p_accept then 'accepted' else 'declined' end,
      responded_at = now()
  where id = invitation.id;

  update public.notifications
  set read_at = coalesce(read_at, now()),
      resolved_at = now(),
      action_status = case when p_accept then 'accepted' else 'declined' end
  where user_id = auth.uid()
    and data ->> 'kind' = 'event_cohost_invite'
    and data ->> 'cohost_id' = invitation.id::text
    and action_status is null;

  select slug into result_slug from public.events where id = invitation.event_id;
  return result_slug;
end;
$$;

revoke all on function public.respond_to_event_cohost_invitation(uuid, boolean) from public, anon;
grant execute on function public.respond_to_event_cohost_invitation(uuid, boolean) to authenticated;

create or replace function public.notify_event_operators_of_registration_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_event public.events%rowtype;
  operator_id uuid;
  actor_user_id uuid := auth.uid();
  is_new_application boolean := false;
begin
  select * into target_event from public.events where id = new.event_id;
  if not found then return new; end if;

  is_new_application :=
    (tg_op = 'INSERT' and new.status <> 'verification_pending')
    or (tg_op = 'UPDATE' and old.status = 'verification_pending' and new.status <> 'verification_pending');

  if is_new_application then
    for operator_id in
      select c.user_id
      from public.event_cohosts c
      where c.event_id = new.event_id and c.status = 'accepted'
        and c.user_id is distinct from new.user_id
    loop
      insert into public.notifications (user_id, actor_id, type, title, message, href, data)
      values (
        operator_id, new.user_id, 'system', '새 행사 신청이 도착했어요.',
        target_event.name || ' 신청자를 확인해주세요.',
        '/my/events/' || target_event.slug,
        jsonb_build_object('kind', 'event_registration', 'event_id', new.event_id, 'registration_id', new.id)
      );
    end loop;
  elsif tg_op = 'UPDATE'
    and old.status is distinct from new.status
    and new.status in ('confirmed', 'waitlisted', 'rejected', 'cancelled') then
    for operator_id in
      select target_event.submitted_by
      where target_event.submitted_by is not null
      union
      select c.user_id
      from public.event_cohosts c
      where c.event_id = new.event_id and c.status = 'accepted'
    loop
      if operator_id is distinct from actor_user_id and operator_id is distinct from new.user_id then
        insert into public.notifications (user_id, actor_id, type, title, message, href, data)
        values (
          operator_id, actor_user_id, 'system', '행사 신청 상태가 변경됐어요.',
          new.applicant_name || '님의 신청이 ' ||
            case new.status when 'confirmed' then '승인' when 'waitlisted' then '대기' when 'rejected' then '거절' else '취소' end || ' 처리됐습니다.',
          '/my/events/' || target_event.slug,
          jsonb_build_object('kind', 'event_registration_reviewed', 'event_id', new.event_id, 'registration_id', new.id, 'status', new.status)
        );
      end if;
    end loop;
  end if;

  return new;
end;
$$;

drop trigger if exists event_registration_operator_notifications on public.event_registrations;
create trigger event_registration_operator_notifications
after insert or update of status on public.event_registrations
for each row execute function public.notify_event_operators_of_registration_change();

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
  if target_registration.status not in ('pending', 'waitlisted') then raise exception 'registration_already_resolved'; end if;
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

  if target_registration.user_id is not null then
    insert into public.notifications (user_id, actor_id, type, title, message, href, data)
    values (
      target_registration.user_id, auth.uid(), 'system',
      case next_status when 'confirmed' then '행사 신청이 승인됐어요.' when 'waitlisted' then '행사 대기자로 등록됐어요.' else '행사 신청 결과를 확인해주세요.' end,
      target_event.name || ' 신청 상태가 변경됐습니다.',
      '/events/' || target_event.slug,
      jsonb_build_object('kind', 'event_registration_status', 'event_id', target_event.id, 'registration_id', target_registration.id, 'status', next_status)
    );
  end if;

  return query select target_registration.id, next_status;
end;
$$;

revoke all on function public.review_event_registration(uuid, text) from public, anon;
grant execute on function public.review_event_registration(uuid, text) to authenticated;

commit;
