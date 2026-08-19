-- ============================================================
-- Migration 04 — 댓글 (프로덕트 · 스토리 공용)
-- Supabase 대시보드 > SQL Editor에 전체 붙여넣고 Run (재실행 안전)
-- ============================================================

create table if not exists comments (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  product_id uuid references products(id) on delete cascade,
  feature_id uuid references features(id) on delete cascade,
  display_name text not null,
  avatar_url text,
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now(),
  check (product_id is not null or feature_id is not null)
);

create index if not exists idx_comments_product on comments(product_id, created_at desc);
create index if not exists idx_comments_feature on comments(feature_id, created_at desc);

alter table comments enable row level security;

-- 누구나 읽기, 로그인 유저가 본인 명의로 작성, 본인·관리자만 삭제
drop policy if exists "comments_select_all" on comments;
create policy "comments_select_all" on comments for select using (true);

drop policy if exists "comments_insert_own" on comments;
create policy "comments_insert_own" on comments for insert with check (user_id = auth.uid());

drop policy if exists "comments_delete_own" on comments;
create policy "comments_delete_own" on comments for delete using (user_id = auth.uid() or is_admin());

-- 확인
select count(*) as comment_rows from comments;
