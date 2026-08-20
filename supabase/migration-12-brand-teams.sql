-- Migration 12 — 브랜드 팀 초대와 공동 편집

create table if not exists public.brand_members (
  brand_id uuid not null references public.brands(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  member_role text not null default 'editor' check (member_role in ('editor', 'viewer')),
  invited_by uuid references public.profiles(id) on delete set null,
  joined_at timestamptz not null default now(),
  primary key (brand_id, user_id)
);

create table if not exists public.brand_invitations (
  id uuid primary key default uuid_generate_v4(),
  brand_id uuid not null references public.brands(id) on delete cascade,
  email text not null,
  token uuid not null default uuid_generate_v4() unique,
  member_role text not null default 'editor' check (member_role in ('editor', 'viewer')),
  invited_by uuid not null references public.profiles(id) on delete cascade,
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz,
  accepted_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists brand_members_user_idx on public.brand_members(user_id);
create index if not exists brand_invitations_brand_idx on public.brand_invitations(brand_id, created_at desc);
create index if not exists brand_invitations_email_idx on public.brand_invitations(lower(email));

-- 브랜드 원소유자만 판별한다. 멤버 관리 정책에서 재귀를 피하기 위한 함수다.
create or replace function public.is_brand_owner(p_brand_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.brands b
    join public.founders f on f.id = b.founder_id
    where b.id = p_brand_id and f.user_id = auth.uid()
  );
$$;

-- 기존 소유권 함수에 수락된 팀 편집자를 포함한다.
create or replace function public.owns_brand(b_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.is_brand_owner(b_id)
    or exists (
      select 1 from public.brand_members bm
      where bm.brand_id = b_id
        and bm.user_id = auth.uid()
        and bm.member_role = 'editor'
    );
$$;

alter table public.brand_members enable row level security;
alter table public.brand_invitations enable row level security;

drop policy if exists "brand_members_select_related" on public.brand_members;
create policy "brand_members_select_related" on public.brand_members for select
  using (user_id = auth.uid() or public.is_brand_owner(brand_id) or public.is_admin());

drop policy if exists "brand_members_delete_owner" on public.brand_members;
create policy "brand_members_delete_owner" on public.brand_members for delete
  using (user_id = auth.uid() or public.is_brand_owner(brand_id) or public.is_admin());

drop policy if exists "brand_invitations_select_related" on public.brand_invitations;
create policy "brand_invitations_select_related" on public.brand_invitations for select
  using (
    public.is_brand_owner(brand_id)
    or public.is_admin()
    or lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

drop policy if exists "brand_invitations_insert_owner" on public.brand_invitations;
create policy "brand_invitations_insert_owner" on public.brand_invitations for insert
  with check (public.is_brand_owner(brand_id) and invited_by = auth.uid());

drop policy if exists "brand_invitations_delete_owner" on public.brand_invitations;
create policy "brand_invitations_delete_owner" on public.brand_invitations for delete
  using (public.is_brand_owner(brand_id) or public.is_admin());

-- 팀 편집자가 비공개 브랜드를 읽고 수정할 수 있도록 기존 정책을 확장한다.
drop policy if exists "brands_select_published" on public.brands;
create policy "brands_select_published" on public.brands for select
  using (status = 'published' or public.owns_brand(id) or public.is_admin());

drop policy if exists "brands_update_own" on public.brands;
create policy "brands_update_own" on public.brands for update
  using (public.owns_brand(id) or public.is_admin());

drop policy if exists "brands_delete_own" on public.brands;
create policy "brands_delete_own" on public.brands for delete
  using (public.is_brand_owner(id) or public.is_admin());

create or replace function public.set_brand_publication_state(
  p_brand_id uuid,
  p_publish boolean
)
returns boolean
language plpgsql
security invoker
set search_path = public
as $$
declare
  next_status public.content_status := case when p_publish then 'published' else 'draft' end;
  changed_count integer;
begin
  update public.brands
  set status = next_status, updated_at = now()
  where id = p_brand_id
    and (public.owns_brand(id) or public.is_admin());

  get diagnostics changed_count = row_count;
  if changed_count = 0 then return false; end if;

  update public.products
  set status = next_status, updated_at = now()
  where brand_id = p_brand_id;

  return true;
end;
$$;

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

  insert into public.brand_members (brand_id, user_id, member_role, invited_by)
  values (invite.brand_id, auth.uid(), invite.member_role, invite.invited_by)
  on conflict (brand_id, user_id) do update set member_role = excluded.member_role;

  update public.brand_invitations
  set accepted_at = now(), accepted_by = auth.uid()
  where id = invite.id;

  return query
    select b.slug, b.name from public.brands b where b.id = invite.brand_id;
end;
$$;

revoke execute on function public.accept_brand_invitation(uuid) from public, anon;
grant execute on function public.accept_brand_invitation(uuid) to authenticated;

