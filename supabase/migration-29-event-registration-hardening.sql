begin;

drop index if exists public.event_registrations_guest_email_unique;
create unique index if not exists event_registrations_event_email_unique
  on public.event_registrations(event_id, lower(applicant_email));

create or replace function public.request_guest_event_registration(
  target_event_id uuid,
  input_name text,
  input_email text,
  input_note text,
  input_token_hash text
)
returns table (registration_id uuid, registration_status text, should_send_email boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  target_event public.events%rowtype;
  existing_registration public.event_registrations%rowtype;
  saved_id uuid;
  normalized_email text := lower(trim(coalesce(input_email, '')));
begin
  if char_length(trim(coalesce(input_name, ''))) not between 2 and 60 then raise exception 'invalid_name'; end if;
  if char_length(normalized_email) not between 3 and 254 or position('@' in normalized_email) < 2 then raise exception 'invalid_email'; end if;
  if char_length(trim(coalesce(input_note, ''))) > 500 then raise exception 'note_too_long'; end if;
  if char_length(coalesce(input_token_hash, '')) <> 64 then raise exception 'invalid_token'; end if;

  select * into target_event from public.events where id = target_event_id for update;
  if not found or target_event.status <> 'published' then raise exception 'event_not_found'; end if;
  if target_event.registration_mode <> 'internal' then raise exception 'internal_registration_unavailable'; end if;
  if target_event.deadline is not null and target_event.deadline < now() then raise exception 'registration_closed'; end if;
  if target_event.starts_at <= now() then raise exception 'registration_closed'; end if;

  select * into existing_registration from public.event_registrations
  where event_id = target_event_id and lower(applicant_email) = normalized_email for update;
  if found and existing_registration.user_id is not null then
    return query select existing_registration.id, existing_registration.status, false;
    return;
  end if;
  if found and existing_registration.verification_requested_at > now() - interval '5 minutes' then
    return query select existing_registration.id, existing_registration.status, false;
    return;
  end if;
  if found and existing_registration.status in ('pending', 'confirmed', 'waitlisted') then
    update public.event_registrations set
      guest_token_hash = input_token_hash,
      guest_token_expires_at = now() + interval '60 minutes',
      verification_requested_at = now(),
      updated_at = now()
    where id = existing_registration.id;
    return query select existing_registration.id, existing_registration.status, true;
    return;
  end if;

  insert into public.event_registrations (
    event_id, user_id, status, applicant_name, applicant_email, note, consented_at,
    applied_at, updated_at, guest_token_hash, guest_token_expires_at, consent_version,
    email_verified_at, verification_requested_at, reviewed_at, reviewed_by, cancelled_at
  ) values (
    target_event_id, null, 'verification_pending', trim(input_name), normalized_email,
    nullif(trim(coalesce(input_note, '')), ''), now(), now(), now(), input_token_hash,
    now() + interval '60 minutes', '2026-08-21', null, now(), null, null, null
  )
  on conflict (event_id, lower(applicant_email)) do update set
    status = 'verification_pending', applicant_name = excluded.applicant_name, note = excluded.note,
    consented_at = excluded.consented_at, applied_at = now(), updated_at = now(),
    guest_token_hash = excluded.guest_token_hash, guest_token_expires_at = excluded.guest_token_expires_at,
    email_verified_at = null, verification_requested_at = now(), reviewed_at = null, reviewed_by = null, cancelled_at = null
  returning id into saved_id;
  return query select saved_id, 'verification_pending'::text, true;
end;
$$;

create or replace function public.verify_guest_event_registration(input_token_hash text)
returns table (registration_id uuid, registration_status text, event_slug text, event_name text, applicant_name text, applicant_email text)
language plpgsql
security definer
set search_path = public
as $$
declare
  target_event_id uuid;
  target_registration public.event_registrations%rowtype;
  target_event public.events%rowtype;
  confirmed_count integer;
  next_status text;
begin
  select event_id into target_event_id from public.event_registrations
  where guest_token_hash = input_token_hash and user_id is null;
  if target_event_id is null then raise exception 'verification_link_invalid'; end if;
  select * into target_event from public.events where id = target_event_id for update;
  select * into target_registration from public.event_registrations
  where event_id = target_event_id and guest_token_hash = input_token_hash and user_id is null for update;
  if not found then raise exception 'verification_link_invalid'; end if;
  if target_registration.status <> 'verification_pending' then
    return query select target_registration.id, target_registration.status, target_event.slug,
      target_event.name, target_registration.applicant_name, target_registration.applicant_email;
    return;
  end if;
  if target_registration.guest_token_expires_at < now() then raise exception 'verification_link_expired'; end if;
  if target_event.status <> 'published' or target_event.registration_mode <> 'internal' or target_event.starts_at <= now()
    or (target_event.deadline is not null and target_event.deadline < now()) then raise exception 'registration_closed'; end if;

  select count(*) into confirmed_count from public.event_registrations where event_id = target_event.id and status = 'confirmed';
  if target_event.capacity is not null and confirmed_count >= target_event.capacity then
    if not target_event.waitlist_enabled then raise exception 'event_full'; end if;
    next_status := 'waitlisted';
  elsif target_event.approval_mode = 'manual' then next_status := 'pending';
  else next_status := 'confirmed';
  end if;
  update public.event_registrations set status = next_status, email_verified_at = now(), updated_at = now()
  where id = target_registration.id;
  if target_event.submitted_by is not null then
    insert into public.notifications (user_id, type, title, message, href, data)
    values (target_event.submitted_by, 'system', '새 행사 신청이 도착했어요.',
      target_event.name || ' 신청자를 확인해주세요.', '/my/events/' || target_event.slug,
      jsonb_build_object('kind', 'event_registration', 'event_id', target_event.id, 'registration_id', target_registration.id));
  end if;
  return query select target_registration.id, next_status, target_event.slug, target_event.name,
    target_registration.applicant_name, target_registration.applicant_email;
end;
$$;

create or replace function public.cancel_guest_event_registration(input_token_hash text)
returns table (
  registration_id uuid, registration_status text, event_slug text, event_name text,
  applicant_name text, applicant_email text, promoted_registration_id uuid, promoted_email text, promoted_name text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  target_event_id uuid;
  target_registration public.event_registrations%rowtype;
  target_event public.events%rowtype;
  promoted_registration public.event_registrations%rowtype;
  confirmed_count integer;
begin
  select event_id into target_event_id from public.event_registrations
  where guest_token_hash = input_token_hash and user_id is null;
  if target_event_id is null then raise exception 'verification_link_invalid'; end if;
  select * into target_event from public.events where id = target_event_id for update;
  select * into target_registration from public.event_registrations
  where event_id = target_event_id and guest_token_hash = input_token_hash and user_id is null for update;
  if not found then raise exception 'verification_link_invalid'; end if;
  if target_event.starts_at <= now() or target_registration.status not in ('pending', 'confirmed', 'waitlisted') then
    raise exception 'active_registration_not_found';
  end if;
  update public.event_registrations set status = 'cancelled', cancelled_at = now(), updated_at = now()
  where id = target_registration.id;
  if target_registration.status = 'confirmed' and target_event.approval_mode = 'instant' then
    select count(*) into confirmed_count from public.event_registrations where event_id = target_event.id and status = 'confirmed';
    select * into promoted_registration from public.event_registrations
    where event_id = target_event.id and status = 'waitlisted'
      and (target_event.capacity is null or confirmed_count < target_event.capacity)
    order by applied_at asc for update skip locked limit 1;
    if found then
      update public.event_registrations set status = 'confirmed', reviewed_at = now(), updated_at = now()
      where id = promoted_registration.id;
      if promoted_registration.user_id is not null then
        insert into public.notifications (user_id, type, title, message, href, data)
        values (promoted_registration.user_id, 'system', '행사 신청이 확정됐어요.',
          target_event.name || ' 대기 신청이 참가 확정으로 변경됐습니다.', '/events/' || target_event.slug,
          jsonb_build_object('kind', 'event_registration_status', 'event_id', target_event.id, 'registration_id', promoted_registration.id, 'status', 'confirmed'));
      end if;
    end if;
  end if;
  return query select target_registration.id, 'cancelled'::text, target_event.slug, target_event.name,
    target_registration.applicant_name, target_registration.applicant_email,
    promoted_registration.id, promoted_registration.applicant_email, promoted_registration.applicant_name;
end;
$$;

revoke all on function public.request_guest_event_registration(uuid, text, text, text, text) from public, anon, authenticated;
revoke all on function public.verify_guest_event_registration(text) from public, anon, authenticated;
revoke all on function public.cancel_guest_event_registration(text) from public, anon, authenticated;
grant execute on function public.request_guest_event_registration(uuid, text, text, text, text) to service_role;
grant execute on function public.verify_guest_event_registration(text) to service_role;
grant execute on function public.cancel_guest_event_registration(text) to service_role;

commit;
