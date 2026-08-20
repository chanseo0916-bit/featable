-- In-app notifications and account-to-account brand invitations.

alter table public.brand_invitations
  add column if not exists invitee_user_id uuid references public.profiles(id) on delete cascade,
  add column if not exists declined_at timestamptz;

create index if not exists brand_invitations_invitee_idx
  on public.brand_invitations(invitee_user_id, created_at desc);

create table if not exists public.notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  brand_id uuid references public.brands(id) on delete cascade,
  invitation_id uuid references public.brand_invitations(id) on delete cascade,
  type text not null check (type in ('team_invite', 'system')),
  title text not null,
  message text not null default '',
  href text,
  data jsonb not null default '{}',
  read_at timestamptz,
  resolved_at timestamptz,
  action_status text check (action_status in ('accepted', 'declined')),
  created_at timestamptz not null default now()
);

alter table public.notifications
  add column if not exists resolved_at timestamptz,
  add column if not exists action_status text;

do $$ begin
  alter table public.notifications
    add constraint notifications_action_status_check
    check (action_status in ('accepted', 'declined'));
exception when duplicate_object then null;
end $$;

create index if not exists notifications_user_created_idx
  on public.notifications(user_id, created_at desc);
create index if not exists notifications_user_unread_idx
  on public.notifications(user_id, created_at desc) where read_at is null;
create unique index if not exists notifications_pending_invite_unique
  on public.notifications(user_id, invitation_id) where invitation_id is not null;

alter table public.notifications enable row level security;

drop policy if exists "notifications_select_own" on public.notifications;
create policy "notifications_select_own" on public.notifications for select
  using (user_id = auth.uid());

drop policy if exists "notifications_update_own" on public.notifications;
create policy "notifications_update_own" on public.notifications for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "notifications_delete_own" on public.notifications;
create policy "notifications_delete_own" on public.notifications for delete
  using (user_id = auth.uid());

