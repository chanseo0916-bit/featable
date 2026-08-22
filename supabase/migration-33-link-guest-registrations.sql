begin;

-- 게스트로 신청한 사람이 나중에 같은 이메일로 로그인하면 자기 신청 내역을 볼 수 있게 한다.
-- 지금까지는 user_id 로만 매칭해서, 신청 폼의 "로그인하면 신청 내역을 한곳에서 볼 수 있어요"
-- 안내가 실제로는 지켜지지 않았다.
--
-- 안전장치:
--   * 게스트 행(user_id is null)에만 적용한다.
--   * 이메일 인증을 마친 행(email_verified_at is not null)만 연결한다.
--   * 비교 대상은 Supabase가 발급한 JWT의 email 클레임이라 사용자가 위조할 수 없다.
drop policy if exists "event_registrations_select_related" on public.event_registrations;
create policy "event_registrations_select_related" on public.event_registrations for select
  using (
    user_id = auth.uid()
    or public.can_manage_event(event_id)
    or (
      user_id is null
      and email_verified_at is not null
      and lower(applicant_email) = lower(nullif(auth.jwt() ->> 'email', ''))
    )
  );

-- 이메일 매칭이 대소문자/공백 때문에 어긋나지 않도록 저장 시점에 정규화한다.
-- (게스트 RPC는 이미 소문자로 넣지만, 회원 신청 경로와 향후 수정까지 일관되게 맞춘다.)
create or replace function public.normalize_registration_email()
returns trigger
language plpgsql
as $$
begin
  new.applicant_email := lower(trim(new.applicant_email));
  return new;
end;
$$;

drop trigger if exists event_registrations_normalize_email on public.event_registrations;
create trigger event_registrations_normalize_email
  before insert or update of applicant_email on public.event_registrations
  for each row execute function public.normalize_registration_email();

update public.event_registrations
set applicant_email = lower(trim(applicant_email))
where applicant_email <> lower(trim(applicant_email));

commit;
