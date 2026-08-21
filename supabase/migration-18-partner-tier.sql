-- ============================================================
-- Migration 18 — 파트너 등급 (Featured / Basic)
-- Featured Partner = VIP: 파트너 페이지 상단 + FEATURED 뱃지 + 푸터 우선 노출
-- Basic Partner    = 일반 등록
-- Supabase 대시보드 > SQL Editor에 붙여넣고 Run (재실행 안전)
-- ============================================================

alter table partners add column if not exists is_featured boolean not null default false;

create index if not exists idx_partners_featured on partners(is_featured desc, sort_order asc);

-- 확인
select name, is_featured, status from partners order by is_featured desc;
