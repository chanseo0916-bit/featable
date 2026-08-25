-- Migration 55: comment identity choices and board activity notifications.
-- Apply after migration-54-board-author-actions.sql.

begin;

-- Preserve existing comments as profile-visible while making new comments
-- anonymous by default.
alter table public.board_comments
  add column if not exists author_visibility text;

update public.board_comments
set author_visibility = 'profile'
where author_visibility is null
   or author_visibility not in ('anonymous', 'profile');

alter table public.board_comments
  alter column author_visibility set default 'anonymous',
  alter column author_visibility set not null;

alter table public.board_comments
  drop constraint if exists board_comments_author_visibility_check;
alter table public.board_comments
  add constraint board_comments_author_visibility_check
  check (author_visibility in ('anonymous', 'profile'));

-- The same trusted trigger now protects identity snapshots for posts and
-- comments. Client-supplied display names and avatars are always overwritten.
create or replace function public.sync_board_author_identity()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  profile_name text;
  profile_avatar_url text;
begin
  if new.author_id is null then
    new.author_id := auth.uid();
  end if;

  if new.author_id is null then
    raise exception 'board_author_required';
  end if;

  if auth.uid() is not null
    and new.author_id is distinct from auth.uid()
    and not public.is_admin() then
    raise exception 'board_author_mismatch';
  end if;

  if tg_table_name in ('board_posts', 'board_comments')
    and coalesce(to_jsonb(new) ->> 'author_visibility', 'anonymous') = 'anonymous' then
    new.display_name := '익명';
    new.avatar_url := null;
    return new;
  end if;

  select
    coalesce(
      nullif(trim(p.full_name), ''),
      nullif(trim(f.name), ''),
      'Featable 멤버'
    ),
    f.avatar_url
  into profile_name, profile_avatar_url
  from public.profiles p
  left join public.founders f on f.user_id = p.id
  where p.id = new.author_id;

  if not found then
    raise exception 'board_author_profile_not_found';
  end if;

  new.display_name := left(profile_name, 120);
  new.avatar_url := profile_avatar_url;
  return new;
end;
$$;

drop trigger if exists board_comments_sync_author_identity on public.board_comments;
create trigger board_comments_sync_author_identity
  before insert or update of author_id, author_visibility, display_name, avatar_url
  on public.board_comments
  for each row execute function public.sync_board_author_identity();

-- Reset the public API surface so author_id remains private even for profile
-- comments. Only the selected identity snapshot is publicly readable.
revoke all on public.board_comments from anon, authenticated;
grant select (
  id,
  post_id,
  author_visibility,
  display_name,
  avatar_url,
  body,
  status,
  created_at,
  updated_at
)
  on public.board_comments to anon, authenticated;
grant insert (post_id, author_id, author_visibility, body)
  on public.board_comments to authenticated;

-- Reassert the post column allowlist as part of the final bundle. In
-- particular, anonymous post author_id must never be queryable via REST.
revoke select on public.board_posts from anon, authenticated;
grant select (
  id,
  display_name,
  avatar_url,
  author_visibility,
  category,
  title,
  body,
  status,
  view_count,
  comment_count,
  like_count,
  created_at,
  updated_at
)
  on public.board_posts to anon, authenticated;

-- Each comment and each user/post like pair produces at most one notification.
create unique index if not exists notifications_board_comment_unique
  on public.notifications ((data ->> 'comment_id'))
  where data ->> 'kind' = 'board_comment';

create unique index if not exists notifications_board_like_unique
  on public.notifications (user_id, actor_id, (data ->> 'post_id'))
  where data ->> 'kind' = 'board_like';

create or replace function public.notify_board_comment_activity()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  recipient_id uuid;
  post_title text;
begin
  if new.status <> 'published' then
    return new;
  end if;

  select p.author_id, p.title
    into recipient_id, post_title
  from public.board_posts p
  where p.id = new.post_id
    and p.status = 'published';

  if not found or recipient_id is not distinct from new.author_id then
    return new;
  end if;

  begin
    insert into public.notifications (
      user_id,
      actor_id,
      type,
      title,
      message,
      href,
      data
    ) values (
      recipient_id,
      case
        when new.author_visibility = 'profile' then new.author_id
        else null
      end,
      'system',
      '게시글에 새 댓글이 달렸어요',
      left(post_title, 120),
      '/board/' || new.post_id::text || '#comment-' || new.id::text,
      jsonb_build_object(
        'kind', 'board_comment',
        'post_id', new.post_id,
        'comment_id', new.id
      )
    )
    on conflict do nothing;
  exception when others then
    raise warning 'board comment notification skipped: %', sqlerrm;
  end;

  return new;
end;
$$;

create or replace function public.notify_board_like_activity()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  recipient_id uuid;
  post_title text;
begin
  select p.author_id, p.title
    into recipient_id, post_title
  from public.board_posts p
  where p.id = new.post_id
    and p.status = 'published';

  if not found or recipient_id is not distinct from new.user_id then
    return new;
  end if;

  begin
    insert into public.notifications (
      user_id,
      actor_id,
      type,
      title,
      message,
      href,
      data
    ) values (
      recipient_id,
      new.user_id,
      'system',
      '게시글에 좋아요가 추가됐어요',
      left(post_title, 120),
      '/board/' || new.post_id::text || '#board-post-reactions',
      jsonb_build_object(
        'kind', 'board_like',
        'post_id', new.post_id
      )
    )
    on conflict do nothing;
  exception when others then
    raise warning 'board like notification skipped: %', sqlerrm;
  end;

  return new;
end;
$$;

drop trigger if exists board_comments_notify_author on public.board_comments;
create trigger board_comments_notify_author
  after insert on public.board_comments
  for each row execute function public.notify_board_comment_activity();

drop trigger if exists board_post_likes_notify_author on public.board_post_likes;
create trigger board_post_likes_notify_author
  after insert on public.board_post_likes
  for each row execute function public.notify_board_like_activity();

revoke all on function public.notify_board_comment_activity()
  from public, anon, authenticated;
revoke all on function public.notify_board_like_activity()
  from public, anon, authenticated;

commit;
