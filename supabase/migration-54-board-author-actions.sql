-- Migration 54: safe ownership checks and author-controlled board mutations.
-- Apply after migration-53-board-reports.sql.

begin;

-- Authors may edit content and identity visibility, but moderation state is
-- server/admin-owned. Revoke this explicitly for databases that already ran
-- an earlier version of migration 51.
revoke update (status)
  on public.board_posts from authenticated;

grant delete
  on public.board_posts to authenticated;

-- The public board actions are author-only. Admin moderation uses the
-- separately authenticated service-role path and bypasses these policies.
drop policy if exists "board_posts_update_own" on public.board_posts;
create policy "board_posts_update_own"
  on public.board_posts
  for update to authenticated
  using (author_id = auth.uid())
  with check (author_id = auth.uid());

drop policy if exists "board_posts_delete_own" on public.board_posts;
create policy "board_posts_delete_own"
  on public.board_posts
  for delete to authenticated
  using (author_id = auth.uid());

-- Anonymous author ids stay private. The detail UI receives only booleans and
-- ids belonging to the current session, never another member's author_id.
create or replace function public.get_my_board_ownership(p_post_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'owns_post',
      auth.uid() is not null
      and exists (
        select 1
        from public.board_posts p
        where p.id = p_post_id
          and p.author_id = auth.uid()
      ),
    'comment_ids',
      case
        when auth.uid() is null then '[]'::jsonb
        else coalesce(
          (
            select jsonb_agg(c.id order by c.created_at)
            from public.board_comments c
            where c.post_id = p_post_id
              and c.author_id = auth.uid()
              and c.status = 'published'
          ),
          '[]'::jsonb
        )
      end
  );
$$;

-- Direct comment update/delete stays closed. Deletion goes through this
-- function so the parent post is locked before the comment, matching report
-- moderation and keeping the comment counter transactionally consistent.
revoke update, delete
  on public.board_comments from anon, authenticated;

grant insert (post_id, author_id, author_visibility, body)
  on public.board_comments to authenticated;

create or replace function public.delete_own_board_comment(
  p_post_id uuid,
  p_comment_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_user_id uuid := auth.uid();
  comment_author_id uuid;
begin
  if current_user_id is null then
    return false;
  end if;

  perform 1
  from public.board_posts p
  where p.id = p_post_id
  for update;

  if not found then
    return false;
  end if;

  select c.author_id
    into comment_author_id
  from public.board_comments c
  where c.id = p_comment_id
    and c.post_id = p_post_id
  for update;

  if not found or comment_author_id is distinct from current_user_id then
    return false;
  end if;

  delete from public.board_comments
  where id = p_comment_id
    and post_id = p_post_id;

  return found;
end;
$$;

revoke all on function public.get_my_board_ownership(uuid)
  from public, anon, authenticated;
grant execute on function public.get_my_board_ownership(uuid)
  to authenticated;

revoke all on function public.delete_own_board_comment(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.delete_own_board_comment(uuid, uuid)
  to authenticated;

commit;
