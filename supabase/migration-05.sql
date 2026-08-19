-- ============================================================
-- Migration 05 — 파트너사 페이지 확장
-- 기존 partners(푸터 로고)에 소개·분야·상태를 더해 /partners 공개 페이지와
-- 관리자 등록을 지원한다.
-- Supabase 대시보드 > SQL Editor에 전체 붙여넣고 Run (재실행 안전)
-- ============================================================

alter table partners add column if not exists intro text not null default '';
alter table partners add column if not exists description text;
alter table partners add column if not exists field text;
alter table partners add column if not exists status text not null default 'published';

do $$ begin
  alter table partners
    add constraint partners_status_check check (status in ('draft', 'published', 'hidden'));
exception when duplicate_object then null; end $$;

-- 공개 목록은 published만, 관리자는 전체 열람
drop policy if exists "partners_select" on partners;
create policy "partners_select" on partners for select
  using (status = 'published' or is_admin());

-- 쓰기는 기존 정책 유지 (admin 전용) — 없으면 생성
drop policy if exists "partners_write" on partners;
create policy "partners_write" on partners for all
  using (is_admin()) with check (is_admin());

-- 확인
select column_name from information_schema.columns where table_name = 'partners';
