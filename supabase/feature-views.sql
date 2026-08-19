-- 기존 Supabase 데이터베이스에 feature 조회수 추적을 추가하는 멱등성 migration

alter table public.features
  add column if not exists view_count integer;

-- 기존 행의 NULL을 먼저 정리한 뒤 기본값과 NOT NULL 제약을 적용
update public.features
set view_count = 0
where view_count is null;

alter table public.features
  alter column view_count set default 0,
  alter column view_count set not null;

-- 공개된 feature만 한 번의 UPDATE로 증가시켜 동시 요청에서도 값을 잃지 않도록 함
create or replace function public.increment_feature_view_count(p_slug text)
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

-- 클라이언트의 직접 실행은 막고 서버 service_role에만 실행 권한 부여
revoke execute on function public.increment_feature_view_count(text) from public;
grant execute on function public.increment_feature_view_count(text) to service_role;
