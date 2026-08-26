-- Migration 63: let comment policies inspect a post without exposing its author_id.
--
-- board_posts uses column-level SELECT grants so anonymous author ids remain
-- private. The old board_comments INSERT/UPDATE policies queried
-- board_posts.author_id directly, which made PostgreSQL reject the policy with
-- 42501 for ordinary authenticated members. This trusted boolean helper keeps
-- that lookup behind a SECURITY DEFINER boundary instead of broadening SELECT.

begin;

create or replace function public.can_comment_on_board_post(p_post_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null
    and exists (
      select 1
      from public.board_posts post
      where post.id = p_post_id
        and (
          post.status = 'published'
          or post.author_id = auth.uid()
          or public.is_admin()
        )
    );
$$;

revoke all on function public.can_comment_on_board_post(uuid)
  from public, anon, authenticated;
grant execute on function public.can_comment_on_board_post(uuid)
  to authenticated;

drop policy if exists "board_comments_insert_own" on public.board_comments;
create policy "board_comments_insert_own" on public.board_comments
  for insert to authenticated
  with check (
    (author_id = auth.uid() or public.is_admin())
    and public.can_comment_on_board_post(post_id)
  );

drop policy if exists "board_comments_update_own" on public.board_comments;
create policy "board_comments_update_own" on public.board_comments
  for update to authenticated
  using (author_id = auth.uid() or public.is_admin())
  with check (
    (author_id = auth.uid() or public.is_admin())
    and public.can_comment_on_board_post(post_id)
  );

commit;
