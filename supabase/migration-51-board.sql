-- Migration 51: public board posts, comments, and post likes.
-- Safe to re-run: tables, policies, indexes, and trigger definitions are idempotent.

begin;

create table if not exists public.board_posts (
  id uuid primary key default uuid_generate_v4(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  display_name text not null default 'Featable 멤버',
  avatar_url text,
  author_visibility text not null default 'anonymous'
    check (author_visibility in ('anonymous', 'profile')),
  category text not null default 'free'
    check (category in ('free', 'question', 'feedback', 'team')),
  title text not null
    check (char_length(btrim(title)) between 2 and 120),
  body text not null
    check (char_length(btrim(body)) between 1 and 10000),
  status text not null default 'published'
    check (status in ('draft', 'published', 'hidden')),
  comment_count integer not null default 0
    check (comment_count >= 0),
  like_count integer not null default 0
    check (like_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Keep an already-created board_posts table aligned when this migration is rerun.
alter table public.board_posts alter column category set default 'free';
alter table public.board_posts
  add column if not exists author_visibility text;
update public.board_posts
set author_visibility = 'profile'
where author_visibility is null;
alter table public.board_posts
  alter column author_visibility set default 'anonymous';
alter table public.board_posts
  alter column author_visibility set not null;
alter table public.board_posts
  add column if not exists comment_count integer not null default 0;
alter table public.board_posts
  add column if not exists like_count integer not null default 0;
alter table public.board_posts drop constraint if exists board_posts_category_check;
update public.board_posts
set category = 'free'
where category not in ('free', 'question', 'feedback', 'team');
alter table public.board_posts add constraint board_posts_category_check
  check (category in ('free', 'question', 'feedback', 'team'));
alter table public.board_posts drop constraint if exists board_posts_author_visibility_check;
alter table public.board_posts add constraint board_posts_author_visibility_check
  check (author_visibility in ('anonymous', 'profile'));
alter table public.board_posts drop constraint if exists board_posts_comment_count_check;
alter table public.board_posts add constraint board_posts_comment_count_check
  check (comment_count >= 0);
alter table public.board_posts drop constraint if exists board_posts_like_count_check;
alter table public.board_posts add constraint board_posts_like_count_check
  check (like_count >= 0);

create table if not exists public.board_comments (
  id uuid primary key default uuid_generate_v4(),
  post_id uuid not null references public.board_posts(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  author_visibility text not null default 'anonymous'
    check (author_visibility in ('anonymous', 'profile')),
  display_name text not null default 'Featable 멤버',
  avatar_url text,
  body text not null
    check (char_length(btrim(body)) between 1 and 1000),
  status text not null default 'published'
    check (status in ('draft', 'published', 'hidden')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.board_post_likes (
  post_id uuid not null references public.board_posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

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

-- Correct totals before installing the incremental counter trigger.
update public.board_posts p
set comment_count = (
  select count(*)::integer
  from public.board_comments c
  where c.post_id = p.id
    and c.status = 'published'
)
where p.comment_count is distinct from (
  select count(*)::integer
  from public.board_comments c
  where c.post_id = p.id
    and c.status = 'published'
);

update public.board_posts p
set like_count = (
  select count(*)::integer
  from public.board_post_likes l
  where l.post_id = p.id
)
where p.like_count is distinct from (
  select count(*)::integer
  from public.board_post_likes l
  where l.post_id = p.id
);

create index if not exists board_posts_public_feed_idx
  on public.board_posts(status, category, created_at desc);

create index if not exists board_posts_author_updated_idx
  on public.board_posts(author_id, updated_at desc);

create index if not exists board_posts_best_feed_idx
  on public.board_posts(like_count desc, created_at desc)
  where status = 'published' and like_count >= 10;

create index if not exists board_comments_post_created_idx
  on public.board_comments(post_id, created_at asc);

create index if not exists board_comments_author_updated_idx
  on public.board_comments(author_id, updated_at desc);

create index if not exists board_post_likes_user_created_idx
  on public.board_post_likes(user_id, created_at desc);

-- Author identity is copied from the profile at write time. A caller cannot
-- spoof the public name/avatar by sending display_name or avatar_url directly.
create or replace function public.sync_board_author_identity()
returns trigger
language plpgsql
security definer
set search_path = public
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

  -- Authenticated users may only write as themselves. A service-role request
  -- has no auth.uid() and is allowed to write an explicitly supplied author.
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

create or replace function public.set_board_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.sync_board_post_comment_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if new.status = 'published' then
      update public.board_posts
      set comment_count = comment_count + 1
      where id = new.post_id;
    end if;
  elsif tg_op = 'DELETE' then
    if old.status = 'published' then
      update public.board_posts
      set comment_count = greatest(comment_count - 1, 0)
      where id = old.post_id;
    end if;
  elsif old.post_id is distinct from new.post_id
    or old.status is distinct from new.status then
    if old.status = 'published' then
      update public.board_posts
      set comment_count = greatest(comment_count - 1, 0)
      where id = old.post_id;
    end if;

    if new.status = 'published' then
      update public.board_posts
      set comment_count = comment_count + 1
      where id = new.post_id;
    end if;
  end if;

  return null;
end;
$$;

create or replace function public.sync_board_post_like_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.board_posts
    set like_count = like_count + 1
    where id = new.post_id;
  elsif tg_op = 'DELETE' then
    update public.board_posts
    set like_count = greatest(like_count - 1, 0)
    where id = old.post_id;
  end if;

  return null;
end;
$$;

drop trigger if exists board_posts_sync_author_identity on public.board_posts;
create trigger board_posts_sync_author_identity
  before insert or update of author_id, author_visibility, display_name, avatar_url
  on public.board_posts
  for each row execute function public.sync_board_author_identity();

drop trigger if exists board_comments_sync_author_identity on public.board_comments;
create trigger board_comments_sync_author_identity
  before insert or update of author_id, author_visibility, display_name, avatar_url
  on public.board_comments
  for each row execute function public.sync_board_author_identity();

drop trigger if exists board_posts_set_updated_at on public.board_posts;
create trigger board_posts_set_updated_at
  before update on public.board_posts
  for each row execute function public.set_board_updated_at();

drop trigger if exists board_comments_set_updated_at on public.board_comments;
create trigger board_comments_set_updated_at
  before update on public.board_comments
  for each row execute function public.set_board_updated_at();

drop trigger if exists board_comments_sync_post_count on public.board_comments;
create trigger board_comments_sync_post_count
  after insert or delete or update of post_id, status on public.board_comments
  for each row execute function public.sync_board_post_comment_count();

drop trigger if exists board_post_likes_sync_post_count on public.board_post_likes;
create trigger board_post_likes_sync_post_count
  after insert or delete on public.board_post_likes
  for each row execute function public.sync_board_post_like_count();

alter table public.board_posts enable row level security;
alter table public.board_comments enable row level security;
alter table public.board_post_likes enable row level security;

drop policy if exists "board_posts_select_public" on public.board_posts;
create policy "board_posts_select_public" on public.board_posts
  for select to anon, authenticated
  using (status = 'published' or author_id = auth.uid() or public.is_admin());

drop policy if exists "board_posts_insert_own" on public.board_posts;
create policy "board_posts_insert_own" on public.board_posts
  for insert to authenticated
  with check (author_id = auth.uid() or public.is_admin());

drop policy if exists "board_posts_update_own" on public.board_posts;
create policy "board_posts_update_own" on public.board_posts
  for update to authenticated
  using (author_id = auth.uid())
  with check (author_id = auth.uid());

drop policy if exists "board_posts_delete_own" on public.board_posts;
create policy "board_posts_delete_own" on public.board_posts
  for delete to authenticated
  using (author_id = auth.uid());

drop policy if exists "board_comments_select_public" on public.board_comments;
create policy "board_comments_select_public" on public.board_comments
  for select to anon, authenticated
  using (
    (
      status = 'published'
      and exists (
        select 1
        from public.board_posts p
        where p.id = post_id
          and p.status = 'published'
      )
    )
    or author_id = auth.uid()
    or public.is_admin()
  );

drop policy if exists "board_comments_insert_own" on public.board_comments;
create policy "board_comments_insert_own" on public.board_comments
  for insert to authenticated
  with check (
    (author_id = auth.uid() or public.is_admin())
    and exists (
      select 1
      from public.board_posts p
      where p.id = post_id
        and (p.status = 'published' or p.author_id = auth.uid() or public.is_admin())
    )
  );

drop policy if exists "board_comments_update_own" on public.board_comments;
create policy "board_comments_update_own" on public.board_comments
  for update to authenticated
  using (author_id = auth.uid() or public.is_admin())
  with check (
    (author_id = auth.uid() or public.is_admin())
    and exists (
      select 1
      from public.board_posts p
      where p.id = post_id
        and (p.status = 'published' or p.author_id = auth.uid() or public.is_admin())
    )
  );

drop policy if exists "board_comments_delete_own" on public.board_comments;
create policy "board_comments_delete_own" on public.board_comments
  for delete to authenticated
  using (author_id = auth.uid() or public.is_admin());

drop policy if exists "board_post_likes_select_own" on public.board_post_likes;
create policy "board_post_likes_select_own" on public.board_post_likes
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "board_post_likes_insert_own" on public.board_post_likes;
create policy "board_post_likes_insert_own" on public.board_post_likes
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1
      from public.board_posts p
      where p.id = post_id
        and p.status = 'published'
    )
  );

drop policy if exists "board_post_likes_delete_own" on public.board_post_likes;
create policy "board_post_likes_delete_own" on public.board_post_likes
  for delete to authenticated
  using (user_id = auth.uid());

-- Counter columns are trigger-owned. Authenticated clients may only write
-- content columns, so like/comment totals cannot be forged in direct requests.
revoke select, insert, update on public.board_posts from anon, authenticated;
grant select (
  id,
  display_name,
  avatar_url,
  author_visibility,
  category,
  title,
  body,
  status,
  comment_count,
  like_count,
  created_at,
  updated_at
)
  on public.board_posts to anon, authenticated;
grant insert (author_id, author_visibility, category, title, body, status)
  on public.board_posts to authenticated;
grant update (author_visibility, category, title, body)
  on public.board_posts to authenticated;

-- Comment editing/deletion is not exposed yet. Keep direct Data API access at
-- least privilege; future edit/delete flows should use a server action/RPC
-- that locks the parent post before mutating the comment.
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

grant select, insert, delete on public.board_post_likes to authenticated;

commit;
