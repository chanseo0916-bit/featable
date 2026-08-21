-- ============================================================
-- Migration 19 — 팀원도 같은 브랜드 팀 카드를 볼 수 있게
-- 기존: 본인 행 + 브랜드 소유자만 조회 가능 → 팀원 대시보드에서 동료 카드가 안 보임
-- 변경: 같은 브랜드의 멤버라면 서로의 팀 카드 조회 허용
-- Supabase 대시보드 > SQL Editor에 붙여넣고 Run (재실행 안전)
-- ============================================================

create or replace function public.is_brand_member(p_brand_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from brand_members
    where brand_id = p_brand_id and user_id = auth.uid()
  );
$$;

drop policy if exists "brand_members_select_related" on public.brand_members;
create policy "brand_members_select_related" on public.brand_members for select
  using (
    user_id = auth.uid()
    or public.is_brand_owner(brand_id)
    or public.is_brand_member(brand_id)
    or public.is_admin()
  );

-- 확인
select policyname from pg_policies where tablename = 'brand_members';
