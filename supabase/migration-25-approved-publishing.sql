-- Approved partner/community inquiries become one-time self-publishing invitations.
alter table public.partnership_inquiries
  add column if not exists applicant_user_id uuid references public.profiles(id) on delete set null;

alter table public.partners
  add column if not exists owner_user_id uuid references public.profiles(id) on delete set null;

alter table public.partner_submissions
  add column if not exists published_path text;

create table if not exists public.publishing_invitations (
  id uuid primary key default uuid_generate_v4(),
  inquiry_id uuid not null unique references public.partnership_inquiries(id) on delete cascade,
  token uuid not null default uuid_generate_v4() unique,
  registration_type text not null check (registration_type in ('partner', 'community')),
  invitee_email text not null,
  user_id uuid references public.profiles(id) on delete set null,
  notification_id uuid references public.notifications(id) on delete set null,
  draft_payload jsonb not null default '{}',
  status text not null default 'pending' check (status in ('pending', 'editing', 'published', 'expired')),
  entity_id uuid,
  expires_at timestamptz not null default (now() + interval '30 days'),
  claimed_at timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists publishing_invitations_user_status_idx
  on public.publishing_invitations(user_id, status, created_at desc);
create index if not exists publishing_invitations_email_status_idx
  on public.publishing_invitations(lower(invitee_email), status, created_at desc);
create index if not exists partners_owner_idx
  on public.partners(owner_user_id, created_at desc);

alter table public.publishing_invitations enable row level security;
drop policy if exists "publishing_invitations_select_own" on public.publishing_invitations;
create policy "publishing_invitations_select_own" on public.publishing_invitations for select
  using (user_id = auth.uid() or public.is_admin());
drop policy if exists "publishing_invitations_admin_write" on public.publishing_invitations;
create policy "publishing_invitations_admin_write" on public.publishing_invitations for all
  using (public.is_admin()) with check (public.is_admin());
