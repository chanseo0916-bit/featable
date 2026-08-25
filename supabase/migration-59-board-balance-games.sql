-- Migration 59: daily board balance games and private votes.
--
-- A balance game is published only for the KST calendar day represented by
-- game_date. Votes are intentionally private: service-role access is the
-- only application path, and the browser identifier is a random HttpOnly
-- cookie rather than an IP address.

begin;

create table if not exists public.board_balance_games (
  id uuid primary key default uuid_generate_v4(),
  game_date date not null,
  question text not null check (char_length(btrim(question)) between 2 and 240),
  option_a text not null check (char_length(btrim(option_a)) between 1 and 160),
  option_b text not null check (char_length(btrim(option_b)) between 1 and 160),
  option_a_reasons text[] not null default array['속도와 피드백'],
  option_b_reasons text[] not null default array['완성도와 신뢰'],
  status text not null default 'draft'
    check (status in ('draft', 'published', 'archived')),
  discussion_post_id uuid references public.board_posts(id) on delete set null,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Keep a partially-created table compatible with this migration on reruns.
alter table public.board_balance_games
  add column if not exists game_date date,
  add column if not exists question text,
  add column if not exists option_a text,
  add column if not exists option_b text,
  add column if not exists option_a_reasons text[] default array['속도와 피드백'],
  add column if not exists option_b_reasons text[] default array['완성도와 신뢰'],
  add column if not exists status text,
  add column if not exists discussion_post_id uuid,
  add column if not exists created_by uuid,
  add column if not exists created_at timestamptz,
  add column if not exists updated_at timestamptz;

alter table public.board_balance_games
  alter column status set default 'draft',
  alter column option_a_reasons set default array['속도와 피드백'],
  alter column option_b_reasons set default array['완성도와 신뢰'],
  alter column created_at set default now(),
  alter column updated_at set default now();

update public.board_balance_games
set
  option_a_reasons = case
    when option_a_reasons is null or cardinality(option_a_reasons) = 0
      then array['속도와 피드백']::text[]
    else option_a_reasons
  end,
  option_b_reasons = case
    when option_b_reasons is null or cardinality(option_b_reasons) = 0
      then array['완성도와 신뢰']::text[]
    else option_b_reasons
  end,
  status = coalesce(status, 'draft'),
  created_at = coalesce(created_at, now()),
  updated_at = coalesce(updated_at, now());

alter table public.board_balance_games
  alter column game_date set not null,
  alter column question set not null,
  alter column option_a set not null,
  alter column option_b set not null,
  alter column option_a_reasons set not null,
  alter column option_b_reasons set not null,
  alter column status set not null,
  alter column created_by set not null,
  alter column created_at set not null,
  alter column updated_at set not null;

alter table public.board_balance_games
  drop constraint if exists board_balance_games_status_check;
alter table public.board_balance_games
  add constraint board_balance_games_status_check
  check (status in ('draft', 'published', 'archived'));
alter table public.board_balance_games
  drop constraint if exists board_balance_games_question_check;
alter table public.board_balance_games
  add constraint board_balance_games_question_check
  check (char_length(btrim(question)) between 2 and 240);
alter table public.board_balance_games
  drop constraint if exists board_balance_games_option_a_check;
alter table public.board_balance_games
  add constraint board_balance_games_option_a_check
  check (char_length(btrim(option_a)) between 1 and 160);
alter table public.board_balance_games
  drop constraint if exists board_balance_games_option_b_check;
alter table public.board_balance_games
  add constraint board_balance_games_option_b_check
  check (char_length(btrim(option_b)) between 1 and 160);
alter table public.board_balance_games
  drop constraint if exists board_balance_games_option_a_reasons_check;
create or replace function public.is_board_balance_reason_options(p_reasons text[])
returns boolean
language sql
immutable
set search_path = public, pg_temp
as $$
  select
    p_reasons is not null
    and cardinality(p_reasons) between 1 and 4
    and coalesce(
      (select bool_and(coalesce(char_length(btrim(reason)), 0) between 1 and 30)
       from unnest(p_reasons) as reason),
      false
    );
$$;
revoke all on function public.is_board_balance_reason_options(text[])
  from public, anon, authenticated;
alter table public.board_balance_games
  add constraint board_balance_games_option_a_reasons_check
  check (public.is_board_balance_reason_options(option_a_reasons));
alter table public.board_balance_games
  drop constraint if exists board_balance_games_option_b_reasons_check;
alter table public.board_balance_games
  add constraint board_balance_games_option_b_reasons_check
  check (public.is_board_balance_reason_options(option_b_reasons));
alter table public.board_balance_games
  drop constraint if exists board_balance_games_discussion_post_id_fkey;
alter table public.board_balance_games
  add constraint board_balance_games_discussion_post_id_fkey
  foreign key (discussion_post_id) references public.board_posts(id) on delete set null;
alter table public.board_balance_games
  drop constraint if exists board_balance_games_created_by_fkey;
alter table public.board_balance_games
  add constraint board_balance_games_created_by_fkey
  foreign key (created_by) references public.profiles(id) on delete restrict;

create unique index if not exists board_balance_games_game_date_key
  on public.board_balance_games(game_date);
create unique index if not exists board_balance_games_discussion_post_key
  on public.board_balance_games(discussion_post_id)
  where discussion_post_id is not null;
create index if not exists board_balance_games_current_idx
  on public.board_balance_games(game_date desc)
  where status = 'published';

create table if not exists public.board_balance_votes (
  game_id uuid not null references public.board_balance_games(id) on delete cascade,
  voter_key uuid not null,
  user_id uuid references public.profiles(id) on delete set null,
  choice text not null check (choice in ('a', 'b')),
  created_at timestamptz not null default now()
);

alter table public.board_balance_votes
  add column if not exists game_id uuid,
  add column if not exists voter_key uuid,
  add column if not exists user_id uuid,
  add column if not exists choice text,
  add column if not exists reason_index integer,
  add column if not exists created_at timestamptz;

update public.board_balance_votes
set created_at = coalesce(created_at, now());

alter table public.board_balance_votes
  alter column created_at set default now(),
  alter column game_id set not null,
  alter column voter_key set not null,
  alter column choice set not null,
  alter column created_at set not null;

alter table public.board_balance_votes
  drop constraint if exists board_balance_votes_choice_check;
alter table public.board_balance_votes
  add constraint board_balance_votes_choice_check
  check (choice in ('a', 'b'));
alter table public.board_balance_votes
  drop constraint if exists board_balance_votes_reason_index_check;
alter table public.board_balance_votes
  add constraint board_balance_votes_reason_index_check
  check (reason_index is null or reason_index between 0 and 3);
alter table public.board_balance_votes
  drop constraint if exists board_balance_votes_game_id_fkey;
alter table public.board_balance_votes
  add constraint board_balance_votes_game_id_fkey
  foreign key (game_id) references public.board_balance_games(id) on delete cascade;
alter table public.board_balance_votes
  drop constraint if exists board_balance_votes_user_id_fkey;
alter table public.board_balance_votes
  add constraint board_balance_votes_user_id_fkey
  foreign key (user_id) references public.profiles(id) on delete set null;

create unique index if not exists board_balance_votes_game_voter_key
  on public.board_balance_votes(game_id, voter_key);
create unique index if not exists board_balance_votes_game_user_key
  on public.board_balance_votes(game_id, user_id)
  where user_id is not null;
create index if not exists board_balance_votes_game_choice_idx
  on public.board_balance_votes(game_id, choice);

-- These tables are private even though RLS is enabled as a second boundary.
-- API handlers use the service-role client, so no browser role receives table
-- privileges or can inspect another viewer's choice.
alter table public.board_balance_games enable row level security;
alter table public.board_balance_votes enable row level security;
revoke all on public.board_balance_games from public, anon, authenticated;
revoke all on public.board_balance_votes from public, anon, authenticated;
grant all on public.board_balance_games to service_role;
grant all on public.board_balance_votes to service_role;

create or replace function public.set_board_balance_game_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists board_balance_games_set_updated_at
  on public.board_balance_games;
create trigger board_balance_games_set_updated_at
  before update on public.board_balance_games
  for each row execute function public.set_board_balance_game_updated_at();

revoke all on function public.set_board_balance_game_updated_at()
  from public, anon, authenticated;

-- Admin-only service-role functions keep each game and its discussion post in
-- the same transaction. The application verifies the session administrator
-- before calling these functions; the database verifies that administrator a
-- second time and exposes no execute grant to browser roles.
drop function if exists public.create_board_balance_game(date, text, text, text, text, uuid);
create or replace function public.create_board_balance_game(
  p_game_date date,
  p_question text,
  p_option_a text,
  p_option_b text,
  p_option_a_reasons text[],
  p_option_b_reasons text[],
  p_status text,
  p_created_by uuid
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  discussion_id uuid;
  game_id uuid;
  discussion_status text;
begin
  if not exists (
    select 1
    from public.profiles p
    where p.id = p_created_by
      and p.role = 'admin'
  ) then
    raise exception 'board_balance_game_admin_required';
  end if;

  if p_game_date is null
    or p_status is null
    or p_status not in ('draft', 'published', 'archived')
    or p_question is null
    or p_option_a is null
    or p_option_b is null
    or not public.is_board_balance_reason_options(p_option_a_reasons)
    or not public.is_board_balance_reason_options(p_option_b_reasons) then
    raise exception 'board_balance_game_invalid_input';
  end if;

  discussion_status := case
    when p_status = 'published'
      and p_game_date <= (now() at time zone 'Asia/Seoul')::date then 'published'
    when p_status = 'published' then 'draft'
    when p_status = 'draft' then 'draft'
    else 'hidden'
  end;

  insert into public.board_posts (
    author_id,
    author_visibility,
    category,
    title,
    body,
    status
  )
  values (
    p_created_by,
    'profile',
    'question',
    left('오늘의 밸런스 게임: ' || btrim(p_question), 120),
    concat_ws(
      E'\n',
      '오늘의 밸런스 게임',
      '',
      btrim(p_question),
      '',
      'A. ' || btrim(p_option_a),
      'B. ' || btrim(p_option_b),
      '',
      '투표하고, 왜 이 선택을 했는지 이야기해 보세요.'
    ),
    discussion_status
  )
  returning id into discussion_id;

  insert into public.board_balance_games (
    game_date,
    question,
    option_a,
    option_b,
    option_a_reasons,
    option_b_reasons,
    status,
    discussion_post_id,
    created_by
  )
  values (
    p_game_date,
    btrim(p_question),
    btrim(p_option_a),
    btrim(p_option_b),
    array(select btrim(reason) from unnest(p_option_a_reasons) as reason),
    array(select btrim(reason) from unnest(p_option_b_reasons) as reason),
    p_status,
    discussion_id,
    p_created_by
  )
  returning id into game_id;

  return game_id;
end;
$$;

revoke all on function public.create_board_balance_game(date, text, text, text, text[], text[], text, uuid)
  from public, anon, authenticated;
grant execute on function public.create_board_balance_game(date, text, text, text, text[], text[], text, uuid)
  to service_role;

drop function if exists public.update_board_balance_game(uuid, date, text, text, text, text, uuid);
create or replace function public.update_board_balance_game(
  p_game_id uuid,
  p_game_date date,
  p_question text,
  p_option_a text,
  p_option_b text,
  p_option_a_reasons text[],
  p_option_b_reasons text[],
  p_status text,
  p_updated_by uuid
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_game public.board_balance_games%rowtype;
  discussion_id uuid;
  discussion_status text;
begin
  if not exists (
    select 1
    from public.profiles p
    where p.id = p_updated_by
      and p.role = 'admin'
  ) then
    raise exception 'board_balance_game_admin_required';
  end if;

  if p_game_id is null
    or p_game_date is null
    or p_status is null
    or p_status not in ('draft', 'published', 'archived')
    or p_question is null
    or p_option_a is null
    or p_option_b is null
    or not public.is_board_balance_reason_options(p_option_a_reasons)
    or not public.is_board_balance_reason_options(p_option_b_reasons) then
    raise exception 'board_balance_game_invalid_input';
  end if;

  select g.*
    into current_game
  from public.board_balance_games g
  where g.id = p_game_id
  for update;

  if not found then
    raise exception 'board_balance_game_not_found';
  end if;

  if exists (
    select 1
    from public.board_balance_votes v
    where v.game_id = p_game_id
  ) and (
    current_game.game_date is distinct from p_game_date
    or current_game.question is distinct from btrim(p_question)
    or current_game.option_a is distinct from btrim(p_option_a)
    or current_game.option_b is distinct from btrim(p_option_b)
    or current_game.option_a_reasons is distinct from (
      array(select btrim(reason) from unnest(p_option_a_reasons) as reason)
    )
    or current_game.option_b_reasons is distinct from (
      array(select btrim(reason) from unnest(p_option_b_reasons) as reason)
    )
  ) then
    raise exception 'board_balance_game_has_votes';
  end if;

  discussion_status := case
    when p_status = 'published'
      and p_game_date <= (now() at time zone 'Asia/Seoul')::date then 'published'
    when p_status = 'published' then 'draft'
    when p_status = 'draft' then 'draft'
    else 'hidden'
  end;
  discussion_id := current_game.discussion_post_id;

  if discussion_id is null then
    insert into public.board_posts (
      author_id,
      author_visibility,
      category,
      title,
      body,
      status
    )
    values (
      p_updated_by,
      'profile',
      'question',
      left('오늘의 밸런스 게임: ' || btrim(p_question), 120),
      concat_ws(
        E'\n',
        '오늘의 밸런스 게임',
        '',
        btrim(p_question),
        '',
        'A. ' || btrim(p_option_a),
        'B. ' || btrim(p_option_b),
        '',
        '투표하고, 왜 이 선택을 했는지 이야기해 보세요.'
      ),
      discussion_status
    )
    returning id into discussion_id;
  else
    update public.board_posts
    set
      category = 'question',
      title = left('오늘의 밸런스 게임: ' || btrim(p_question), 120),
      body = concat_ws(
        E'\n',
        '오늘의 밸런스 게임',
        '',
        btrim(p_question),
        '',
        'A. ' || btrim(p_option_a),
        'B. ' || btrim(p_option_b),
        '',
        '투표하고, 왜 이 선택을 했는지 이야기해 보세요.'
      ),
      status = discussion_status
    where id = discussion_id;
  end if;

  update public.board_balance_games
  set
    game_date = p_game_date,
    question = btrim(p_question),
    option_a = btrim(p_option_a),
    option_b = btrim(p_option_b),
    option_a_reasons = array(select btrim(reason) from unnest(p_option_a_reasons) as reason),
    option_b_reasons = array(select btrim(reason) from unnest(p_option_b_reasons) as reason),
    status = p_status,
    discussion_post_id = discussion_id
  where id = p_game_id;

  return p_game_id;
end;
$$;

revoke all on function public.update_board_balance_game(uuid, date, text, text, text, text[], text[], text, uuid)
  from public, anon, authenticated;
grant execute on function public.update_board_balance_game(uuid, date, text, text, text, text[], text[], text, uuid)
  to service_role;

-- Admin pages request at most one aggregate row per game instead of
-- transferring every private vote or issuing two requests per game.
create or replace function public.get_board_balance_vote_summaries(
  p_game_ids uuid[]
)
returns table (
  game_id uuid,
  option_a_count bigint,
  option_b_count bigint,
  total_count bigint
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    v.game_id,
    count(*) filter (where v.choice = 'a') as option_a_count,
    count(*) filter (where v.choice = 'b') as option_b_count,
    count(*) as total_count
  from public.board_balance_votes v
  where v.game_id = any(coalesce(p_game_ids, array[]::uuid[]))
  group by v.game_id;
$$;

revoke all on function public.get_board_balance_vote_summaries(uuid[])
  from public, anon, authenticated;
grant execute on function public.get_board_balance_vote_summaries(uuid[])
  to service_role;

-- Service role only. The caller supplies the authenticated user id obtained by
-- the server from Supabase Auth; it never comes from the request body.
create or replace function public.cast_board_balance_vote(
  p_game_id uuid,
  p_voter_key uuid,
  p_user_id uuid,
  p_choice text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  existing_choice text;
  existing_voter_user_id uuid;
  final_choice text;
  count_a integer;
  count_b integer;
begin
  if p_game_id is null or p_voter_key is null then
    raise exception 'board_balance_vote_invalid_identity';
  end if;

  if p_choice is null or p_choice not in ('a', 'b') then
    raise exception 'board_balance_vote_invalid_choice';
  end if;

  if p_user_id is not null and not exists (
    select 1 from public.profiles where id = p_user_id
  ) then
    raise exception 'board_balance_vote_invalid_user';
  end if;

  -- Shared row locks let votes proceed concurrently while a publish/archive
  -- update waits until every in-flight validity check and insert completes.
  perform 1
  from public.board_balance_games g
  where g.id = p_game_id
    and g.game_date = (now() at time zone 'Asia/Seoul')::date
    and g.status = 'published'
  for share;

  if not found then
    raise exception 'board_balance_game_unavailable';
  end if;

  -- A future published game keeps its discussion out of the feed. The first
  -- valid vote on its KST game date makes that linked discussion visible.
  update public.board_posts p
  set status = 'published'
  from public.board_balance_games g
  where g.id = p_game_id
    and p.id = g.discussion_post_id
    and p.status is distinct from 'published';

  -- A signed-in member is limited to one vote across devices. The cookie key
  -- still protects anonymous visitors and lets a browser retain its choice.
  if p_user_id is not null then
    select v.choice
      into existing_choice
    from public.board_balance_votes v
    where v.game_id = p_game_id
      and v.user_id = p_user_id
    for update;
  end if;

  if existing_choice is null then
    select v.choice, v.user_id
      into existing_choice, existing_voter_user_id
    from public.board_balance_votes v
    where v.game_id = p_game_id
      and v.voter_key = p_voter_key
    for update;

    if existing_choice is not null
      and existing_voter_user_id is not null
      and existing_voter_user_id is distinct from p_user_id then
      raise exception 'board_balance_vote_identity_conflict';
    end if;
  end if;

  if existing_choice is null then
    insert into public.board_balance_votes (game_id, voter_key, user_id, choice)
    values (p_game_id, p_voter_key, p_user_id, p_choice)
    on conflict do nothing;

    -- Another request may have won either the cookie or user uniqueness race.
    if not found then
      if p_user_id is not null then
        select v.choice
          into existing_choice
        from public.board_balance_votes v
        where v.game_id = p_game_id
          and v.user_id = p_user_id
        for update;
      end if;

      if existing_choice is null then
        select v.choice, v.user_id
          into existing_choice, existing_voter_user_id
        from public.board_balance_votes v
        where v.game_id = p_game_id
          and v.voter_key = p_voter_key
        for update;

        if existing_choice is not null
          and existing_voter_user_id is not null
          and existing_voter_user_id is distinct from p_user_id then
          raise exception 'board_balance_vote_identity_conflict';
        end if;
      end if;
    end if;
  end if;

  final_choice := coalesce(existing_choice, p_choice);

  select
    count(*) filter (where v.choice = 'a')::integer,
    count(*) filter (where v.choice = 'b')::integer
    into count_a, count_b
  from public.board_balance_votes v
  where v.game_id = p_game_id;

  return jsonb_build_object(
    'game_id', p_game_id,
    'choice', final_choice,
    'counts', jsonb_build_object(
      'a', coalesce(count_a, 0),
      'b', coalesce(count_b, 0),
      'total', coalesce(count_a, 0) + coalesce(count_b, 0)
    )
  );
end;
$$;

revoke all on function public.cast_board_balance_vote(uuid, uuid, uuid, text)
  from public, anon, authenticated;
grant execute on function public.cast_board_balance_vote(uuid, uuid, uuid, text)
  to service_role;

-- One initial prompt and its linked discussion make the feature useful right
-- after deployment. If no administrator exists yet, the admin page can create
-- the first game later.
do $$
declare
  seed_admin_id uuid;
begin
  select p.id
    into seed_admin_id
  from public.profiles p
  where p.role = 'admin'
  order by p.created_at, p.id
  limit 1;

  if seed_admin_id is not null and not exists (
    select 1
    from public.board_balance_games g
    where g.game_date = (now() at time zone 'Asia/Seoul')::date
  ) then
    perform public.create_board_balance_game(
      (now() at time zone 'Asia/Seoul')::date,
      '아이디어를 언제 공개할까요?',
      '빠르게 공개하고 피드백받기',
      '완성도를 높인 뒤 공개하기',
      array['시장 반응이 먼저', '실행 속도가 중요'],
      array['완성도가 신뢰', '첫인상이 중요'],
      'published',
      seed_admin_id
    );
  end if;
end;
$$;

commit;
