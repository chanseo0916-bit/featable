-- ============================================================
-- Migration 06 — 조회수 증가 함수 익명 호출 차단
-- Supabase는 함수 생성 시 anon/authenticated 롤에도 실행 권한을 주므로
-- `revoke from public`(migration-01, feature-views.sql)만으로는 부족했다.
-- 앱은 /api/view에서 service_role로 호출하므로 영향 없음.
-- Supabase 대시보드 > SQL Editor에 전체 붙여넣고 Run (재실행 안전)
-- ============================================================

revoke execute on function public.increment_feature_view_count(text) from anon, authenticated;

-- 확인: anon 키로 /rest/v1/rpc/increment_feature_view_count 호출 시 401이어야 한다
