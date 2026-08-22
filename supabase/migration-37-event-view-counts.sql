begin;

-- 행사에도 프로덕트·스토리와 같은 조회수를 붙인다.
alter table public.events
  add column if not exists view_count integer;

update public.events
set view_count = 0
where view_count is null;

alter table public.events
  alter column view_count set default 0,
  alter column view_count set not null;

-- 공개된 행사만 한 번의 UPDATE로 증가시켜 동시 요청에서도 값을 잃지 않는다.
create or replace function public.increment_event_view_count(p_slug text)
returns integer
language sql
security definer
set search_path = public
as $$
  update public.events
  set view_count = view_count + 1
  where slug = p_slug
    and status = 'published'
  returning view_count;
$$;

-- 클라이언트 직접 실행은 막고 서버(service_role)에만 허용한다.
revoke execute on function public.increment_event_view_count(text) from public;
revoke execute on function public.increment_event_view_count(text) from anon;
revoke execute on function public.increment_event_view_count(text) from authenticated;
grant execute on function public.increment_event_view_count(text) to service_role;

commit;
