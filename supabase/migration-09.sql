-- 한 사용자가 여러 브랜드 초안을 동시에 관리할 수 있도록 초안 키를 분리한다.

alter table public.submission_drafts
  add column if not exists draft_key text;

update public.submission_drafts
set draft_key = id::text
where draft_key is null;

alter table public.submission_drafts
  alter column draft_key set default uuid_generate_v4()::text,
  alter column draft_key set not null;

alter table public.submission_drafts
  drop constraint if exists submission_drafts_user_id_key;

alter table public.submission_drafts
  add constraint submission_drafts_user_id_draft_key_key unique (user_id, draft_key);

create index if not exists submission_drafts_user_updated_idx
  on public.submission_drafts(user_id, updated_at desc);
