-- Partner self-serve registration queue.
-- Partners write drafts here; admins review before copying approved content
-- into the public events, support_programs, or communities tables.

create table if not exists public.partner_submissions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  submission_type text not null check (submission_type in ('event', 'support', 'community')),
  status text not null default 'draft' check (status in ('draft', 'submitted', 'in_review', 'approved', 'rejected')),
  title text not null default '',
  payload jsonb not null default '{}'::jsonb,
  review_note text,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id) on delete set null,
  published_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists partner_submissions_user_updated_idx
  on public.partner_submissions(user_id, updated_at desc);
create index if not exists partner_submissions_status_created_idx
  on public.partner_submissions(status, created_at asc);

alter table public.partner_submissions enable row level security;

drop policy if exists "partner_submissions_select" on public.partner_submissions;
create policy "partner_submissions_select" on public.partner_submissions for select
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists "partner_submissions_insert" on public.partner_submissions;
create policy "partner_submissions_insert" on public.partner_submissions for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and member_type = 'partner'
    )
  );

drop policy if exists "partner_submissions_update" on public.partner_submissions;
create policy "partner_submissions_update" on public.partner_submissions for update
  using ((user_id = auth.uid() and status in ('draft', 'rejected')) or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

drop policy if exists "partner_submissions_delete" on public.partner_submissions;
create policy "partner_submissions_delete" on public.partner_submissions for delete
  using ((user_id = auth.uid() and status in ('draft', 'rejected')) or public.is_admin());
