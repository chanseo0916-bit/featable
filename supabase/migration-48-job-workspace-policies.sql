-- Migration 48 — restore workspace-aware job policies after migrations 44 and 45 run in either order.
begin;

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

commit;
