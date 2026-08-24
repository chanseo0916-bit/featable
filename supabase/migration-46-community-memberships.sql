-- Community membership is separate from managers, curated founders, and event attendance.

begin;

create table if not exists public.community_memberships (
  id uuid primary key default uuid_generate_v4(),
  community_id uuid not null references public.communities(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'requested' check (status in ('requested', 'invited', 'active', 'declined', 'left')),
  display_role text not null default '멤버',
  is_public boolean not null default true,
  initiated_by text not null default 'user' check (initiated_by in ('user', 'manager')),
  invited_by uuid references public.profiles(id) on delete set null,
  requested_at timestamptz,
  joined_at timestamptz,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (community_id, user_id)
);

create index if not exists community_memberships_community_status_idx
  on public.community_memberships(community_id, status, joined_at desc);
create index if not exists community_memberships_user_status_idx
  on public.community_memberships(user_id, status, joined_at desc);

alter table public.community_memberships enable row level security;

drop policy if exists "community_memberships_select_visible" on public.community_memberships;
create policy "community_memberships_select_visible" on public.community_memberships for select
  using (user_id = auth.uid() or public.can_manage_community(community_id) or (status = 'active' and is_public = true));

drop policy if exists "community_memberships_manage" on public.community_memberships;
create policy "community_memberships_manage" on public.community_memberships for all
  using (public.can_manage_community(community_id)) with check (public.can_manage_community(community_id));

commit;
