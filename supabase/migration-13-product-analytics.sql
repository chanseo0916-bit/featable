-- ============================================================
-- Migration 13 — 프로덕트 애널리틱스 (조회/클릭 이벤트 로그)
-- 마이페이지의 Vercel Analytics풍 대시보드(오늘/7일/30일/60일/90일 + 그래프)를
-- 위해 조회수·클릭을 날짜별로 집계할 수 있게 이벤트 로그 테이블을 추가한다.
-- "좋아요"는 기존 saved_items(item_type='product')를 그대로 재사용한다.
-- Supabase 대시보드 > SQL Editor에 전체 붙여넣고 Run (재실행 안전)
-- ============================================================

create table if not exists public.product_events (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid not null references public.products(id) on delete cascade,
  event_type text not null check (event_type in ('view', 'click')),
  created_at timestamptz not null default now()
);

create index if not exists product_events_product_created_idx
  on public.product_events(product_id, created_at desc);

alter table public.product_events enable row level security;

-- 본인 소유 프로덕트의 이벤트만 조회 가능 (owns_product는 migration-03에서 정의됨)
drop policy if exists "product_events_select_own" on public.product_events;
create policy "product_events_select_own"
  on public.product_events for select
  using (owns_product(product_id) or is_admin());

-- 클라이언트에서 직접 insert 불가 — service_role(서버 API)에서만 기록
drop policy if exists "product_events_no_client_write" on public.product_events;

-- 조회/클릭 이벤트를 한 번에 기록 + 조회일 때만 products.view_count도 원자적으로 증가
create or replace function public.log_product_event(p_slug text, p_event text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if p_event not in ('view', 'click') then
    return;
  end if;

  select id into v_id from public.products where slug = p_slug and status = 'published';
  if v_id is null then
    return;
  end if;

  insert into public.product_events (product_id, event_type) values (v_id, p_event);

  if p_event = 'view' then
    update public.products set view_count = view_count + 1 where id = v_id;
  end if;
end;
$$;

revoke execute on function public.log_product_event(text, text) from public, anon, authenticated;
grant execute on function public.log_product_event(text, text) to service_role;

-- 확인
select count(*) as product_event_rows from public.product_events;
