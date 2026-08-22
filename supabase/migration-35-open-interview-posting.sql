-- Any authenticated member can publish an interview. A brand may still be
-- attached, but only when the member owns that brand.
drop policy if exists "features_insert_own" on public.features;
create policy "features_insert_authenticated" on public.features
  for insert
  with check (
    auth.uid() is not null
    and (brand_id is null or owns_brand(brand_id) or is_admin())
  );
