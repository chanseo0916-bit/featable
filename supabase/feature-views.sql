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

-- 현재 MVP 목업 피쳐를 실제 집계 대상으로 등록한다. 기존 콘텐츠는 덮어쓰지 않는다.
insert into public.features (slug, title, kind, excerpt, body, status, published_at, view_count)
values
  ('grain-launch-story', '매일 먹는 것부터 바꾸고 싶었습니다', 'brand-story', '그레인테이블이 건강한 식사의 기준을 다시 묻는 방법', '[]', 'published', '2026-08-08T00:00:00+09:00', 6507),
  ('flow-small-team', '세 명의 개발팀이 복잡한 협업툴을 버린 이유', 'case-study', '기능을 더하기보다 일의 흐름을 지키기로 한 플로우노트', '[]', 'published', '2026-08-18T00:00:00+09:00', 18742),
  ('mood-taste-map', '저장만 하던 취향이 하나의 지도가 되기까지', 'product-feature', '무드보드가 흩어진 영감을 연결하는 새로운 방식', '[]', 'published', '2026-08-17T00:00:00+09:00', 8931),
  ('student-founder-week', '요즘 대학생 창업가는 무엇을 만들고 있을까', 'update', '캠퍼스에서 시작해 시장으로 향하는 네 팀의 이번 주', '[]', 'published', '2026-08-19T00:00:00+09:00', 12560)
on conflict (slug) do update
set view_count = greatest(public.features.view_count, excluded.view_count);

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
