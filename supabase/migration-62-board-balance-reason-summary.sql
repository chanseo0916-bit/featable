-- Migration 62: aggregate balance-game reason votes without exposing votes.
--
-- The application uses this service-role-only function after a member has
-- voted. It returns one row per configured reason for the selected choice,
-- including zero-count reasons, so the result can be safely aligned with the
-- reason labels in the game payload.

begin;

drop function if exists public.get_board_balance_reason_counts(uuid, text);
create or replace function public.get_board_balance_reason_counts(
  p_game_id uuid,
  p_choice text
)
returns table (
  reason_index integer,
  reason_count bigint
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with configured as (
    select case p_choice
      when 'a' then g.option_a_reasons
      when 'b' then g.option_b_reasons
    end as reasons
    from public.board_balance_games g
    where g.id = p_game_id
      and p_choice in ('a', 'b')
  )
  select
    indexes.idx::integer as reason_index,
    count(v.reason_index)::bigint as reason_count
  from configured c
  cross join lateral generate_series(
    0,
    greatest(cardinality(c.reasons) - 1, -1)
  ) as indexes(idx)
  left join public.board_balance_votes v
    on v.game_id = p_game_id
    and v.choice = p_choice
    and v.reason_index = indexes.idx
  group by indexes.idx
  order by indexes.idx;
$$;

revoke all on function public.get_board_balance_reason_counts(uuid, text)
  from public, anon, authenticated;
grant execute on function public.get_board_balance_reason_counts(uuid, text)
  to service_role;

commit;
