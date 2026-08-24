-- Migration 44 — brands, communities, and approved partners can manage job posts.
begin;

alter table public.jobs
  alter column brand_id drop not null,
  add column if not exists community_id uuid references public.communities(id) on delete cascade,
  add column if not exists partner_id uuid references public.partners(id) on delete cascade,
  add column if not exists description text not null default '',
  add column if not exists requirements text[] not null default '{}',
  add column if not exists deadline date,
  add column if not exists updated_at timestamptz not null default now();

alter table public.jobs
  drop constraint if exists jobs_owner_required;

alter table public.jobs
  drop constraint if exists jobs_type_check;

alter table public.jobs
  add constraint jobs_type_check
  check (type in ('정규직', '계약직', '인턴', '파트타임'));

alter table public.jobs
  add constraint jobs_owner_required
  check (num_nonnulls(brand_id, community_id, partner_id) = 1);

create index if not exists jobs_partner_created_idx
  on public.jobs(partner_id, created_at desc);
create index if not exists jobs_community_created_idx
  on public.jobs(community_id, created_at desc);

drop policy if exists "jobs_select" on public.jobs;
drop policy if exists "jobs_write" on public.jobs;
drop policy if exists "jobs_insert" on public.jobs;
drop policy if exists "jobs_update" on public.jobs;
drop policy if exists "jobs_delete" on public.jobs;

create policy "jobs_select" on public.jobs for select
  using (
    status = 'published'
    or (brand_id is not null and public.owns_brand(brand_id))
    or (community_id is not null and public.can_manage_community(community_id))
    or exists (
      select 1 from public.partners p
      where p.id = jobs.partner_id and p.owner_user_id = auth.uid()
    )
    or public.is_admin()
  );

create policy "jobs_insert" on public.jobs for insert
  with check (
    (brand_id is not null and public.owns_brand(brand_id))
    or (community_id is not null and public.can_manage_community(community_id))
    or exists (
      select 1 from public.partners p
      where p.id = jobs.partner_id and p.owner_user_id = auth.uid()
    )
    or public.is_admin()
  );

create policy "jobs_update" on public.jobs for update
  using (
    (brand_id is not null and public.owns_brand(brand_id))
    or (community_id is not null and public.can_manage_community(community_id))
    or exists (
      select 1 from public.partners p
      where p.id = jobs.partner_id and p.owner_user_id = auth.uid()
    )
    or public.is_admin()
  )
  with check (
    (brand_id is not null and public.owns_brand(brand_id))
    or (community_id is not null and public.can_manage_community(community_id))
    or exists (
      select 1 from public.partners p
      where p.id = jobs.partner_id and p.owner_user_id = auth.uid()
    )
    or public.is_admin()
  );

create policy "jobs_delete" on public.jobs for delete
  using (
    (brand_id is not null and public.owns_brand(brand_id))
    or (community_id is not null and public.can_manage_community(community_id))
    or exists (
      select 1 from public.partners p
      where p.id = jobs.partner_id and p.owner_user_id = auth.uid()
    )
    or public.is_admin()
  );

commit;
