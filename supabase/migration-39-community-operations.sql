-- Migration 39 — community operations console and delegated managers

begin;

create table if not exists public.community_managers (
  community_id uuid not null references public.communities(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'manager' check (role in ('manager', 'editor')),
  added_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (community_id, user_id)
);

create index if not exists community_managers_user_idx
  on public.community_managers(user_id, created_at desc);

create index if not exists community_founders_founder_idx on public.community_founders(founder_id);
create index if not exists community_brands_brand_idx on public.community_brands(brand_id);
create index if not exists events_community_idx on public.events(community_id);

create or replace function public.can_manage_community(target_community_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.communities c
    where c.id = target_community_id
      and (
        c.manager_user_id = auth.uid()
        or public.is_admin()
        or exists (
          select 1
          from public.community_managers cm
          where cm.community_id = c.id
            and cm.user_id = auth.uid()
        )
      )
  );
$$;

revoke all on function public.can_manage_community(uuid) from public, anon;
grant execute on function public.can_manage_community(uuid) to authenticated;

alter table public.community_managers enable row level security;

drop policy if exists "community_managers_select_related" on public.community_managers;
create policy "community_managers_select_related" on public.community_managers for select
  using (public.can_manage_community(community_id));

drop policy if exists "community_managers_owner_insert" on public.community_managers;
create policy "community_managers_owner_insert" on public.community_managers for insert
  with check (
    exists (
      select 1 from public.communities c
      where c.id = community_id
        and (c.manager_user_id = auth.uid() or public.is_admin())
    )
  );

drop policy if exists "community_managers_owner_update" on public.community_managers;
create policy "community_managers_owner_update" on public.community_managers for update
  using (
    exists (
      select 1 from public.communities c
      where c.id = community_id
        and (c.manager_user_id = auth.uid() or public.is_admin())
    )
  )
  with check (
    exists (
      select 1 from public.communities c
      where c.id = community_id
        and (c.manager_user_id = auth.uid() or public.is_admin())
    )
  );

drop policy if exists "community_managers_owner_delete" on public.community_managers;
create policy "community_managers_owner_delete" on public.community_managers for delete
  using (
    exists (
      select 1 from public.communities c
      where c.id = community_id
        and (c.manager_user_id = auth.uid() or public.is_admin())
    )
  );

drop policy if exists "communities_write" on public.communities;
drop policy if exists "communities_insert" on public.communities;
drop policy if exists "communities_update" on public.communities;
drop policy if exists "communities_delete" on public.communities;
create policy "communities_insert" on public.communities for insert
  with check (manager_user_id = auth.uid() or public.is_admin());
create policy "communities_update" on public.communities for update
  using (
    manager_user_id = auth.uid()
    or public.is_admin()
    or exists (select 1 from public.community_managers cm where cm.community_id = id and cm.user_id = auth.uid() and cm.role = 'manager')
  )
  with check (
    manager_user_id = auth.uid()
    or public.is_admin()
    or exists (select 1 from public.community_managers cm where cm.community_id = id and cm.user_id = auth.uid() and cm.role = 'manager')
  );
create policy "communities_delete" on public.communities for delete
  using (manager_user_id = auth.uid() or public.is_admin());

drop policy if exists "community_founders_write" on public.community_founders;
create policy "community_founders_write" on public.community_founders for all
  using (public.can_manage_community(community_id))
  with check (public.can_manage_community(community_id));

drop policy if exists "community_brands_write" on public.community_brands;
create policy "community_brands_write" on public.community_brands for all
  using (public.can_manage_community(community_id))
  with check (public.can_manage_community(community_id));

commit;
