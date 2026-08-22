begin;

alter table public.events
  add column if not exists is_paid boolean not null default false,
  add column if not exists payment_account text,
  add column if not exists payment_notice text;

commit;
