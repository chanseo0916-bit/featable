-- ============================================================
-- Migration 02 — 브랜드 팔로우
-- Supabase 대시보드 > SQL Editor에 전체 붙여넣고 Run
-- 재실행해도 안전 (idempotent)
-- ============================================================

create table if not exists brand_follows (
  user_id uuid not null references profiles(id) on delete cascade,
  brand_id uuid not null references brands(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, brand_id)
);

create index if not exists idx_brand_follows_brand on brand_follows(brand_id);

alter table brand_follows enable row level security;

-- 팔로워 수는 누구나 셀 수 있고, 팔로우/언팔로우는 본인 것만
drop policy if exists "follows_select_all" on brand_follows;
create policy "follows_select_all" on brand_follows for select using (true);

drop policy if exists "follows_insert_own" on brand_follows;
create policy "follows_insert_own" on brand_follows for insert with check (user_id = auth.uid());

drop policy if exists "follows_delete_own" on brand_follows;
create policy "follows_delete_own" on brand_follows for delete using (user_id = auth.uid());

-- 확인
select count(*) as follow_rows from brand_follows;
