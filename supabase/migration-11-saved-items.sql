-- Migration 11 — 사용자 저장 컬렉션
-- 프로덕트·피처·행사·지원사업을 한 테이블에서 저장한다.

create table if not exists public.saved_items (
  user_id uuid not null references public.profiles(id) on delete cascade,
  item_type text not null check (item_type in ('product', 'feature', 'event', 'support')),
  item_slug text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, item_type, item_slug)
);

create index if not exists saved_items_user_created_idx
  on public.saved_items(user_id, created_at desc);

alter table public.saved_items enable row level security;

drop policy if exists "saved_items_select_own" on public.saved_items;
create policy "saved_items_select_own"
  on public.saved_items for select
  using (user_id = auth.uid());

drop policy if exists "saved_items_insert_own" on public.saved_items;
create policy "saved_items_insert_own"
  on public.saved_items for insert
  with check (user_id = auth.uid());

drop policy if exists "saved_items_delete_own" on public.saved_items;
create policy "saved_items_delete_own"
  on public.saved_items for delete
  using (user_id = auth.uid());

