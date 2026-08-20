-- ============================================================
-- FEATABLE DB Schema (Supabase / Postgres)
-- 실행 방법: Supabase 대시보드 > SQL Editor 에 전체 붙여넣고 Run
-- 스펙: FEATABLE_MVP.md 3장 (Core Data Model)
-- ============================================================

-- ---------- 공통 ----------
create extension if not exists "uuid-ossp";

-- 콘텐츠 공개 상태
create type content_status as enum ('draft', 'published', 'hidden');

-- ---------- 사용자 프로필 ----------
-- auth.users 1:1. 가입 시 트리거로 자동 생성
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  role text not null default 'user' check (role in ('user', 'mentor', 'community_manager', 'admin')),
  full_name text,
  member_type text check (member_type in ('founder', 'team', 'explorer', 'partner')),
  terms_agreed_at timestamptz,
  privacy_agreed_at timestamptz,
  marketing_agreed_at timestamptz,
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now()
);

create or replace function handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
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
    id, email, full_name, member_type,
    terms_agreed_at, privacy_agreed_at, marketing_agreed_at,
    onboarding_completed_at
  ) values (
    new.id,
    new.email,
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

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ---------- Founder ----------
create table founders (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  slug text not null unique,
  name text not null,
  avatar_url text,
  headline text not null default '',
  bio text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id)  -- MVP: 계정당 Founder 프로필 1개
);

-- ---------- Founder Support ----------
-- 로그인 사용자는 Founder를 한 번만 응원할 수 있고, 취소할 수 있다.
create table founder_supports (
  user_id uuid not null references profiles(id) on delete cascade,
  founder_id uuid not null references founders(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, founder_id)
);

create table saved_items (
  user_id uuid not null references profiles(id) on delete cascade,
  item_type text not null check (item_type in ('product', 'feature', 'event', 'support')),
  item_slug text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, item_type, item_slug)
);

