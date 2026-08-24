-- Migration 47 — align the legacy jobs constraint with the self-serve job editor.
begin;

alter table public.jobs
  drop constraint if exists jobs_type_check;

alter table public.jobs
  add constraint jobs_type_check
  check (type in ('정규직', '계약직', '인턴', '파트타임'));

commit;
