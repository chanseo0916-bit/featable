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
  signup_notified_at timestamptz,
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
  founder_number integer unique,
  user_id uuid not null references profiles(id) on delete cascade,
  slug text not null unique,
  name text not null,
  avatar_url text,
  role_title text not null default '',
  headline text not null default '',
  bio text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id)  -- MVP: 계정당 Founder 프로필 1개
);

create or replace function assign_founder_number()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  account_email text;
  candidate integer;
  attempts integer := 0;
begin
  perform pg_advisory_xact_lock(hashtext('featable_founder_number_assignment'));

  select lower(email) into account_email
  from auth.users
  where id = new.user_id;

  if account_email = 'chanseo0916@gmail.com' then
    new.founder_number := 1;
    return new;
  end if;

  if account_email = 'dasarom4@gmail.com' then
    new.founder_number := 2;
    return new;
  end if;

  loop
    candidate := floor(random() * 9997)::integer + 3;
    exit when not exists (select 1 from founders where founder_number = candidate);
    attempts := attempts + 1;
    if attempts >= 10000 then
      raise exception 'No available Founder IDs remain';
    end if;
  end loop;

  new.founder_number := candidate;
  return new;
end;
$$;

create trigger assign_founder_number_before_insert
  before insert on founders
  for each row execute function assign_founder_number();

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
  seo_title text,
  seo_description text,
  primary_keyword text,
  secondary_keywords text[] not null default '{}',
  og_image_url text,
  is_indexable boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table brand_members (
  brand_id uuid not null references brands(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  member_role text not null default 'editor' check (member_role in ('editor', 'viewer')),
  invited_by uuid references profiles(id) on delete set null,
  display_name text default '팀 멤버',
  title text not null default '팀 멤버',
  bio text,
  avatar_url text,
  is_public boolean not null default true,
  sort_order integer not null default 100,
  joined_at timestamptz not null default now(),
  primary key (brand_id, user_id)
);

create table brand_invitations (
  id uuid primary key default uuid_generate_v4(),
  brand_id uuid not null references brands(id) on delete cascade,
  email text not null,
  token uuid not null default uuid_generate_v4() unique,
  member_role text not null default 'editor' check (member_role in ('editor', 'viewer')),
  invited_by uuid not null references profiles(id) on delete cascade,
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz,
  accepted_by uuid references profiles(id) on delete set null,
  invitee_user_id uuid references profiles(id) on delete cascade,
  declined_at timestamptz,
  created_at timestamptz not null default now()
);

create table notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  actor_id uuid references profiles(id) on delete set null,
  brand_id uuid references brands(id) on delete cascade,
  invitation_id uuid references brand_invitations(id) on delete cascade,
  type text not null check (type in ('team_invite', 'system')),
  title text not null,
  message text not null default '',
  href text,
  data jsonb not null default '{}',
  read_at timestamptz,
  resolved_at timestamptz,
  action_status text check (action_status in ('accepted', 'declined')),
  created_at timestamptz not null default now()
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
  seo_title text,
  seo_description text,
  primary_keyword text,
  secondary_keywords text[] not null default '{}',
  og_image_url text,
  is_indexable boolean not null default false,
  published_at timestamptz,
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
  seo_title text,
  seo_description text,
  primary_keyword text,
  secondary_keywords text[] not null default '{}',
  og_image_url text,
  is_indexable boolean not null default false,
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
  description text not null default '',
  gallery_urls text[] not null default '{}',
  program jsonb not null default '[]'::jsonb check (jsonb_typeof(program) = 'array'),
  registration_fields jsonb not null default '[]'::jsonb check (jsonb_typeof(registration_fields) = 'array'),
  host text not null default '',
  starts_at timestamptz not null,
  ends_at timestamptz,
  location text not null default '',
  is_online boolean not null default false,
  fee text,
  is_paid boolean not null default false,
  payment_account text,
  payment_notice text,
  deadline timestamptz,
  category text not null default '기타',
  audience text,
  apply_url text,
  community_id uuid,
  brand_id uuid references brands(id) on delete set null,
  submitted_by uuid references profiles(id) on delete set null,
  registration_mode text not null default 'external' check (registration_mode in ('external', 'internal', 'closed')),
  approval_mode text not null default 'instant' check (approval_mode in ('instant', 'manual')),
  capacity integer check (capacity is null or capacity > 0),
  waitlist_enabled boolean not null default true,
  status content_status not null default 'published',
  is_featured boolean not null default false,
  created_at timestamptz not null default now(),
  check (registration_mode <> 'external' or nullif(trim(apply_url), '') is not null)
);