drop policy if exists "brand_invitations_select_related" on public.brand_invitations;
create policy "brand_invitations_select_related" on public.brand_invitations for select
  using (
    public.is_brand_owner(brand_id)
    or public.is_admin()
    or invitee_user_id = auth.uid()
    or lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

create or replace function public.search_brand_invite_candidates(
  p_brand_id uuid,
  p_query text
)
returns table (
  user_id uuid,
  display_name text,
  avatar_url text,
  headline text,
  member_type text
)
language sql
security definer
set search_path = public
stable
as $$
  select
    p.id,
    coalesce(nullif(trim(p.full_name), ''), nullif(trim(f.name), ''), 'Featable 멤버'),
    f.avatar_url,
    nullif(trim(f.headline), ''),
    p.member_type
  from public.profiles p
  left join public.founders f on f.user_id = p.id
  where auth.uid() is not null
    and public.is_brand_owner(p_brand_id)
    and length(trim(coalesce(p_query, ''))) >= 2
    and p.id <> auth.uid()
    and p.onboarding_completed_at is not null
    and not exists (
      select 1 from public.brand_members bm
      where bm.brand_id = p_brand_id and bm.user_id = p.id
    )
    and (
      p.full_name ilike '%' || trim(p_query) || '%'
      or f.name ilike '%' || trim(p_query) || '%'
      or f.headline ilike '%' || trim(p_query) || '%'
    )
  order by
    case when lower(coalesce(p.full_name, f.name, '')) = lower(trim(p_query)) then 0 else 1 end,
    coalesce(p.full_name, f.name)
  limit 8;
$$;

revoke execute on function public.search_brand_invite_candidates(uuid, text) from public, anon;
grant execute on function public.search_brand_invite_candidates(uuid, text) to authenticated;

create or replace function public.create_in_app_brand_invitation(
  p_brand_id uuid,
  p_invitee_user_id uuid,
  p_member_role text default 'editor'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  invite_id uuid;
  invitee_email text;
  brand_name text;
begin
  if auth.uid() is null or not public.is_brand_owner(p_brand_id) then
    raise exception 'brand owner required';
  end if;
  if p_member_role not in ('editor', 'viewer') then
    raise exception 'invalid member role';
  end if;
  if p_invitee_user_id = auth.uid() then
    raise exception 'cannot invite yourself';
  end if;
  if exists (select 1 from public.brand_members where brand_id = p_brand_id and user_id = p_invitee_user_id) then
    raise exception 'already a team member';
  end if;

  select email into invitee_email from public.profiles where id = p_invitee_user_id;
  select name into brand_name from public.brands where id = p_brand_id;
  if invitee_email is null or brand_name is null then raise exception 'account not found'; end if;

  delete from public.brand_invitations
  where brand_id = p_brand_id
    and invitee_user_id = p_invitee_user_id
    and accepted_at is null;

  insert into public.brand_invitations (
    brand_id, email, invitee_user_id, member_role, invited_by
  ) values (
    p_brand_id, lower(invitee_email), p_invitee_user_id, p_member_role, auth.uid()
  ) returning id into invite_id;

  insert into public.notifications (
    user_id, actor_id, brand_id, invitation_id, type, title, message, href, data
  ) values (
    p_invitee_user_id,
    auth.uid(),
    p_brand_id,
    invite_id,
    'team_invite',
    brand_name || ' 팀 초대',
    case when p_member_role = 'editor' then '브랜드와 프로덕트를 함께 관리할 수 있어요.' else '브랜드 워크스페이스를 볼 수 있어요.' end,
    '/my',
    jsonb_build_object('brand_name', brand_name, 'member_role', p_member_role)
  );

  return invite_id;
end;
$$;

revoke execute on function public.create_in_app_brand_invitation(uuid, uuid, text) from public, anon;
grant execute on function public.create_in_app_brand_invitation(uuid, uuid, text) to authenticated;

create or replace function public.respond_to_brand_invitation(
  p_invitation_id uuid,
  p_accept boolean
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  invite public.brand_invitations%rowtype;
  current_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  result_slug text;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;

  select * into invite
  from public.brand_invitations
  where id = p_invitation_id
    and accepted_at is null
    and declined_at is null
    and expires_at > now()
    and (invitee_user_id = auth.uid() or lower(email) = current_email)
  for update;

  if not found then raise exception 'invalid or expired invitation'; end if;

  if p_accept then
    insert into public.brand_members (brand_id, user_id, member_role, invited_by)
    values (invite.brand_id, auth.uid(), invite.member_role, invite.invited_by)
    on conflict (brand_id, user_id) do update set member_role = excluded.member_role;

    update public.brand_invitations
      set accepted_at = now(), accepted_by = auth.uid()
      where id = invite.id;
  else
    update public.brand_invitations set declined_at = now() where id = invite.id;
  end if;

  update public.notifications set
    read_at = coalesce(read_at, now()),
    resolved_at = now(),
    action_status = case when p_accept then 'accepted' else 'declined' end
  where user_id = auth.uid() and invitation_id = invite.id;

  select slug into result_slug from public.brands where id = invite.brand_id;
  return result_slug;
end;
$$;

revoke execute on function public.respond_to_brand_invitation(uuid, boolean) from public, anon;
grant execute on function public.respond_to_brand_invitation(uuid, boolean) to authenticated;

create or replace function public.accept_brand_invitation(p_token uuid)
returns table (brand_slug text, brand_name text)
language plpgsql
security definer
set search_path = public
as $$
declare
  invite public.brand_invitations%rowtype;
  current_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;

  select * into invite
  from public.brand_invitations
  where token = p_token
    and accepted_at is null
    and declined_at is null
    and expires_at > now()
    and (invitee_user_id = auth.uid() or lower(email) = current_email)
  for update;

  if not found then raise exception 'invalid or expired invitation'; end if;

  insert into public.brand_members (brand_id, user_id, member_role, invited_by)
  values (invite.brand_id, auth.uid(), invite.member_role, invite.invited_by)
  on conflict (brand_id, user_id) do update set member_role = excluded.member_role;

  update public.brand_invitations
    set accepted_at = now(), accepted_by = auth.uid()
    where id = invite.id;
  update public.notifications set
    read_at = coalesce(read_at, now()),
    resolved_at = now(),
    action_status = 'accepted'
    where user_id = auth.uid() and invitation_id = invite.id;

  return query select b.slug, b.name from public.brands b where b.id = invite.brand_id;
end;
$$;

revoke execute on function public.accept_brand_invitation(uuid) from public, anon;
grant execute on function public.accept_brand_invitation(uuid) to authenticated;

create or replace function public.mark_my_notifications_read()
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare changed_count integer;
begin
  update public.notifications set read_at = now()
  where user_id = auth.uid() and read_at is null;
  get diagnostics changed_count = row_count;
  return changed_count;
end;
$$;

revoke execute on function public.mark_my_notifications_read() from public, anon;
grant execute on function public.mark_my_notifications_read() to authenticated;
