-- Migration 52: deduplicated board post view counts.
-- A random browser-session key is stored only in an HttpOnly cookie and this
-- private table. No IP address or authenticated user id is collected.

begin;

alter table public.board_posts
  add column if not exists view_count integer not null default 0;

update public.board_posts
set view_count = 0
where view_count is null;

alter table public.board_posts
  alter column view_count set default 0,
  alter column view_count set not null;

alter table public.board_posts
  drop constraint if exists board_posts_view_count_check;
alter table public.board_posts
  add constraint board_posts_view_count_check check (view_count >= 0);

create table if not exists public.board_post_views (
  post_id uuid not null references public.board_posts(id) on delete cascade,
  viewer_key uuid not null,
  created_at timestamptz not null default now(),
  primary key (post_id, viewer_key)
);

alter table public.board_post_views enable row level security;
revoke all on public.board_post_views from public, anon, authenticated;

-- Count a published post at most once for a browser-session key. The post row
-- lock makes the view record and counter update atomic with status changes.
create or replace function public.record_board_post_view(
  p_post_id uuid,
  p_viewer_key uuid
)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_count integer;
begin
  select view_count
  into current_count
  from public.board_posts
  where id = p_post_id
    and status = 'published'
  for update;

  if not found then
    return null;
  end if;

  insert into public.board_post_views (post_id, viewer_key)
  values (p_post_id, p_viewer_key)
  on conflict do nothing;

  if found then
    update public.board_posts
    set view_count = view_count + 1
    where id = p_post_id
    returning view_count into current_count;
  end if;

  return current_count;
end;
$$;

revoke all on function public.record_board_post_view(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.record_board_post_view(uuid, uuid)
  to service_role;

-- Counter-only updates must not make a post look content-edited. This also
-- keeps like/comment trigger updates from changing updated_at.
drop trigger if exists board_posts_set_updated_at on public.board_posts;
create trigger board_posts_set_updated_at
  before update of author_id, author_visibility, category, title, body, status
  on public.board_posts
  for each row execute function public.set_board_updated_at();

create index if not exists board_posts_public_views_idx
  on public.board_posts(view_count desc, created_at desc)
  where status = 'published';

grant select (view_count) on public.board_posts to anon, authenticated;

commit;