create table event_registrations (
  id uuid primary key default uuid_generate_v4(),
  event_id uuid not null references events(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  status text not null check (status in ('verification_pending', 'pending', 'confirmed', 'waitlisted', 'rejected', 'cancelled')),
  applicant_name text not null check (char_length(applicant_name) between 2 and 60),
  applicant_email text not null check (char_length(applicant_email) between 3 and 254),
  note text check (note is null or char_length(note) <= 500),
  consented_at timestamptz not null,
  applied_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references profiles(id) on delete set null,
  cancelled_at timestamptz,
  guest_token_hash text,
  guest_token_expires_at timestamptz,
  email_verified_at timestamptz,
  verification_requested_at timestamptz,
  consent_version text not null default '2026-08-21',
  check ((user_id is not null and guest_token_hash is null) or (user_id is null and guest_token_hash is not null)),
  unique (event_id, user_id)
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

-- ---------- Partner self-serve submission queue ----------
create table partner_submissions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  submission_type text not null check (submission_type in ('event', 'support', 'community')),
  status text not null default 'draft' check (status in ('draft', 'submitted', 'in_review', 'approved', 'rejected')),
  title text not null default '',
  payload jsonb not null default '{}',
  review_note text,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by uuid references profiles(id) on delete set null,
  published_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
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
  owner_user_id uuid references profiles(id) on delete set null,
  name text not null,
  logo_url text not null,
  href text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- ---------- Partnership inquiries (advertisers / community partners) ----------
create table partnership_inquiries (
  id uuid primary key default uuid_generate_v4(),
  applicant_user_id uuid references profiles(id) on delete set null,
  inquiry_type text not null check (inquiry_type in ('advertiser', 'community_partner')),
  organization text not null,
  contact_name text not null,
  contact_email text not null,
  contact_phone text,
  website text,
  objective text not null default '',
  budget text,
  timeline text,
  audience text,
  community_size text,
  message text not null default '',
  status text not null default 'new' check (status in ('new', 'reviewing', 'approved', 'rejected', 'closed')),
  review_note text,
  reviewed_at timestamptz,
  reviewed_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table publishing_invitations (
  id uuid primary key default uuid_generate_v4(),
  inquiry_id uuid not null unique references partnership_inquiries(id) on delete cascade,
  token uuid not null default uuid_generate_v4() unique,
  registration_type text not null check (registration_type in ('partner', 'community')),
  invitee_email text not null,
  user_id uuid references profiles(id) on delete set null,
  notification_id uuid references notifications(id) on delete set null,
  draft_payload jsonb not null default '{}',
  status text not null default 'pending' check (status in ('pending', 'editing', 'published', 'expired')),
  entity_id uuid,
  expires_at timestamptz not null default (now() + interval '30 days'),
  claimed_at timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
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
create index partner_submissions_user_updated_idx on partner_submissions(user_id, updated_at desc);
create index partner_submissions_status_created_idx on partner_submissions(status, created_at asc);
create index partnership_inquiries_status_created_idx on partnership_inquiries(status, created_at desc);
create index partnership_inquiries_email_created_idx on partnership_inquiries(lower(contact_email), created_at desc);
create index publishing_invitations_user_status_idx on publishing_invitations(user_id, status, created_at desc);
create index publishing_invitations_email_status_idx on publishing_invitations(lower(invitee_email), status, created_at desc);
create index partners_owner_idx on partners(owner_user_id, created_at desc);
create index event_registrations_event_status_idx on event_registrations(event_id, status, applied_at);
create index event_registrations_user_idx on event_registrations(user_id, applied_at desc);
create unique index event_registrations_event_email_unique on event_registrations(event_id, lower(applicant_email));
create unique index event_registrations_guest_token_unique on event_registrations(guest_token_hash) where guest_token_hash is not null;
create index idx_founder_supports_founder on founder_supports(founder_id);
create index brand_members_user_idx on brand_members(user_id);
create index brand_invitations_brand_idx on brand_invitations(brand_id, created_at desc);
create index brand_invitations_email_idx on brand_invitations(lower(email));
create index brand_invitations_invitee_idx on brand_invitations(invitee_user_id, created_at desc);
create index notifications_user_created_idx on notifications(user_id, created_at desc);
create index notifications_user_unread_idx on notifications(user_id, created_at desc) where read_at is null;
create unique index notifications_pending_invite_unique on notifications(user_id, invitation_id) where invitation_id is not null;

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

create or replace function is_brand_owner(p_brand_id uuid)
returns boolean language sql security definer set search_path = public stable as $$
  select exists (
    select 1 from brands b join founders f on f.id = b.founder_id
    where b.id = p_brand_id and f.user_id = auth.uid()
  );
$$;

create or replace function owns_brand(b_id uuid)
returns boolean language sql security definer set search_path = public stable as $$
  select is_brand_owner(b_id) or exists (
    select 1 from brand_members
    where brand_id = b_id and user_id = auth.uid() and member_role = 'editor'
  );
$$;

create or replace function can_manage_event(target_event_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from events e
    where e.id = target_event_id and (e.submitted_by = auth.uid() or is_admin())
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
    and (public.owns_brand(id) or public.is_admin());

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

create or replace function public.accept_brand_invitation(p_token uuid)
returns table (brand_slug text, brand_name text)
language plpgsql security definer set search_path = public as $$
declare
  invite public.brand_invitations%rowtype;
  current_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  select * into invite from public.brand_invitations
    where token = p_token and accepted_at is null and declined_at is null and expires_at > now()
      and (invitee_user_id = auth.uid() or lower(email) = current_email)
    for update;
  if not found then raise exception 'invalid or expired invitation'; end if;
  insert into public.brand_members (brand_id, user_id, member_role, invited_by)
    values (invite.brand_id, auth.uid(), invite.member_role, invite.invited_by)
    on conflict (brand_id, user_id) do update set member_role = excluded.member_role;
  update public.brand_invitations set accepted_at = now(), accepted_by = auth.uid() where id = invite.id;
  update public.notifications set read_at = coalesce(read_at, now()), resolved_at = now(), action_status = 'accepted'
    where user_id = auth.uid() and invitation_id = invite.id;
  return query select b.slug, b.name from public.brands b where b.id = invite.brand_id;
end;
$$;

revoke execute on function public.accept_brand_invitation(uuid) from public, anon;
grant execute on function public.accept_brand_invitation(uuid) to authenticated;

create or replace function public.search_brand_invite_candidates(p_brand_id uuid, p_query text)
returns table (user_id uuid, display_name text, avatar_url text, headline text, member_type text)
language sql security definer set search_path = public stable as $$
  select p.id, coalesce(nullif(trim(p.full_name), ''), nullif(trim(f.name), ''), 'Featable 멤버'),
    f.avatar_url, nullif(trim(f.headline), ''), p.member_type
  from public.profiles p
  left join public.founders f on f.user_id = p.id
  where auth.uid() is not null and public.is_brand_owner(p_brand_id)
    and length(trim(coalesce(p_query, ''))) >= 2 and p.id <> auth.uid()
    and p.onboarding_completed_at is not null
    and not exists (select 1 from public.brand_members bm where bm.brand_id = p_brand_id and bm.user_id = p.id)
    and (p.full_name ilike '%' || trim(p_query) || '%' or f.name ilike '%' || trim(p_query) || '%' or f.headline ilike '%' || trim(p_query) || '%')
  order by case when lower(coalesce(p.full_name, f.name, '')) = lower(trim(p_query)) then 0 else 1 end,
    coalesce(p.full_name, f.name)
  limit 8;
$$;
revoke execute on function public.search_brand_invite_candidates(uuid, text) from public, anon;
grant execute on function public.search_brand_invite_candidates(uuid, text) to authenticated;

create or replace function public.create_in_app_brand_invitation(p_brand_id uuid, p_invitee_user_id uuid, p_member_role text default 'editor')
returns uuid language plpgsql security definer set search_path = public as $$
declare invite_id uuid; invitee_email text; brand_name text;
begin
  if auth.uid() is null or not public.is_brand_owner(p_brand_id) then raise exception 'brand owner required'; end if;
  if p_member_role not in ('editor', 'viewer') then raise exception 'invalid member role'; end if;
  if p_invitee_user_id = auth.uid() then raise exception 'cannot invite yourself'; end if;
  if exists (select 1 from public.brand_members where brand_id = p_brand_id and user_id = p_invitee_user_id) then raise exception 'already a team member'; end if;
  select email into invitee_email from public.profiles where id = p_invitee_user_id;
  select name into brand_name from public.brands where id = p_brand_id;
  if invitee_email is null or brand_name is null then raise exception 'account not found'; end if;
  delete from public.brand_invitations where brand_id = p_brand_id and invitee_user_id = p_invitee_user_id and accepted_at is null;
  insert into public.brand_invitations (brand_id, email, invitee_user_id, member_role, invited_by)
    values (p_brand_id, lower(invitee_email), p_invitee_user_id, p_member_role, auth.uid()) returning id into invite_id;
  insert into public.notifications (user_id, actor_id, brand_id, invitation_id, type, title, message, href, data)
    values (p_invitee_user_id, auth.uid(), p_brand_id, invite_id, 'team_invite', brand_name || ' 팀 초대',
      case when p_member_role = 'editor' then '브랜드와 프로덕트를 함께 관리할 수 있어요.' else '브랜드 워크스페이스를 볼 수 있어요.' end,
      '/my', jsonb_build_object('brand_name', brand_name, 'member_role', p_member_role));
  return invite_id;
end;
$$;
revoke execute on function public.create_in_app_brand_invitation(uuid, uuid, text) from public, anon;
grant execute on function public.create_in_app_brand_invitation(uuid, uuid, text) to authenticated;

create or replace function public.respond_to_brand_invitation(p_invitation_id uuid, p_accept boolean)
returns text language plpgsql security definer set search_path = public as $$
declare invite public.brand_invitations%rowtype; current_email text := lower(coalesce(auth.jwt() ->> 'email', '')); result_slug text;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  select * into invite from public.brand_invitations where id = p_invitation_id and accepted_at is null and declined_at is null
    and expires_at > now() and (invitee_user_id = auth.uid() or lower(email) = current_email) for update;
  if not found then raise exception 'invalid or expired invitation'; end if;
  if p_accept then
    insert into public.brand_members (brand_id, user_id, member_role, invited_by)
      values (invite.brand_id, auth.uid(), invite.member_role, invite.invited_by)
      on conflict (brand_id, user_id) do update set member_role = excluded.member_role;
    update public.brand_invitations set accepted_at = now(), accepted_by = auth.uid() where id = invite.id;
  else
    update public.brand_invitations set declined_at = now() where id = invite.id;
  end if;
  update public.notifications set read_at = coalesce(read_at, now()), resolved_at = now(),
    action_status = case when p_accept then 'accepted' else 'declined' end
    where user_id = auth.uid() and invitation_id = invite.id;
  select slug into result_slug from public.brands where id = invite.brand_id;
  return result_slug;
end;
$$;
revoke execute on function public.respond_to_brand_invitation(uuid, boolean) from public, anon;
grant execute on function public.respond_to_brand_invitation(uuid, boolean) to authenticated;

create or replace function public.mark_my_notifications_read()
returns integer language plpgsql security invoker set search_path = public as $$
declare changed_count integer;
begin
  update public.notifications set read_at = now() where user_id = auth.uid() and read_at is null;
  get diagnostics changed_count = row_count;
  return changed_count;
end;
$$;
revoke execute on function public.mark_my_notifications_read() from public, anon;
grant execute on function public.mark_my_notifications_read() to authenticated;

create or replace function public.get_public_brand_team(p_brand_slug text)
returns table (
  member_key text,
  display_name text,
  title text,
  bio text,
  avatar_url text,
  sort_order integer
)
language sql security definer set search_path = public stable as $$
  select
    bm.brand_id::text || ':' || bm.user_id::text,
    coalesce(nullif(trim(bm.display_name), ''), '팀 멤버'),
    coalesce(nullif(trim(bm.title), ''), '팀 멤버'),
    bm.bio,
    bm.avatar_url,
    bm.sort_order
  from public.brand_members bm
  join public.brands b on b.id = bm.brand_id
  where b.slug = p_brand_slug and b.status = 'published' and bm.is_public = true
  order by bm.sort_order asc, bm.joined_at asc;
$$;

revoke execute on function public.get_public_brand_team(text) from public;
grant execute on function public.get_public_brand_team(text) to anon, authenticated;

create or replace function public.update_my_brand_team_profile(
  p_brand_id uuid,
  p_display_name text,
  p_title text,
  p_bio text,
  p_avatar_url text,
  p_is_public boolean
)
returns boolean
language plpgsql security definer set search_path = public as $$
declare
  changed_count integer;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if nullif(trim(p_display_name), '') is null or nullif(trim(p_title), '') is null then
    raise exception 'display name and title are required';
  end if;
  update public.brand_members
  set display_name = trim(p_display_name),
      title = trim(p_title),
      bio = nullif(trim(coalesce(p_bio, '')), ''),
      avatar_url = nullif(trim(coalesce(p_avatar_url, '')), ''),
      is_public = p_is_public
  where brand_id = p_brand_id and user_id = auth.uid();
  get diagnostics changed_count = row_count;
  return changed_count = 1;
end;
$$;

revoke execute on function public.update_my_brand_team_profile(uuid, text, text, text, text, boolean) from public, anon;
grant execute on function public.update_my_brand_team_profile(uuid, text, text, text, text, boolean) to authenticated;

alter table profiles enable row level security;
alter table founders enable row level security;
alter table founder_supports enable row level security;
alter table saved_items enable row level security;
alter table brand_members enable row level security;
alter table brand_invitations enable row level security;
alter table notifications enable row level security;
alter table brands enable row level security;
alter table products enable row level security;
alter table features enable row level security;
alter table mentor_notes enable row level security;
alter table events enable row level security;
alter table event_registrations enable row level security;
alter table support_programs enable row level security;
alter table communities enable row level security;
alter table partner_submissions enable row level security;
alter table jobs enable row level security;
alter table partners enable row level security;
alter table partnership_inquiries enable row level security;
alter table publishing_invitations enable row level security;
alter table community_founders enable row level security;
alter table community_brands enable row level security;

-- profiles: 본인만 조회/수정, admin 전체
create policy "profiles_select_own" on profiles for select using (id = auth.uid() or is_admin());
create policy "profiles_update_own" on profiles for update using (id = auth.uid());
revoke update on table profiles from authenticated;
grant update (full_name, member_type, terms_agreed_at, privacy_agreed_at, marketing_agreed_at, onboarding_completed_at) on table profiles to authenticated;

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

create policy "brand_members_select_related" on brand_members for select
  using (user_id = auth.uid() or is_brand_owner(brand_id) or is_admin());
create policy "brand_members_delete_owner" on brand_members for delete
  using (user_id = auth.uid() or is_brand_owner(brand_id) or is_admin());
create policy "brand_members_update_related" on brand_members for update
  using (is_brand_owner(brand_id) or is_admin())
  with check (is_brand_owner(brand_id) or is_admin());
create policy "brand_invitations_select_related" on brand_invitations for select
  using (is_brand_owner(brand_id) or is_admin() or invitee_user_id = auth.uid() or lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));
create policy "brand_invitations_insert_owner" on brand_invitations for insert
  with check (is_brand_owner(brand_id) and invited_by = auth.uid());
create policy "brand_invitations_delete_owner" on brand_invitations for delete
  using (is_brand_owner(brand_id) or is_admin());
create policy "notifications_select_own" on notifications for select using (user_id = auth.uid());
create policy "notifications_update_own" on notifications for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "notifications_delete_own" on notifications for delete using (user_id = auth.uid());

-- brands: published 공개, 소유자는 draft 포함 전체
create policy "brands_select_published" on brands for select
  using (status = 'published' or owns_brand(id) or is_admin());
create policy "brands_insert_own" on brands for insert with check (owns_founder(founder_id));
create policy "brands_update_own" on brands for update using (owns_brand(id) or is_admin());
create policy "brands_delete_own" on brands for delete using (is_brand_owner(id) or is_admin());

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
create policy "event_registrations_select_related" on event_registrations for select
  using (user_id = auth.uid() or can_manage_event(event_id));

create policy "support_select" on support_programs for select using (status = 'published' or is_admin());
create policy "support_write" on support_programs for all using (is_admin()) with check (is_admin());

create policy "communities_select" on communities for select using (status = 'published' or manager_user_id = auth.uid() or is_admin());
create policy "communities_write" on communities for all
  using (manager_user_id = auth.uid() or is_admin())
  with check (manager_user_id = auth.uid() or is_admin());

create policy "partner_submissions_select" on partner_submissions for select
  using (user_id = auth.uid() or is_admin());
create policy "partner_submissions_insert" on partner_submissions for insert
  with check (
    user_id = auth.uid()
    and (
      submission_type = 'event'
      or exists (select 1 from profiles where id = auth.uid() and member_type = 'partner')
    )
  );
create policy "partner_submissions_update" on partner_submissions for update
  using ((user_id = auth.uid() and status in ('draft', 'rejected')) or is_admin())
  with check ((user_id = auth.uid() and status in ('draft', 'submitted')) or is_admin());
create policy "partner_submissions_delete" on partner_submissions for delete
  using ((user_id = auth.uid() and status in ('draft', 'rejected')) or is_admin());

create policy "jobs_select" on jobs for select using (status = 'published' or owns_brand(brand_id) or is_admin());
create policy "jobs_write" on jobs for all using (owns_brand(brand_id) or is_admin()) with check (owns_brand(brand_id) or is_admin());

create policy "partners_select" on partners for select using (true);
create policy "partners_write" on partners for all using (is_admin()) with check (is_admin());

create policy "partnership_inquiries_admin_select" on partnership_inquiries for select using (is_admin());
create policy "partnership_inquiries_admin_update" on partnership_inquiries for update using (is_admin()) with check (is_admin());
create policy "partnership_inquiries_admin_delete" on partnership_inquiries for delete using (is_admin());
create policy "publishing_invitations_select_own" on publishing_invitations for select using (user_id = auth.uid() or is_admin());
create policy "publishing_invitations_admin_write" on publishing_invitations for all using (is_admin()) with check (is_admin());

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
