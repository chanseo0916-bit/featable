-- Migration 53: board post/comment reports and removal of the legacy maker category.
-- Safe to re-run after migration-51-board.sql.

begin;

-- The legacy maker board is now part of the free board. Normalize rows before
-- replacing the category constraint so this remains safe for existing data.
update public.board_posts
set category = 'free'
where category = 'maker';

alter table public.board_posts
  alter column category set default 'free';

alter table public.board_posts
  drop constraint if exists board_posts_category_check;

alter table public.board_posts
  add constraint board_posts_category_check
  check (category in ('free', 'question', 'feedback', 'team'));

create table if not exists public.board_reports (
  id uuid primary key default uuid_generate_v4(),
  post_id uuid not null references public.board_posts(id) on delete cascade,
  comment_id uuid references public.board_comments(id) on delete cascade,
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reviewer_id uuid references public.profiles(id) on delete set null,
  reason text not null
    check (reason in ('spam', 'abuse', 'privacy', 'scam', 'copyright', 'other')),
  details text
    check (details is null or char_length(details) <= 500),
  status text not null default 'pending'
    check (status in ('pending', 'resolved', 'dismissed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Keep re-runs compatible with a table created by an earlier partial deploy.
alter table public.board_reports
  add column if not exists post_id uuid,
  add column if not exists comment_id uuid,
  add column if not exists reporter_id uuid,
  add column if not exists reviewer_id uuid,
  add column if not exists reason text,
  add column if not exists details text,
  add column if not exists status text,
  add column if not exists created_at timestamptz,
  add column if not exists updated_at timestamptz;

alter table public.board_reports
  alter column post_id set not null,
  alter column reporter_id set not null,
  alter column reason set not null,
  alter column status set default 'pending',
  alter column status set not null,
  alter column created_at set default now(),
  alter column created_at set not null,
  alter column updated_at set default now(),
  alter column updated_at set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'board_reports_post_id_fkey'
      and conrelid = 'public.board_reports'::regclass
  ) then
    alter table public.board_reports
      add constraint board_reports_post_id_fkey
      foreign key (post_id) references public.board_posts(id) on delete cascade;
  end if;
  if not exists (
    select 1 from pg_constraint
    where conname = 'board_reports_comment_id_fkey'
      and conrelid = 'public.board_reports'::regclass
  ) then
    alter table public.board_reports
      add constraint board_reports_comment_id_fkey
      foreign key (comment_id) references public.board_comments(id) on delete cascade;
  end if;
  if not exists (
    select 1 from pg_constraint
    where conname = 'board_reports_reporter_id_fkey'
      and conrelid = 'public.board_reports'::regclass
  ) then
    alter table public.board_reports
      add constraint board_reports_reporter_id_fkey
      foreign key (reporter_id) references public.profiles(id) on delete cascade;
  end if;
  if not exists (
    select 1 from pg_constraint
    where conname = 'board_reports_reviewer_id_fkey'
      and conrelid = 'public.board_reports'::regclass
  ) then
    alter table public.board_reports
      add constraint board_reports_reviewer_id_fkey
      foreign key (reviewer_id) references public.profiles(id) on delete set null;
  end if;
end;
$$;

alter table public.board_reports
  drop constraint if exists board_reports_reason_check;
alter table public.board_reports
  add constraint board_reports_reason_check
  check (reason in ('spam', 'abuse', 'privacy', 'scam', 'copyright', 'other'));

alter table public.board_reports
  drop constraint if exists board_reports_details_length_check;
alter table public.board_reports
  add constraint board_reports_details_length_check
  check (details is null or char_length(details) <= 500);

alter table public.board_reports
  drop constraint if exists board_reports_status_check;
alter table public.board_reports
  add constraint board_reports_status_check
  check (status in ('pending', 'resolved', 'dismissed'));

-- A comment report must carry the parent post id and both ids must refer to
-- the same post. A cross-post pair must never be accepted by the API/RLS.
create or replace function public.validate_board_report_target()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  comment_post_id uuid;
  post_status text;
  comment_status text;
begin
  -- Serialize report creation with moderation of the same target. This closes
  -- the race where a pending report could be inserted just after a hide.
  select p.status
    into post_status
  from public.board_posts p
  where p.id = new.post_id
  for update;

  if not found or post_status <> 'published' then
    raise exception 'board_report_post_unavailable';
  end if;

  if new.comment_id is null then
    return new;
  end if;

  select c.post_id, c.status
    into comment_post_id, comment_status
  from public.board_comments c
  where c.id = new.comment_id
  for update;

  if comment_post_id is null or comment_post_id is distinct from new.post_id then
    raise exception 'board_report_comment_post_mismatch';
  end if;

  if comment_status <> 'published' then
    raise exception 'board_report_comment_unavailable';
  end if;

  return new;
end;
$$;

drop trigger if exists board_reports_validate_target on public.board_reports;
create trigger board_reports_validate_target
  before insert or update of post_id, comment_id
  on public.board_reports
  for each row execute function public.validate_board_report_target();

create or replace function public.set_board_report_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists board_reports_set_updated_at on public.board_reports;
create trigger board_reports_set_updated_at
  before update on public.board_reports
  for each row execute function public.set_board_report_updated_at();

-- One server-only transaction owns the entire moderation decision. The
-- service-role caller still supplies the verified admin id, which is checked
-- again here before it can be written to the audit record.
create or replace function public.moderate_board_report(
  p_report_id uuid,
  p_decision text,
  p_reviewer_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target_post_id uuid;
  target_comment_id uuid;
  locked_post_id uuid;
  locked_comment_id uuid;
  current_status text;
begin
  if p_decision is null or p_decision not in ('dismiss', 'hide', 'delete') then
    raise exception 'board_report_invalid_decision';
  end if;

  if not exists (
    select 1
    from public.profiles p
    where p.id = p_reviewer_id
      and p.role = 'admin'
  ) then
    raise exception 'board_report_reviewer_not_admin';
  end if;

  select br.post_id, br.comment_id, br.status
    into target_post_id, target_comment_id, current_status
  from public.board_reports br
  where br.id = p_report_id;

  if not found then
    raise exception 'board_report_not_found';
  end if;

  if current_status <> 'pending' then
    raise exception 'board_report_already_moderated';
  end if;

  if p_decision = 'dismiss' then
    select br.status
      into current_status
    from public.board_reports br
    where br.id = p_report_id
    for update;

    if not found then
      raise exception 'board_report_not_found';
    end if;

    if current_status <> 'pending' then
      raise exception 'board_report_already_moderated';
    end if;

    update public.board_reports
    set status = 'dismissed', reviewer_id = p_reviewer_id
    where id = p_report_id;
  else
    -- Lock in the same post-then-comment order used by report insertion.
    perform 1
    from public.board_posts p
    where p.id = target_post_id
    for update;

    if not found then
      raise exception 'board_report_target_not_found';
    end if;

    if target_comment_id is not null then
      perform 1
      from public.board_comments c
      where c.id = target_comment_id
        and c.post_id = target_post_id
      for update;

      if not found then
        raise exception 'board_report_target_not_found';
      end if;
    end if;

    -- Take the report lock only after the target locks. Report insertion uses
    -- the same target-then-report order, avoiding a moderation/insert deadlock.
    select br.post_id, br.comment_id, br.status
      into locked_post_id, locked_comment_id, current_status
    from public.board_reports br
    where br.id = p_report_id
    for update;

    if not found then
      raise exception 'board_report_not_found';
    end if;

    if locked_post_id is distinct from target_post_id
      or locked_comment_id is distinct from target_comment_id then
      raise exception 'board_report_target_changed';
    end if;

    if current_status <> 'pending' then
      raise exception 'board_report_already_moderated';
    end if;

    if p_decision = 'delete' then
      if target_comment_id is null then
        delete from public.board_posts
        where id = target_post_id;
      else
        delete from public.board_comments
        where id = target_comment_id
          and post_id = target_post_id;
      end if;
    else
      if target_comment_id is null then
        update public.board_posts
        set status = 'hidden'
        where id = target_post_id;
      else
        update public.board_comments
        set status = 'hidden'
        where id = target_comment_id
          and post_id = target_post_id;
      end if;

      update public.board_reports br
      set status = 'resolved', reviewer_id = p_reviewer_id
      where br.status = 'pending'
        and br.post_id = target_post_id
        and br.comment_id is not distinct from target_comment_id;
    end if;
  end if;

  return jsonb_build_object(
    'post_id', target_post_id,
    'comment_id', target_comment_id,
    'decision', p_decision
  );
end;
$$;

create unique index if not exists board_reports_reporter_post_unique
  on public.board_reports(reporter_id, post_id)
  where comment_id is null;

create unique index if not exists board_reports_reporter_comment_unique
  on public.board_reports(reporter_id, comment_id)
  where comment_id is not null;

create index if not exists board_reports_status_created_idx
  on public.board_reports(status, created_at desc);

create index if not exists board_reports_post_created_idx
  on public.board_reports(post_id, created_at desc);

create index if not exists board_reports_comment_created_idx
  on public.board_reports(comment_id, created_at desc)
  where comment_id is not null;

alter table public.board_reports enable row level security;

drop policy if exists "board_reports_select_own_or_admin" on public.board_reports;
create policy "board_reports_select_own_or_admin"
  on public.board_reports
  for select to authenticated
  using (reporter_id = auth.uid() or public.is_admin());

drop policy if exists "board_reports_insert_published_other" on public.board_reports;
create policy "board_reports_insert_published_other"
  on public.board_reports
  for insert to authenticated
  with check (
    reporter_id = auth.uid()
    and (
      (
        comment_id is null
        and exists (
          select 1
          from public.board_posts p
          where p.id = post_id
            and p.status = 'published'
            and p.author_id is distinct from auth.uid()
        )
      )
      or (
        comment_id is not null
        and exists (
          select 1
          from public.board_comments c
          join public.board_posts p on p.id = c.post_id
          where c.id = comment_id
            and c.post_id = board_reports.post_id
            and c.status = 'published'
            and p.status = 'published'
            and c.author_id is distinct from auth.uid()
        )
      )
    )
  );

-- Reports are not directly editable or deletable. Admin moderation goes
-- through the server-only transactional function below.
drop policy if exists "board_reports_admin_update" on public.board_reports;

revoke all on public.board_reports from anon, authenticated;

grant select (
  id,
  post_id,
  comment_id,
  reporter_id,
  reviewer_id,
  reason,
  details,
  status,
  created_at,
  updated_at
)
  on public.board_reports to authenticated;

grant insert (
  post_id,
  comment_id,
  reporter_id,
  reason,
  details
)
  on public.board_reports to authenticated;

revoke all on function public.moderate_board_report(uuid, text, uuid)
  from public, anon, authenticated;
grant execute on function public.moderate_board_report(uuid, text, uuid)
  to service_role;

commit;
