-- 회원가입 프로필과 최초 OAuth 온보딩
-- Supabase Dashboard > SQL Editor에서 한 번 실행하세요.

begin;

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
    select 1
    from pg_constraint
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
  profile_name text := nullif(trim(coalesce(
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'name',
    ''
  )), '');
begin
  if requested_member_type not in ('founder', 'team', 'explorer', 'partner') then
    requested_member_type := null;
  end if;

  insert into public.profiles (
    id,
    email,
    role,
    full_name,
    member_type,
    terms_agreed_at,
    privacy_agreed_at,
    marketing_agreed_at,
    onboarding_completed_at
  )
  values (
    new.id,
    new.email,
    case
      when new.email in ('chanseo0916@gmail.com', 'dasarom4@gmail.com') then 'admin'
      else 'user'
    end,
    profile_name,
    requested_member_type,
    case when accepted_terms then now() end,
    case when accepted_privacy then now() end,
    case when accepted_marketing then now() end,
    case
      when profile_name is not null
        and requested_member_type is not null
        and accepted_terms
        and accepted_privacy
      then now()
    end
  );

  return new;
end;
$$;

commit;

