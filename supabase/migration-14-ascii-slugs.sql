-- ============================================================
-- Migration 14 — 비ASCII(한글) 슬러그를 ASCII로 교체
-- Cloudflare Workers 정적 에셋 라우팅(run_worker_first=false)이 비ASCII
-- 동적 라우트 세그먼트를 제대로 처리하지 못해 /founders/이찬서-haj4 같은
-- 페이지가 404/500이 났다. 앱 코드(slugify)는 이제 ASCII만 생성하도록
-- 고쳤고, 이 마이그레이션은 이미 생성된 기존 행을 정리한다.
-- Supabase 대시보드 > SQL Editor에 전체 붙여넣고 Run (재실행 안전)
-- ============================================================

update public.founders
set slug = 'founder-' || substr(md5(random()::text || id::text), 1, 6)
where slug ~ '[^\x00-\x7F]';

update public.brands
set slug = 'brand-' || substr(md5(random()::text || id::text), 1, 6)
where slug ~ '[^\x00-\x7F]';

update public.products
set slug = 'product-' || substr(md5(random()::text || id::text), 1, 6)
where slug ~ '[^\x00-\x7F]';

update public.events
set slug = 'event-' || substr(md5(random()::text || id::text), 1, 6)
where slug ~ '[^\x00-\x7F]';

update public.support_programs
set slug = 'support-' || substr(md5(random()::text || id::text), 1, 6)
where slug ~ '[^\x00-\x7F]';

update public.features
set slug = 'feature-' || substr(md5(random()::text || id::text), 1, 6)
where slug ~ '[^\x00-\x7F]';

update public.communities
set slug = 'community-' || substr(md5(random()::text || id::text), 1, 6)
where slug ~ '[^\x00-\x7F]';

-- 확인: 비ASCII 슬러그가 남아있지 않아야 한다
select 'founders' as table_name, slug from public.founders where slug ~ '[^\x00-\x7F]'
union all select 'brands', slug from public.brands where slug ~ '[^\x00-\x7F]'
union all select 'products', slug from public.products where slug ~ '[^\x00-\x7F]'
union all select 'events', slug from public.events where slug ~ '[^\x00-\x7F]'
union all select 'support_programs', slug from public.support_programs where slug ~ '[^\x00-\x7F]'
union all select 'features', slug from public.features where slug ~ '[^\x00-\x7F]'
union all select 'communities', slug from public.communities where slug ~ '[^\x00-\x7F]';
