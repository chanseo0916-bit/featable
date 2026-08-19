-- ============================================================
-- Migration 08 — Founder 응원
-- Supabase Dashboard > SQL Editor에서 한 번 실행하세요.
-- ============================================================

create table if not exists public.founder_supports (
  user_id uuid not null references public.profiles(id) on delete cascade,
  founder_id uuid not null references public.founders(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, founder_id)
);

create index if not exists idx_founder_supports_founder
  on public.founder_supports(founder_id);

alter table public.founder_supports enable row level security;

drop policy if exists "founder_supports_select_all" on public.founder_supports;
create policy "founder_supports_select_all"
  on public.founder_supports for select
  using (true);

drop policy if exists "founder_supports_insert_own" on public.founder_supports;
create policy "founder_supports_insert_own"
  on public.founder_supports for insert
  with check (user_id = auth.uid());

drop policy if exists "founder_supports_delete_own" on public.founder_supports;
create policy "founder_supports_delete_own"
  on public.founder_supports for delete
  using (user_id = auth.uid());

select count(*) as founder_support_rows from public.founder_supports;
