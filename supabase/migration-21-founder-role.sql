-- Store a Founder's public role separately from their one-line introduction.
-- Kept as free text so the UI can support a custom "기타" role without future migrations.

alter table public.founders
  add column if not exists role_title text not null default '';

comment on column public.founders.role_title is
  'Public role shown on Founder and team profile cards, including custom user-entered roles.';
