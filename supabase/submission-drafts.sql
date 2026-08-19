-- Featable 등록 마법사: 단계별 임시저장
-- Supabase Dashboard > SQL Editor에서 한 번 실행하세요.

create table if not exists public.submission_drafts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  draft_key text not null default uuid_generate_v4()::text,
  payload jsonb not null default '{}'::jsonb,
  current_step integer not null default 0 check (current_step between 0 and 7),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, draft_key)
);

alter table public.submission_drafts enable row level security;

drop policy if exists "submission_drafts_select_own" on public.submission_drafts;
create policy "submission_drafts_select_own"
  on public.submission_drafts for select
  using (user_id = auth.uid());

drop policy if exists "submission_drafts_insert_own" on public.submission_drafts;
create policy "submission_drafts_insert_own"
  on public.submission_drafts for insert
  with check (user_id = auth.uid());

drop policy if exists "submission_drafts_update_own" on public.submission_drafts;
create policy "submission_drafts_update_own"
  on public.submission_drafts for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "submission_drafts_delete_own" on public.submission_drafts;
create policy "submission_drafts_delete_own"
  on public.submission_drafts for delete
  using (user_id = auth.uid());

create index if not exists submission_drafts_user_id_idx on public.submission_drafts(user_id);
