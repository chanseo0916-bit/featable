-- Self-serve events: standard events publish immediately; Featable collaborations are featured after review.
alter table public.events
  add column if not exists submitted_by uuid references public.profiles(id) on delete set null,
  add column if not exists is_featured boolean not null default false;

create index if not exists events_featured_starts_idx
  on public.events (is_featured desc, starts_at asc);

create index if not exists events_submitted_by_idx
  on public.events (submitted_by, created_at desc);

-- Any signed-in member can submit a standard event. Other partner submission
-- types remain limited to partner accounts.
drop policy if exists "partner_submissions_insert" on public.partner_submissions;
create policy "partner_submissions_insert" on public.partner_submissions for insert
  with check (
    user_id = auth.uid()
    and (
      submission_type = 'event'
      or exists (
        select 1 from public.profiles
        where id = auth.uid() and member_type = 'partner'
      )
    )
  );
