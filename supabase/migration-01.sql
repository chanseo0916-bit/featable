-- ============================================================
-- Migration 01 — 파운더 프로필 확장 + 피처 조회수
-- Supabase 대시보드 > SQL Editor에 전체 붙여넣고 Run (한 번만)
-- 이미 실행된 항목은 if not exists로 건너뛰므로 재실행해도 안전
-- ============================================================

-- 1) 파운더 SNS 링크 (instagram, x, linkedin, website)
alter table founders
  add column if not exists sns jsonb not null default '{}';

-- 2) 피처(스토리) 조회수 컬럼
alter table features
  add column if not exists view_count integer not null default 0;

-- 3) 피처 조회수 원자적 증가 함수 (서버 전용)
create or replace function increment_feature_view_count(p_slug text)
returns integer
language sql
security definer
set search_path = public
as $$
  update public.features
  set view_count = view_count + 1
  where slug = p_slug
    and status = 'published'
  returning view_count;
$$;

revoke execute on function public.increment_feature_view_count(text) from public;
grant execute on function public.increment_feature_view_count(text) to service_role;

-- 확인
select column_name from information_schema.columns
where table_name = 'founders' and column_name = 'sns';
