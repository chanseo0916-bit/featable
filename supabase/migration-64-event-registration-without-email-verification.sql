begin;

-- Guest applicants are registered immediately. The token remains only for
-- legacy guest identity constraints; no email click is required.
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
  confirmed_count integer;
  next_status text;
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

  select * into existing_registration
  from public.event_registrations
  where event_id = target_event_id and lower(applicant_email) = normalized_email
  for update;

  if found and existing_registration.user_id is not null then
    return query select existing_registration.id, existing_registration.status, false;
    return;
  end if;
  if found and existing_registration.status in ('pending', 'confirmed', 'waitlisted') then
    return query select existing_registration.id, existing_registration.status, false;
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
    event_id, user_id, status, applicant_name, applicant_email, note, consented_at,
    applied_at, updated_at, guest_token_hash, guest_token_expires_at, consent_version,
    email_verified_at, verification_requested_at, reviewed_at, reviewed_by, cancelled_at
  ) values (
    target_event_id, null, next_status, trim(input_name), normalized_email,
    nullif(trim(coalesce(input_note, '')), ''), now(), now(), now(), input_token_hash,
    now() + interval '365 days', '2026-08-21', null, null, null, null, null
  )
  on conflict (event_id, lower(applicant_email)) do update set
    status = excluded.status,
    applicant_name = excluded.applicant_name,
    note = excluded.note,
    consented_at = excluded.consented_at,
    applied_at = now(),
    updated_at = now(),
    guest_token_hash = excluded.guest_token_hash,
    guest_token_expires_at = excluded.guest_token_expires_at,
    email_verified_at = null,
    verification_requested_at = null,
    reviewed_at = null,
    reviewed_by = null,
    cancelled_at = null
  returning id into saved_id;

  if target_event.submitted_by is not null then
    insert into public.notifications (user_id, type, title, message, href, data)
    values (
      target_event.submitted_by,
      'system',
      '새 행사 신청이 들어왔어요.',
      target_event.name || ' 신청자를 확인해주세요.',
      '/my/events/' || target_event.slug,
      jsonb_build_object('kind', 'event_registration', 'event_id', target_event.id, 'registration_id', saved_id)
    );
  end if;

  return query select saved_id, next_status, true;
end;
$$;

revoke all on function public.request_guest_event_registration(uuid, text, text, text, text) from public, anon, authenticated;
grant execute on function public.request_guest_event_registration(uuid, text, text, text, text) to service_role;

commit;
