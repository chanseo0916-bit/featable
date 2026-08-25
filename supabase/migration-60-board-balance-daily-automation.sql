-- Migration 60: replace the initial demo balance game with today's launch prompt.
--
-- Migration 59 may already have collected a handful of internal test votes for
-- its demo question. Those votes cannot be carried into a different question,
-- so this migration resets votes only when today's row still has the exact demo
-- question. Any question edited by an administrator is left untouched.

begin;

do $$
declare
  launch_game_id uuid;
  launch_discussion_id uuid;
  launch_vote_count bigint;
begin
  select g.id, g.discussion_post_id
    into launch_game_id, launch_discussion_id
  from public.board_balance_games g
  where g.game_date = (now() at time zone 'Asia/Seoul')::date
    and g.question = '아이디어를 언제 공개할까요?'
  for update;

  if launch_game_id is not null then
    select count(*)
      into launch_vote_count
    from public.board_balance_votes
    where game_id = launch_game_id;

    if launch_vote_count > 10 then
      raise exception
        'board_balance_launch_prompt_has_unexpected_votes: %',
        launch_vote_count;
    end if;

    delete from public.board_balance_votes
    where game_id = launch_game_id;

    update public.board_balance_games
    set
      question = '진짜 잘 안 팔리는 상품이 있는데, 뭐가 문제일까?',
      option_a = '마케팅',
      option_b = '상품 퀄리티',
      option_a_reasons = array['고객이 아직 모른다', '도달 채널이 약하다'],
      option_b_reasons = array['써볼 이유가 약하다', '재구매가 이어지지 않는다'],
      status = 'published'
    where id = launch_game_id;

    if launch_discussion_id is not null then
      update public.board_posts
      set
        category = 'question',
        title = left('오늘의 밸런스 게임: 진짜 잘 안 팔리는 상품이 있는데, 뭐가 문제일까?', 120),
        body = concat_ws(
          E'\n',
          '오늘의 밸런스 게임',
          '',
          '진짜 잘 안 팔리는 상품이 있는데, 뭐가 문제일까?',
          '',
          'A. 마케팅',
          'B. 상품 퀄리티',
          '',
          '투표하고, 왜 그 선택을 했는지 이야기해 보세요.'
        ),
        status = 'published'
      where id = launch_discussion_id;
    end if;
  end if;
end;
$$;

commit;
