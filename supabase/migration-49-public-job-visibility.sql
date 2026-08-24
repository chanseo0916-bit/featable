-- Migration 49 — keep public job reads independent from authenticated workspace functions.
begin;

drop policy if exists "jobs_select" on public.jobs;
drop policy if exists "jobs_public_select" on public.jobs;
drop policy if exists "jobs_manager_select" on public.jobs;

create policy "jobs_public_select" on public.jobs for select
  to anon, authenticated
  using (status = 'published');

create policy "jobs_manager_select" on public.jobs for select
  to authenticated
  using (
    (brand_id is not null and public.owns_brand(brand_id))
    or (community_id is not null and public.can_manage_community(community_id))
    or (partner_id is not null and public.can_manage_partner(partner_id))
    or public.is_admin()
  );

alter policy "jobs_insert" on public.jobs to authenticated;
alter policy "jobs_update" on public.jobs to authenticated;
alter policy "jobs_delete" on public.jobs to authenticated;

commit;
