begin;

alter table public.profiles add column if not exists signup_notified_at timestamptz;

drop function if exists public.cancel_my_event_registration(uuid);
create function public.cancel_my_event_registration(target_event_id uuid)
returns table (
  registration_id uuid,
  registration_status text,
  promoted_registration_id uuid,
  promoted_email text,
  promoted_name text,
  event_name text,
  event_slug text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  target_event public.events%rowtype;
  current_registration public.event_registrations%rowtype;
  promoted_registration public.event_registrations%rowtype;
  confirmed_count integer;
begin
  if current_user_id is null then raise exception 'authentication_required'; end if;
  select * into target_event from public.events where id = target_event_id for update;
  if not found then raise exception 'event_not_found'; end if;

  select * into current_registration from public.event_registrations
  where event_id = target_event_id and user_id = current_user_id for update;
  if not found or current_registration.status not in ('pending', 'confirmed', 'waitlisted') then
    raise exception 'active_registration_not_found';
  end if;

  update public.event_registrations set status = 'cancelled', cancelled_at = now(), updated_at = now()
  where id = current_registration.id;

  if current_registration.status = 'confirmed' and target_event.approval_mode = 'instant' then
    select count(*) into confirmed_count from public.event_registrations
    where event_id = target_event_id and status = 'confirmed';
    select * into promoted_registration from public.event_registrations
    where event_id = target_event_id and status = 'waitlisted'
      and (target_event.capacity is null or confirmed_count < target_event.capacity)
    order by applied_at asc for update skip locked limit 1;
    if found then
      update public.event_registrations set status = 'confirmed', reviewed_at = now(), updated_at = now()
      where id = promoted_registration.id;
      if promoted_registration.user_id is not null then
        insert into public.notifications (user_id, type, title, message, href, data)
        values (
          promoted_registration.user_id, 'system', '행사 신청이 확정됐어요.',
          target_event.name || ' 대기 신청이 참가 확정으로 변경됐습니다.',
          '/events/' || target_event.slug,
          jsonb_build_object('kind', 'event_registration_status', 'event_id', target_event.id, 'registration_id', promoted_registration.id, 'status', 'confirmed')
        );
      end if;
    end if;
  end if;

  if target_event.submitted_by is not null and target_event.submitted_by <> current_user_id then
    insert into public.notifications (user_id, actor_id, type, title, message, href, data)
    values (
      target_event.submitted_by, current_user_id, 'system', '행사 신청이 취소됐어요.',
      target_event.name || ' 신청 현황을 확인해주세요.', '/my/events/' || target_event.slug,
      jsonb_build_object('kind', 'event_registration_cancelled', 'event_id', target_event.id, 'registration_id', current_registration.id)
    );
  end if;

  return query select current_registration.id, 'cancelled'::text,
    promoted_registration.id, promoted_registration.applicant_email, promoted_registration.applicant_name,
    target_event.name, target_event.slug;
end;
$$;

drop function if exists public.cancel_guest_event_registration(text);
create function public.cancel_guest_event_registration(input_token_hash text)
returns table (
  registration_id uuid,
  registration_status text,
  event_slug text,
  event_name text,
  applicant_name text,
  applicant_email text,
  promoted_registration_id uuid,
  promoted_email text,
  promoted_name text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  target_registration public.event_registrations%rowtype;
  target_event public.events%rowtype;
  promoted_registration public.event_registrations%rowtype;
  confirmed_count integer;
begin
  select * into target_registration from public.event_registrations
  where guest_token_hash = input_token_hash and user_id is null for update;
  if not found then raise exception 'verification_link_invalid'; end if;
  if target_registration.status not in ('pending', 'confirmed', 'waitlisted') then raise exception 'active_registration_not_found'; end if;
  select * into target_event from public.events where id = target_registration.event_id for update;

  update public.event_registrations set status = 'cancelled', cancelled_at = now(), updated_at = now()
  where id = target_registration.id;

  if target_registration.status = 'confirmed' and target_event.approval_mode = 'instant' then
    select count(*) into confirmed_count from public.event_registrations
    where event_id = target_event.id and status = 'confirmed';
    select * into promoted_registration from public.event_registrations
    where event_id = target_event.id and status = 'waitlisted'
      and (target_event.capacity is null or confirmed_count < target_event.capacity)
    order by applied_at asc for update skip locked limit 1;
    if found then
      update public.event_registrations set status = 'confirmed', reviewed_at = now(), updated_at = now()
      where id = promoted_registration.id;
      if promoted_registration.user_id is not null then
        insert into public.notifications (user_id, type, title, message, href, data)
        values (
          promoted_registration.user_id, 'system', '행사 신청이 확정됐어요.',
          target_event.name || ' 대기 신청이 참가 확정으로 변경됐습니다.',
          '/events/' || target_event.slug,
          jsonb_build_object('kind', 'event_registration_status', 'event_id', target_event.id, 'registration_id', promoted_registration.id, 'status', 'confirmed')
        );
      end if;
    end if;
  end if;

  return query select target_registration.id, 'cancelled'::text, target_event.slug, target_event.name,
    target_registration.applicant_name, target_registration.applicant_email,
    promoted_registration.id, promoted_registration.applicant_email, promoted_registration.applicant_name;
end;
$$;

revoke all on function public.cancel_my_event_registration(uuid) from public, anon;
grant execute on function public.cancel_my_event_registration(uuid) to authenticated;
revoke all on function public.cancel_guest_event_registration(text) from public, anon, authenticated;
grant execute on function public.cancel_guest_event_registration(text) to service_role;

commit;
