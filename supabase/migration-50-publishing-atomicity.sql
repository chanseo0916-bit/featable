-- Migration 50: make self-serve event and approved profile publishing atomic.
-- Safe to re-run: all schema objects and function definitions are idempotent.

begin;

alter table public.partner_submissions
  add column if not exists publish_key text,
  add column if not exists published_event_id uuid references public.events(id) on delete set null;

alter table public.events
  add column if not exists source_submission_id uuid references public.partner_submissions(id) on delete set null;

alter table public.publishing_invitations
  add column if not exists published_path text;

create unique index if not exists partner_submissions_event_publish_key_idx
  on public.partner_submissions(user_id, publish_key)
  where submission_type = 'event' and publish_key is not null;

create unique index if not exists events_source_submission_id_idx
  on public.events(source_submission_id)
  where source_submission_id is not null;

-- The service-only functions are called only after the application has checked
-- the signed-in user's access. The functions repeat the ownership checks so a
-- leaked or replayed request cannot publish for another account.
create or replace function public.publish_standard_event(
  p_user_id uuid,
  p_submission_id uuid,
  p_publish_key text,
  p_submission_payload jsonb,
  p_event jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_submission_id uuid := p_submission_id;
  v_submission public.partner_submissions%rowtype;
  v_event public.events%rowtype;
  v_slug text := nullif(trim(p_event ->> 'slug'), '');
  v_gallery_urls text[] := array(
    select jsonb_array_elements_text(coalesce(p_event -> 'gallery_urls', '[]'::jsonb))
  );
begin
  if p_user_id is null then
    raise exception 'authentication_required';
  end if;

  if v_slug is null then
    raise exception 'event_slug_required';
  end if;

  if v_submission_id is null then
    if nullif(trim(coalesce(p_publish_key, '')), '') is null then
      raise exception 'event_publish_key_required';
    end if;

    insert into public.partner_submissions (
      user_id, submission_type, status, title, payload, publish_key,
      submitted_at, updated_at
    ) values (
      p_user_id,
      'event',
      'draft',
      coalesce(p_submission_payload ->> 'name', ''),
      coalesce(p_submission_payload, '{}'::jsonb),
      p_publish_key,
      now(),
      now()
    )
    on conflict (user_id, publish_key)
      where submission_type = 'event' and publish_key is not null
    do update set updated_at = now()
    returning id into v_submission_id;
  end if;

  select * into v_submission
  from public.partner_submissions
  where id = v_submission_id
  for update;

  if not found
    or v_submission.user_id <> p_user_id
    or v_submission.submission_type <> 'event' then
    raise exception 'submission_not_found';
  end if;

  if v_submission.published_event_id is not null then
    select * into v_event
    from public.events
    where id = v_submission.published_event_id;

    if found then
      return jsonb_build_object(
        'submission_id', v_submission.id,
        'event_id', v_event.id,
        'path', '/events/' || v_event.slug,
        'status', 'approved',
        'already_published', true
      );
    end if;
  end if;

  select * into v_event
  from public.events
  where source_submission_id = v_submission.id;

  if found then
    update public.partner_submissions
    set status = 'approved',
        published_event_id = v_event.id,
        published_path = '/events/' || v_event.slug,
        review_note = 'Published as a standard event.',
        reviewed_at = coalesce(reviewed_at, now()),
        updated_at = now()
    where id = v_submission.id;

    return jsonb_build_object(
      'submission_id', v_submission.id,
      'event_id', v_event.id,
      'path', '/events/' || v_event.slug,
      'status', 'approved',
      'already_published', true
    );
  end if;

  if v_submission.status not in ('draft', 'rejected', 'submitted') then
    raise exception 'submission_not_publishable';
  end if;

  update public.partner_submissions
  set title = coalesce(p_submission_payload ->> 'name', ''),
      payload = coalesce(p_submission_payload, '{}'::jsonb),
      submitted_at = coalesce(submitted_at, now()),
      updated_at = now()
  where id = v_submission.id;

  insert into public.events (
    slug, name, host, starts_at, ends_at, deadline, location, is_online,
    fee, is_paid, payment_account, payment_notice, category, audience,
    apply_url, registration_mode, approval_mode, capacity, waitlist_enabled,
    cover_url, description, gallery_urls, program, status, is_featured,
    submitted_by, source_submission_id
  ) values (
    v_slug,
    coalesce(p_event ->> 'name', ''),
    coalesce(p_event ->> 'host', ''),
    (p_event ->> 'starts_at')::timestamptz,
    nullif(p_event ->> 'ends_at', '')::timestamptz,
    nullif(p_event ->> 'deadline', '')::timestamptz,
    coalesce(p_event ->> 'location', ''),
    coalesce((p_event ->> 'is_online')::boolean, false),
    nullif(p_event ->> 'fee', ''),
    coalesce((p_event ->> 'is_paid')::boolean, false),
    nullif(p_event ->> 'payment_account', ''),
    nullif(p_event ->> 'payment_notice', ''),
    coalesce(nullif(p_event ->> 'category', ''), '기타'),
    nullif(p_event ->> 'audience', ''),
    nullif(p_event ->> 'apply_url', ''),
    coalesce(nullif(p_event ->> 'registration_mode', ''), 'external'),
    coalesce(nullif(p_event ->> 'approval_mode', ''), 'instant'),
    nullif(p_event ->> 'capacity', '')::integer,
    coalesce((p_event ->> 'waitlist_enabled')::boolean, true),
    nullif(p_event ->> 'cover_url', ''),
    coalesce(p_event ->> 'description', ''),
    coalesce(v_gallery_urls, '{}'::text[]),
    coalesce(p_event -> 'program', '[]'::jsonb),
    'published',
    false,
    p_user_id,
    v_submission.id
  )
  returning * into v_event;

  update public.partner_submissions
  set status = 'approved',
      title = coalesce(p_submission_payload ->> 'name', ''),
      payload = coalesce(p_submission_payload, '{}'::jsonb),
      published_event_id = v_event.id,
      published_path = '/events/' || v_event.slug,
      review_note = 'Published as a standard event.',
      reviewed_at = now(),
      updated_at = now()
  where id = v_submission.id;

  return jsonb_build_object(
    'submission_id', v_submission.id,
    'event_id', v_event.id,
    'path', '/events/' || v_event.slug,
    'status', 'approved',
    'already_published', false
  );
end;
$$;

revoke all on function public.publish_standard_event(uuid, uuid, text, jsonb, jsonb)
  from public, anon, authenticated;
grant execute on function public.publish_standard_event(uuid, uuid, text, jsonb, jsonb)
  to service_role;

create or replace function public.publish_approved_profile(
  p_invitation_id uuid,
  p_user_id uuid,
  p_slug text,
  p_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invitation public.publishing_invitations%rowtype;
  v_entity_id uuid;
  v_path text;
  v_published_at timestamptz := now();
  v_payload jsonb := coalesce(p_payload, '{}'::jsonb);
begin
  if p_user_id is null then
    raise exception 'authentication_required';
  end if;

  select * into v_invitation
  from public.publishing_invitations
  where id = p_invitation_id
  for update;

  if not found or v_invitation.user_id <> p_user_id then
    raise exception 'invitation_not_found';
  end if;

  if v_invitation.status = 'published' then
    if v_invitation.entity_id is null or v_invitation.published_path is null then
      raise exception 'published_invitation_incomplete';
    end if;

    return jsonb_build_object(
      'entity_id', v_invitation.entity_id,
      'path', v_invitation.published_path,
      'already_published', true
    );
  end if;

  if v_invitation.status not in ('pending', 'editing') then
    raise exception 'invitation_not_publishable';
  end if;

  if v_invitation.registration_type = 'partner' then
    insert into public.partners (
      owner_user_id, name, logo_url, href, intro, description, field, status, is_featured
    ) values (
      p_user_id,
      coalesce(v_payload ->> 'name', ''),
      coalesce(v_payload ->> 'logoUrl', ''),
      coalesce(nullif(v_payload ->> 'website', ''), '/partners'),
      coalesce(v_payload ->> 'intro', ''),
      coalesce(nullif(v_payload ->> 'description', ''), v_payload ->> 'intro', ''),
      coalesce(v_payload ->> 'field', ''),
      'published',
      false
    )
    returning id into v_entity_id;
    v_path := '/partners';
  else
    if nullif(trim(coalesce(p_slug, '')), '') is null then
      raise exception 'community_slug_required';
    end if;

    insert into public.communities (
      manager_user_id, slug, name, logo_url, intro, field, website, sns, status
    ) values (
      p_user_id,
      p_slug,
      coalesce(v_payload ->> 'name', ''),
      nullif(v_payload ->> 'logoUrl', ''),
      coalesce(v_payload ->> 'intro', ''),
      coalesce(v_payload ->> 'field', ''),
      nullif(v_payload ->> 'website', ''),
      case
        when nullif(v_payload ->> 'instagram', '') is null then '{}'::jsonb
        else jsonb_build_object('instagram', regexp_replace(v_payload ->> 'instagram', '^@', ''))
      end,
      'published'
    )
    returning id into v_entity_id;
    v_path := '/communities/' || p_slug;
  end if;

  update public.publishing_invitations
  set draft_payload = v_payload,
      status = 'published',
      entity_id = v_entity_id,
      published_path = v_path,
      published_at = v_published_at,
      updated_at = v_published_at
  where id = v_invitation.id;

  return jsonb_build_object(
    'entity_id', v_entity_id,
    'path', v_path,
    'already_published', false
  );
end;
$$;

revoke all on function public.publish_approved_profile(uuid, uuid, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.publish_approved_profile(uuid, uuid, text, jsonb)
  to service_role;

commit;
