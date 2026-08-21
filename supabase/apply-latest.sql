-- FEATABLE 최신 기능 통합 SQL
-- Supabase Dashboard > SQL Editor에 전체 붙여넣고 한 번 실행하세요.

begin;

-- 0) Founder 공개 역할 (한 줄 소개와 분리)
alter table public.founders
  add column if not exists role_title text not null default '';

-- 1) 프로덕트 조회수 원자 증가
create or replace function public.increment_product_view_count(p_slug text)
returns integer
language sql
security definer
set search_path = public
as $$
  update public.products
  set view_count = view_count + 1
  where slug = p_slug
    and status = 'published'
  returning view_count;
$$;

revoke execute on function public.increment_product_view_count(text) from public, anon, authenticated;
grant execute on function public.increment_product_view_count(text) to service_role;

-- 2) 브랜드와 소속 프로덕트 공개 상태 동시 변경
create or replace function public.set_brand_publication_state(
  p_brand_id uuid,
  p_publish boolean
)
returns boolean
language plpgsql
security invoker
set search_path = public
as $$
declare
  next_status public.content_status := case when p_publish then 'published' else 'draft' end;
  changed_count integer;
begin
  update public.brands
  set status = next_status,
      updated_at = now()
  where id = p_brand_id
    and (public.owns_founder(founder_id) or public.is_admin());

  get diagnostics changed_count = row_count;
  if changed_count = 0 then
    return false;
  end if;

  update public.products
  set status = next_status,
      updated_at = now()
  where brand_id = p_brand_id;

  return true;
end;
$$;

revoke execute on function public.set_brand_publication_state(uuid, boolean) from public, anon;
grant execute on function public.set_brand_publication_state(uuid, boolean) to authenticated;

-- 3) Founder 응원
create table if not exists public.founder_supports (
  user_id uuid not null references public.profiles(id) on delete cascade,
  founder_id uuid not null references public.founders(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, founder_id)
);

create index if not exists idx_founder_supports_founder
  on public.founder_supports(founder_id);

alter table public.founder_supports enable row level security;

drop policy if exists "founder_supports_select_all" on public.founder_supports;
create policy "founder_supports_select_all"
  on public.founder_supports for select
  using (true);

drop policy if exists "founder_supports_insert_own" on public.founder_supports;
create policy "founder_supports_insert_own"
  on public.founder_supports for insert
  with check (user_id = auth.uid());

drop policy if exists "founder_supports_delete_own" on public.founder_supports;
create policy "founder_supports_delete_own"
  on public.founder_supports for delete
  using (user_id = auth.uid());

-- 4) 초안 테이블이 아직 없다면 생성
create table if not exists public.submission_drafts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  draft_key text,
  payload jsonb not null default '{}'::jsonb,
  current_step integer not null default 0 check (current_step between 0 and 7),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 기존 단일 초안을 프로젝트형 다중 초안으로 전환
alter table public.submission_drafts
  add column if not exists draft_key text;

update public.submission_drafts
set draft_key = id::text
where draft_key is null;

alter table public.submission_drafts
  alter column draft_key set default uuid_generate_v4()::text,
  alter column draft_key set not null;

alter table public.submission_drafts
  drop constraint if exists submission_drafts_user_id_key,
  drop constraint if exists submission_drafts_user_id_draft_key_key;

alter table public.submission_drafts
  add constraint submission_drafts_user_id_draft_key_key unique (user_id, draft_key);

create index if not exists submission_drafts_user_id_idx
  on public.submission_drafts(user_id);

create index if not exists submission_drafts_user_updated_idx
  on public.submission_drafts(user_id, updated_at desc);

alter table public.submission_drafts enable row level security;

drop policy if exists "submission_drafts_select_own" on public.submission_drafts;
create policy "submission_drafts_select_own"
  on public.submission_drafts for select
  using (user_id = auth.uid());

drop policy if exists "submission_drafts_insert_own" on public.submission_drafts;
create policy "submission_drafts_insert_own"
  on public.submission_drafts for insert
  with check (user_id = auth.uid());

drop policy if exists "submission_drafts_update_own" on public.submission_drafts;
create policy "submission_drafts_update_own"
  on public.submission_drafts for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "submission_drafts_delete_own" on public.submission_drafts;
create policy "submission_drafts_delete_own"
  on public.submission_drafts for delete
  using (user_id = auth.uid());

-- 5) 회원가입 프로필과 최초 OAuth 온보딩
alter table public.profiles
  add column if not exists full_name text,
  add column if not exists member_type text,
  add column if not exists terms_agreed_at timestamptz,
  add column if not exists privacy_agreed_at timestamptz,
  add column if not exists marketing_agreed_at timestamptz,
  add column if not exists onboarding_completed_at timestamptz;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_member_type_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_member_type_check
      check (member_type in ('founder', 'team', 'explorer', 'partner'));
  end if;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_member_type text := new.raw_user_meta_data ->> 'member_type';
  accepted_terms boolean := coalesce(new.raw_user_meta_data ->> 'terms_accepted', '') = 'true';
  accepted_privacy boolean := coalesce(new.raw_user_meta_data ->> 'privacy_accepted', '') = 'true';
  accepted_marketing boolean := coalesce(new.raw_user_meta_data ->> 'marketing_accepted', '') = 'true';
  profile_name text := nullif(trim(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', '')), '');
begin
  if requested_member_type not in ('founder', 'team', 'explorer', 'partner') then
    requested_member_type := null;
  end if;

  insert into public.profiles (
    id, email, role, full_name, member_type,
    terms_agreed_at, privacy_agreed_at, marketing_agreed_at,
    onboarding_completed_at
  ) values (
    new.id,
    new.email,
    case when new.email in ('chanseo0916@gmail.com', 'dasarom4@gmail.com') then 'admin' else 'user' end,
    profile_name,
    requested_member_type,
    case when accepted_terms then now() end,
    case when accepted_privacy then now() end,
    case when accepted_marketing then now() end,
    case when profile_name is not null and requested_member_type is not null and accepted_terms and accepted_privacy then now() end
  );
  return new;
end;
$$;

-- 6) 역할별 마이페이지 저장 컬렉션
create table if not exists public.saved_items (
  user_id uuid not null references public.profiles(id) on delete cascade,
  item_type text not null check (item_type in ('product', 'feature', 'event', 'support')),
  item_slug text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, item_type, item_slug)
);

create index if not exists saved_items_user_created_idx
  on public.saved_items(user_id, created_at desc);

alter table public.saved_items enable row level security;

drop policy if exists "saved_items_select_own" on public.saved_items;
create policy "saved_items_select_own" on public.saved_items for select
  using (user_id = auth.uid());

drop policy if exists "saved_items_insert_own" on public.saved_items;
create policy "saved_items_insert_own" on public.saved_items for insert
  with check (user_id = auth.uid());

drop policy if exists "saved_items_delete_own" on public.saved_items;
create policy "saved_items_delete_own" on public.saved_items for delete
  using (user_id = auth.uid());

commit;

-- 성공 확인: 두 줄의 결과가 표시되면 완료
select 'founder_supports' as target, count(*) as row_count from public.founder_supports
union all
select 'submission_drafts' as target, count(*) as row_count from public.submission_drafts;
