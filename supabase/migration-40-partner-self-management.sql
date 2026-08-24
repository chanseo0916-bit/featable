-- Migration 40 — approved partners can manage their own public profile.
begin;

drop policy if exists "partners_write" on public.partners;
drop policy if exists "partners_insert" on public.partners;
drop policy if exists "partners_update" on public.partners;
drop policy if exists "partners_delete" on public.partners;

create policy "partners_insert" on public.partners for insert
  with check (owner_user_id = auth.uid() or public.is_admin());
create policy "partners_update" on public.partners for update
  using (owner_user_id = auth.uid() or public.is_admin())
  with check (owner_user_id = auth.uid() or public.is_admin());
create policy "partners_delete" on public.partners for delete
  using (public.is_admin());

commit;
