-- Migration 45 — partner company workspaces, shared communities, and team roles.
begin;

alter table public.communities
  add column if not exists partner_id uuid references public.partners(id) on delete set null;

create table if not exists public.partner_members (
  partner_id uuid not null references public.partners(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  member_role text not null default 'editor' check (member_role in ('manager', 'editor', 'viewer')),
  invited_by uuid references public.profiles(id) on delete set null,
  joined_at timestamptz not null default now(),
  primary key (partner_id, user_id)
);

create table if not exists public.partner_invitations (
  id uuid primary key default uuid_generate_v4(),
  partner_id uuid not null references public.partners(id) on delete cascade,
  invitee_user_id uuid references public.profiles(id) on delete cascade,
  invitee_email text not null,
  member_role text not null default 'editor' check (member_role in ('manager', 'editor', 'viewer')),
  invited_by uuid not null references public.profiles(id) on delete cascade,
  token uuid not null default uuid_generate_v4() unique,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'expired')),
  expires_at timestamptz not null default now() + interval '7 days',
  created_at timestamptz not null default now()
);

create index if not exists communities_partner_idx on public.communities(partner_id, created_at desc);
create index if not exists partner_members_user_idx on public.partner_members(user_id, joined_at desc);
create index if not exists partner_invitations_partner_idx on public.partner_invitations(partner_id, created_at desc);
create index if not exists partner_invitations_email_idx on public.partner_invitations(lower(invitee_email), status);

create or replace function public.is_partner_owner(target_partner_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.partners p
    where p.id = target_partner_id and (p.owner_user_id = auth.uid() or public.is_admin())
  );
$$;

create or replace function public.can_manage_partner(target_partner_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_partner_owner(target_partner_id) or exists (
    select 1 from public.partner_members pm
    where pm.partner_id = target_partner_id
      and pm.user_id = auth.uid()
      and pm.member_role in ('manager', 'editor')
  );
$$;

create or replace function public.can_edit_partner_profile(target_partner_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_partner_owner(target_partner_id) or exists (
    select 1 from public.partner_members pm
    where pm.partner_id = target_partner_id
      and pm.user_id = auth.uid()
      and pm.member_role = 'manager'
  );
$$;

create or replace function public.can_manage_community(target_community_id uuid)
returns boolean language sql stable security definer set search_path = public, auth as $$
  select exists (
    select 1 from public.communities c
    where c.id = target_community_id
      and (
        c.manager_user_id = auth.uid()
        or public.is_admin()
        or (c.partner_id is not null and public.can_manage_partner(c.partner_id))
        or exists (
          select 1 from public.community_managers cm
          where cm.community_id = c.id and cm.user_id = auth.uid()
        )
      )
  );
$$;

revoke all on function public.is_partner_owner(uuid) from public, anon;
revoke all on function public.can_manage_partner(uuid) from public, anon;
revoke all on function public.can_edit_partner_profile(uuid) from public, anon;
grant execute on function public.is_partner_owner(uuid) to authenticated;
grant execute on function public.can_manage_partner(uuid) to authenticated;
grant execute on function public.can_edit_partner_profile(uuid) to authenticated;

alter table public.partner_members enable row level security;
alter table public.partner_invitations enable row level security;
drop policy if exists "partner_members_select" on public.partner_members;
drop policy if exists "partner_members_insert" on public.partner_members;
drop policy if exists "partner_members_update" on public.partner_members;
drop policy if exists "partner_members_delete" on public.partner_members;
create policy "partner_members_select" on public.partner_members for select
  using (user_id = auth.uid() or public.can_manage_partner(partner_id) or public.is_admin());
create policy "partner_members_insert" on public.partner_members for insert
  with check (public.is_partner_owner(partner_id));
create policy "partner_members_update" on public.partner_members for update
  using (public.is_partner_owner(partner_id)) with check (public.is_partner_owner(partner_id));
create policy "partner_members_delete" on public.partner_members for delete
  using (public.is_partner_owner(partner_id) or user_id = auth.uid());

drop policy if exists "partner_invitations_select" on public.partner_invitations;
drop policy if exists "partner_invitations_insert" on public.partner_invitations;
drop policy if exists "partner_invitations_update" on public.partner_invitations;
drop policy if exists "partner_invitations_delete" on public.partner_invitations;
create policy "partner_invitations_select" on public.partner_invitations for select
  using (public.is_partner_owner(partner_id) or invitee_user_id = auth.uid() or lower(invitee_email) = lower(coalesce(auth.jwt() ->> 'email', '')));
create policy "partner_invitations_insert" on public.partner_invitations for insert
  with check (public.is_partner_owner(partner_id) and invited_by = auth.uid());
create policy "partner_invitations_update" on public.partner_invitations for update
  using (public.is_partner_owner(partner_id) or invitee_user_id = auth.uid() or lower(invitee_email) = lower(coalesce(auth.jwt() ->> 'email', '')));
create policy "partner_invitations_delete" on public.partner_invitations for delete
  using (public.is_partner_owner(partner_id));

drop policy if exists "partners_update" on public.partners;
create policy "partners_update" on public.partners for update
  using (public.can_edit_partner_profile(id)) with check (public.can_edit_partner_profile(id));

drop policy if exists "jobs_select" on public.jobs;
drop policy if exists "jobs_insert" on public.jobs;
drop policy if exists "jobs_update" on public.jobs;
drop policy if exists "jobs_delete" on public.jobs;
create policy "jobs_select" on public.jobs for select using (
  status = 'published'
  or (brand_id is not null and public.owns_brand(brand_id))
  or (community_id is not null and public.can_manage_community(community_id))
  or (partner_id is not null and public.can_manage_partner(partner_id))
  or public.is_admin()
);
create policy "jobs_insert" on public.jobs for insert with check (
  (brand_id is not null and public.owns_brand(brand_id))
  or (community_id is not null and public.can_manage_community(community_id))
  or (partner_id is not null and public.can_manage_partner(partner_id))
  or public.is_admin()
);
create policy "jobs_update" on public.jobs for update using (
  (brand_id is not null and public.owns_brand(brand_id))
  or (community_id is not null and public.can_manage_community(community_id))
  or (partner_id is not null and public.can_manage_partner(partner_id))
  or public.is_admin()
) with check (
  (brand_id is not null and public.owns_brand(brand_id))
  or (community_id is not null and public.can_manage_community(community_id))
  or (partner_id is not null and public.can_manage_partner(partner_id))
  or public.is_admin()
);
create policy "jobs_delete" on public.jobs for delete using (
  (brand_id is not null and public.owns_brand(brand_id))
  or (community_id is not null and public.can_manage_community(community_id))
  or (partner_id is not null and public.can_manage_partner(partner_id))
  or public.is_admin()
);

-- Existing organizations created by the same account become one workspace automatically.
update public.communities c
set partner_id = p.id
from public.partners p
where c.partner_id is null and c.manager_user_id = p.owner_user_id;

commit;
