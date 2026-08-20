-- Migration 15 — 브랜드별 공개 팀 프로필

alter table public.brand_members
  add column if not exists display_name text,
  add column if not exists title text not null default '팀 멤버',
  add column if not exists bio text,
  add column if not exists avatar_url text,
  add column if not exists is_public boolean not null default true,
  add column if not exists sort_order integer not null default 100;

update public.brand_members bm
set display_name = coalesce(nullif(trim(p.full_name), ''), split_part(coalesce(p.email, ''), '@', 1), '팀 멤버')
from public.profiles p
where p.id = bm.user_id
  and nullif(trim(bm.display_name), '') is null;

alter table public.brand_members
  alter column display_name set default '팀 멤버';

drop policy if exists "brand_members_update_related" on public.brand_members;
create policy "brand_members_update_related"
  on public.brand_members for update
  using (
    public.is_brand_owner(brand_id)
    or public.is_admin()
  )
  with check (
    public.is_brand_owner(brand_id)
    or public.is_admin()
  );

create or replace function public.update_my_brand_team_profile(
  p_brand_id uuid,
  p_display_name text,
  p_title text,
  p_bio text,
  p_avatar_url text,
  p_is_public boolean
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  changed_count integer;
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  if nullif(trim(p_display_name), '') is null or nullif(trim(p_title), '') is null then
    raise exception 'display name and title are required';
  end if;

  update public.brand_members
  set display_name = trim(p_display_name),
      title = trim(p_title),
      bio = nullif(trim(coalesce(p_bio, '')), ''),
      avatar_url = nullif(trim(coalesce(p_avatar_url, '')), ''),
      is_public = p_is_public
  where brand_id = p_brand_id
    and user_id = auth.uid();

  get diagnostics changed_count = row_count;
  return changed_count = 1;
end;
$$;

revoke execute on function public.update_my_brand_team_profile(uuid, text, text, text, text, boolean) from public, anon;
grant execute on function public.update_my_brand_team_profile(uuid, text, text, text, text, boolean) to authenticated;

-- 공개 페이지는 계정 ID나 초대 정보 없이 노출 허용 필드만 받는다.
create or replace function public.get_public_brand_team(p_brand_slug text)
returns table (
  member_key text,
  display_name text,
  title text,
  bio text,
  avatar_url text,
  sort_order integer
)
language sql
security definer
set search_path = public
stable
as $$
  select
    bm.brand_id::text || ':' || bm.user_id::text as member_key,
    coalesce(nullif(trim(bm.display_name), ''), '팀 멤버') as display_name,
    coalesce(nullif(trim(bm.title), ''), '팀 멤버') as title,
    bm.bio,
    bm.avatar_url,
    bm.sort_order
  from public.brand_members bm
  join public.brands b on b.id = bm.brand_id
  where b.slug = p_brand_slug
    and b.status = 'published'
    and bm.is_public = true
  order by bm.sort_order asc, bm.joined_at asc;
$$;

revoke execute on function public.get_public_brand_team(text) from public;
grant execute on function public.get_public_brand_team(text) to anon, authenticated;

-- 기존 초대 수락 흐름에 팀 프로필의 기본 이름을 함께 채운다.
create or replace function public.accept_brand_invitation(p_token uuid)
returns table (brand_slug text, brand_name text)
language plpgsql
security definer
set search_path = public
as $$
declare
  invite public.brand_invitations%rowtype;
  current_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  current_name text;
begin
  if auth.uid() is null or current_email = '' then
    raise exception 'authentication required';
  end if;

  select * into invite
  from public.brand_invitations
  where token = p_token
    and accepted_at is null
    and expires_at > now()
    and lower(email) = current_email
  for update;

  if not found then
    raise exception 'invalid or expired invitation';
  end if;

  select coalesce(nullif(trim(full_name), ''), split_part(current_email, '@', 1), '팀 멤버')
  into current_name
  from public.profiles
  where id = auth.uid();

  insert into public.brand_members (brand_id, user_id, member_role, invited_by, display_name)
  values (invite.brand_id, auth.uid(), invite.member_role, invite.invited_by, current_name)
  on conflict (brand_id, user_id) do update
  set member_role = excluded.member_role,
      display_name = coalesce(nullif(public.brand_members.display_name, ''), excluded.display_name);

  update public.brand_invitations
  set accepted_at = now(), accepted_by = auth.uid()
  where id = invite.id;

  return query
    select b.slug, b.name from public.brands b where b.id = invite.brand_id;
end;
$$;

revoke execute on function public.accept_brand_invitation(uuid) from public, anon;
grant execute on function public.accept_brand_invitation(uuid) to authenticated;

select 'brand_team_profiles_ready' as result;
