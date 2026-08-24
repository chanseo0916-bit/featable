-- 직접 등록 인터뷰가 사용자 한글 이름을 slug에 포함하던 문제를 정리한다.
-- Cloudflare Workers 정적 에셋 라우팅에서는 비ASCII 동적 경로가 404가 될 수 있다.

update public.features
set slug = 'feature-' || substr(md5(random()::text || id::text), 1, 8),
    updated_at = now()
where slug ~ '[^\x00-\x7F]';

-- 이후 어떤 등록 경로에서도 비ASCII slug가 다시 저장되지 않게 막는다.
alter table public.features
  drop constraint if exists features_slug_ascii;

alter table public.features
  add constraint features_slug_ascii
  check (slug !~ '[^\x00-\x7F]');