-- ---------- Brand ----------
create table brands (
  id uuid primary key default uuid_generate_v4(),
  founder_id uuid not null references founders(id) on delete cascade,
  slug text not null unique,
  name text not null,
  logo_url text,
  cover_url text,
  tagline text not null default '',
  description text not null default '',
  problem text,
  audience text,
  category text not null default '기타',
  website text,
  sns jsonb not null default '{}',            -- { instagram, x, youtube }
  founded_at text,                            -- "2025-03"
  status content_status not null default 'draft',
  is_featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- Product ----------
create table products (
  id uuid primary key default uuid_generate_v4(),
  brand_id uuid not null references brands(id) on delete cascade,
  slug text not null unique,
  name text not null,
  hero_url text,
  images text[] not null default '{}',
  tagline text not null default '',
  story jsonb not null default '[]',          -- StoryBlock[] (types.ts와 동일 구조)
  problem text not null default '',
  solution text not null default '',
  features text[] not null default '{}',
  price text,
  buy_url text,
  official_url text,
  category text not null default '기타',
  status content_status not null default 'draft',
  is_featured boolean not null default false,
  view_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- Feature (스토리/인터뷰 콘텐츠) ----------
create table features (
  id uuid primary key default uuid_generate_v4(),
  brand_id uuid references brands(id) on delete cascade,
  founder_id uuid references founders(id) on delete set null,
  slug text not null unique,
  title text not null,
  cover_url text,
  kind text not null default 'brand-story'
    check (kind in ('interview','brand-story','product-feature','launch','update','case-study','qna')),
  excerpt text not null default '',
  body jsonb not null default '[]',           -- StoryBlock[]
  status content_status not null default 'draft',
  view_count integer not null default 0,
  is_featured boolean not null default false, -- THIS WEEK'S FEATURE 지정
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 공개된 feature 조회수를 한 번의 UPDATE로 원자적으로 증가
create or replace function public.increment_feature_view_count(p_slug text)
returns integer
language sql
security definer
set search_path = public
as $$
  update public.features
  set view_count = view_count + 1
  where slug = p_slug
    and status = 'published'
  returning view_count;
$$;

-- 조회수 증가는 서버의 service_role을 통해서만 실행
revoke execute on function public.increment_feature_view_count(text) from public;
grant execute on function public.increment_feature_view_count(text) to service_role;

-- 공개된 product 조회수도 동시 요청에서 유실되지 않도록 원자적으로 증가
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

-- ---------- Mentor's Note ----------
create table mentor_notes (
  id uuid primary key default uuid_generate_v4(),
  mentor_user_id uuid not null references profiles(id) on delete cascade,
  brand_id uuid references brands(id) on delete cascade,
  product_id uuid references products(id) on delete cascade,
  mentor_name text not null,
  mentor_field text not null,                 -- 예: "Marketing"
  comment text not null,
  status content_status not null default 'published',
  created_at timestamptz not null default now(),
  check (brand_id is not null or product_id is not null)
);

-- ---------- Event (MVP: 관리자 큐레이션) ----------
create table events (
  id uuid primary key default uuid_generate_v4(),
  slug text not null unique,
  name text not null,
  cover_url text,
  host text not null default '',
  starts_at timestamptz not null,
  ends_at timestamptz,
  location text not null default '',
  is_online boolean not null default false,
  fee text,
  deadline timestamptz,
  category text not null default '기타',
  audience text,
  apply_url text not null,
  community_id uuid,
  brand_id uuid references brands(id) on delete set null,
  status content_status not null default 'published',
  created_at timestamptz not null default now()
);

-- ---------- Support Program (관리자 큐레이션) ----------
create table support_programs (
  id uuid primary key default uuid_generate_v4(),
  slug text not null unique,
  name text not null,
  agency text not null default '',
  target text not null default '',
  benefits text not null default '',
  amount text,
  open_at date,
  close_at date not null,                     -- D-day 계산 기준
  region text not null default '전국',
  field text,
  apply_url text not null,
  status content_status not null default 'published',
  created_at timestamptz not null default now()
);

-- ---------- Community ----------
create table communities (
  id uuid primary key default uuid_generate_v4(),
  manager_user_id uuid references profiles(id) on delete set null,
  slug text not null unique,
  name text not null,
  logo_url text,
  intro text not null default '',
  field text not null default '',
  website text,
  sns jsonb not null default '{}',
  status content_status not null default 'published',
  created_at timestamptz not null default now()
);

alter table events
  add constraint events_community_fk
  foreign key (community_id) references communities(id) on delete set null;

-- ---------- Job ----------
create table jobs (
  id uuid primary key default uuid_generate_v4(),
  brand_id uuid not null references brands(id) on delete cascade,
  slug text not null unique,
  title text not null,
  role text not null default '',
  type text not null default '정규직' check (type in ('정규직','계약직','인턴','파트타임')),
  location text not null default '',
  apply_url text,
  status content_status not null default 'published',
  created_at timestamptz not null default now()
);

-- ---------- Partner (푸터 로고) ----------
create table partners (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  logo_url text not null,
  href text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- ---------- 커뮤니티 연결 (Community ↔ Founder/Brand) ----------
create table community_founders (
  community_id uuid references communities(id) on delete cascade,
  founder_id uuid references founders(id) on delete cascade,
  primary key (community_id, founder_id)
);

create table community_brands (
  community_id uuid references communities(id) on delete cascade,
  brand_id uuid references brands(id) on delete cascade,
  primary key (community_id, brand_id)
);

-- ---------- 인덱스 ----------
create index idx_brands_status on brands(status);
create index idx_brands_category on brands(category);
create index idx_products_status on products(status);
create index idx_products_brand on products(brand_id);
create index idx_products_category on products(category);
create index idx_features_status on features(status);
create index idx_features_brand on features(brand_id);
create index idx_support_close_at on support_programs(close_at);
create index idx_events_starts_at on events(starts_at);
create index idx_founder_supports_founder on founder_supports(founder_id);

-- ============================================================
-- Row Level Security
-- 원칙: published는 누구나 읽기 / 소유자는 자기 것 전체 관리 / admin은 전체
-- ============================================================

create or replace function is_admin()
returns boolean language sql security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin');
$$;

-- Founder 소유 여부 헬퍼
create or replace function owns_founder(f_id uuid)
returns boolean language sql security definer set search_path = public as $$
  select exists (select 1 from founders where id = f_id and user_id = auth.uid());
$$;

create or replace function owns_brand(b_id uuid)
returns boolean language sql security definer set search_path = public as $$
  select exists (
    select 1 from brands b join founders f on f.id = b.founder_id
    where b.id = b_id and f.user_id = auth.uid()
  );
$$;

-- 브랜드와 소속 프로덕트의 공개 상태를 한 트랜잭션에서 함께 변경
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
  set status = next_status, updated_at = now()
  where id = p_brand_id
    and (public.owns_founder(founder_id) or public.is_admin());

  get diagnostics changed_count = row_count;
  if changed_count = 0 then return false; end if;

  update public.products
  set status = next_status, updated_at = now()
  where brand_id = p_brand_id;

  return true;
end;
$$;

revoke execute on function public.set_brand_publication_state(uuid, boolean) from public, anon;
grant execute on function public.set_brand_publication_state(uuid, boolean) to authenticated;

alter table profiles enable row level security;
alter table founders enable row level security;
alter table founder_supports enable row level security;
alter table saved_items enable row level security;
alter table brands enable row level security;
alter table products enable row level security;
alter table features enable row level security;
alter table mentor_notes enable row level security;
alter table events enable row level security;
alter table support_programs enable row level security;
alter table communities enable row level security;
alter table jobs enable row level security;
alter table partners enable row level security;
alter table community_founders enable row level security;
alter table community_brands enable row level security;

-- profiles: 본인만 조회/수정, admin 전체
create policy "profiles_select_own" on profiles for select using (id = auth.uid() or is_admin());
create policy "profiles_update_own" on profiles for update using (id = auth.uid());

-- founders: 공개 읽기, 본인 쓰기
create policy "founders_select_all" on founders for select using (true);
create policy "founders_insert_own" on founders for insert with check (user_id = auth.uid());
create policy "founders_update_own" on founders for update using (user_id = auth.uid() or is_admin());
create policy "founders_delete_own" on founders for delete using (user_id = auth.uid() or is_admin());

-- founder_supports: 응원 수는 공개, 쓰기는 로그인한 본인 행만 허용
create policy "founder_supports_select_all" on founder_supports for select using (true);
create policy "founder_supports_insert_own" on founder_supports for insert with check (user_id = auth.uid());
create policy "founder_supports_delete_own" on founder_supports for delete using (user_id = auth.uid());

-- saved_items: 저장 목록은 본인만 조회·추가·삭제
create policy "saved_items_select_own" on saved_items for select using (user_id = auth.uid());
create policy "saved_items_insert_own" on saved_items for insert with check (user_id = auth.uid());
create policy "saved_items_delete_own" on saved_items for delete using (user_id = auth.uid());

-- brands: published 공개, 소유자는 draft 포함 전체
create policy "brands_select_published" on brands for select
  using (status = 'published' or owns_founder(founder_id) or is_admin());
create policy "brands_insert_own" on brands for insert with check (owns_founder(founder_id));
create policy "brands_update_own" on brands for update using (owns_founder(founder_id) or is_admin());
create policy "brands_delete_own" on brands for delete using (owns_founder(founder_id) or is_admin());

-- products
create policy "products_select_published" on products for select
  using (status = 'published' or owns_brand(brand_id) or is_admin());
create policy "products_insert_own" on products for insert with check (owns_brand(brand_id));
create policy "products_update_own" on products for update using (owns_brand(brand_id) or is_admin());
create policy "products_delete_own" on products for delete using (owns_brand(brand_id) or is_admin());

-- features
create policy "features_select_published" on features for select
  using (status = 'published' or (brand_id is not null and owns_brand(brand_id)) or is_admin());
create policy "features_insert_own" on features for insert
  with check ((brand_id is not null and owns_brand(brand_id)) or is_admin());
create policy "features_update_own" on features for update
  using ((brand_id is not null and owns_brand(brand_id)) or is_admin());
create policy "features_delete_own" on features for delete
  using ((brand_id is not null and owns_brand(brand_id)) or is_admin());

-- mentor_notes: 공개 읽기, mentor/admin만 작성
create policy "mentor_notes_select" on mentor_notes for select using (status = 'published' or is_admin());
create policy "mentor_notes_insert" on mentor_notes for insert with check (
  mentor_user_id = auth.uid() and exists (
    select 1 from profiles where id = auth.uid() and role in ('mentor','admin')
  )
);
create policy "mentor_notes_update_own" on mentor_notes for update using (mentor_user_id = auth.uid() or is_admin());
create policy "mentor_notes_delete_own" on mentor_notes for delete using (mentor_user_id = auth.uid() or is_admin());

-- 큐레이션 테이블: 공개 읽기, admin만 쓰기
create policy "events_select" on events for select using (status = 'published' or is_admin());
create policy "events_write" on events for all using (is_admin()) with check (is_admin());

create policy "support_select" on support_programs for select using (status = 'published' or is_admin());
create policy "support_write" on support_programs for all using (is_admin()) with check (is_admin());

create policy "communities_select" on communities for select using (status = 'published' or manager_user_id = auth.uid() or is_admin());
create policy "communities_write" on communities for all
  using (manager_user_id = auth.uid() or is_admin())
  with check (manager_user_id = auth.uid() or is_admin());

create policy "jobs_select" on jobs for select using (status = 'published' or owns_brand(brand_id) or is_admin());
create policy "jobs_write" on jobs for all using (owns_brand(brand_id) or is_admin()) with check (owns_brand(brand_id) or is_admin());

create policy "partners_select" on partners for select using (true);
create policy "partners_write" on partners for all using (is_admin()) with check (is_admin());

create policy "community_founders_select" on community_founders for select using (true);
create policy "community_founders_write" on community_founders for all using (is_admin()) with check (is_admin());
create policy "community_brands_select" on community_brands for select using (true);
create policy "community_brands_write" on community_brands for all using (is_admin()) with check (is_admin());

-- ============================================================
-- Storage: 이미지 버킷
-- ============================================================
insert into storage.buckets (id, name, public) values ('images', 'images', true)
on conflict (id) do nothing;

create policy "images_public_read" on storage.objects for select using (bucket_id = 'images');
create policy "images_auth_upload" on storage.objects for insert
  with check (bucket_id = 'images' and auth.role() = 'authenticated');
create policy "images_owner_delete" on storage.objects for delete
  using (bucket_id = 'images' and owner = auth.uid());
