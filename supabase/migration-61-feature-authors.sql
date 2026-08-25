begin;

-- founder_id는 인터뷰 대상 인물, created_by는 실제 등록·편집 계정이다.
-- 일반 사용자 등록에서는 두 값이 같은 사람을 가리키지만 운영진 대리 작성 건은 분리한다.
alter table public.features
  add column if not exists created_by uuid references public.profiles(id) on delete set null;

create index if not exists features_created_by_idx
  on public.features(created_by, created_at desc);

-- 기존 본인 인터뷰는 연결된 Founder 계정을 작성자로 자동 보정한다.
update public.features feature
set created_by = founder.user_id
from public.founders founder
where feature.created_by is null
  and feature.founder_id = founder.id
  and founder.user_id is not null;

-- 기존 운영진 작성 인터뷰: 공개 대상 Founder는 유지하고 천지원 계정에 편집 권한만 연결한다.
update public.features feature
set created_by = profile.id
from public.profiles profile
where feature.slug = 'feature-2dc6907f'
  and profile.id = '240b6288-df5c-4cfe-b388-5ae3126a88a1';

drop policy if exists "features_select_published" on public.features;
create policy "features_select_published" on public.features for select
  using (
    status = 'published'
    or created_by = auth.uid()
    or (brand_id is not null and owns_brand(brand_id))
    or (founder_id is not null and owns_founder(founder_id))
    or is_admin()
  );

drop policy if exists "features_insert_authenticated" on public.features;
create policy "features_insert_authenticated" on public.features for insert
  with check (
    is_admin()
    or (
      auth.uid() is not null
      and created_by = auth.uid()
      and founder_id is not null
      and owns_founder(founder_id)
      and (brand_id is null or owns_brand(brand_id))
    )
  );

drop policy if exists "features_update_own" on public.features;
create policy "features_update_own" on public.features for update
  using (
    created_by = auth.uid()
    or (brand_id is not null and owns_brand(brand_id))
    or (founder_id is not null and owns_founder(founder_id))
    or is_admin()
  );

drop policy if exists "features_delete_own" on public.features;
create policy "features_delete_own" on public.features for delete
  using (
    created_by = auth.uid()
    or (brand_id is not null and owns_brand(brand_id))
    or (founder_id is not null and owns_founder(founder_id))
    or is_admin()
  );

commit;
