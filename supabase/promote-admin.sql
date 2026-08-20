-- ============================================================
-- 관리자 자동 지정 설정
-- Supabase 대시보드 > SQL Editor에 전체 붙여넣고 Run (한 번만)
-- 아래 이메일로 가입(구글 로그인 포함)하면 자동으로 admin이 된다.
-- ============================================================

-- 1) 가입 트리거 교체: 관리자 이메일 허용 목록 포함
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
    id, email, role, full_name, member_type,
    terms_agreed_at, privacy_agreed_at, marketing_agreed_at,
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
    case when profile_name is not null and requested_member_type is not null and accepted_terms and accepted_privacy then now() end
  );
  return new;
end;
$$;

-- 2) 이미 가입돼 있다면 즉시 승격
update profiles
set role = 'admin'
where email in ('chanseo0916@gmail.com', 'dasarom4@gmail.com');

-- 확인
select id, email, role from profiles where role = 'admin';
