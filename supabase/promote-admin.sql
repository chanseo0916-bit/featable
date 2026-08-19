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
begin
  insert into public.profiles (id, email, role)
  values (
    new.id,
    new.email,
    case
      when new.email in ('chanseo0916@gmail.com', 'dasarom4@gmail.com') then 'admin'
      else 'user'
    end
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
