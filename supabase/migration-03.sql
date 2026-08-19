-- ============================================================
-- Migration 03 — 멘토 노트를 비공개 피드백으로 전환
-- 작성: mentor 권한 유저 / 열람: 해당 게시물의 파운더 + 작성 멘토 + admin
-- Supabase 대시보드 > SQL Editor에 전체 붙여넣고 Run (재실행 안전)
-- ============================================================

-- 제품 소유 여부 헬퍼 (제품 → 브랜드 → 파운더 → 로그인 유저)
create or replace function owns_product(p_id uuid)
returns boolean language sql security definer set search_path = public as $$
  select exists (
    select 1
    from products p
    join brands b on b.id = p.brand_id
    join founders f on f.id = b.founder_id
    where p.id = p_id and f.user_id = auth.uid()
  );
$$;

-- 기존 공개 열람 정책 제거 후 비공개 정책으로 교체
drop policy if exists "mentor_notes_select" on mentor_notes;
create policy "mentor_notes_select_private" on mentor_notes for select using (
  mentor_user_id = auth.uid()
  or (product_id is not null and owns_product(product_id))
  or (brand_id is not null and owns_brand(brand_id))
  or is_admin()
);

-- 확인: 정책 목록
select policyname from pg_policies where tablename = 'mentor_notes';
