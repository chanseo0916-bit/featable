begin;

alter table public.profiles
  add column if not exists notification_email text;

alter table public.profiles
  drop constraint if exists profiles_notification_email_check;
alter table public.profiles
  add constraint profiles_notification_email_check
  check (
    notification_email is null
    or (
      char_length(notification_email) between 3 and 254
      and position('@' in notification_email) > 1
    )
  );

grant update (notification_email) on table public.profiles to authenticated;

-- Preferred operations inbox for this organizer account. Login email remains unchanged.
update public.profiles
set notification_email = 'chanseo0916@gmail.com'
where lower(email) = 'lcs7317@naver.com';

commit;
