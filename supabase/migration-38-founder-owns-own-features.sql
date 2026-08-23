begin;

-- migration-35 로 브랜드 없이도 인터뷰를 올릴 수 있게 됐지만,
-- update/delete 는 여전히 "브랜드 소유"만 허용해서 정작 본인이 자기 글을 고칠 수 없었다.
-- 파운더 본인이면 브랜드가 없어도 자기 글을 수정·삭제할 수 있게 한다.
drop policy if exists "features_update_own" on public.features;
create policy "features_update_own" on public.features for update
  using (
    (brand_id is not null and owns_brand(brand_id))
    or (
      founder_id is not null
      and exists (
        select 1 from public.founders f
        where f.id = public.features.founder_id and f.user_id = auth.uid()
      )
    )
    or is_admin()
  );

drop policy if exists "features_delete_own" on public.features;
create policy "features_delete_own" on public.features for delete
  using (
    (brand_id is not null and owns_brand(brand_id))
    or (
      founder_id is not null
      and exists (
        select 1 from public.founders f
        where f.id = public.features.founder_id and f.user_id = auth.uid()
      )
    )
    or is_admin()
  );

commit;
