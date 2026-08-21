-- Advertising and community partnership inquiries are not community listings.
-- Public forms write through a server-only service client; only admins can read/update.

create table if not exists public.partnership_inquiries (
  id uuid primary key default uuid_generate_v4(),
  inquiry_type text not null check (inquiry_type in ('advertiser', 'community_partner')),
  organization text not null,
  contact_name text not null,
  contact_email text not null,
  contact_phone text,
  website text,
  objective text not null default '',
  budget text,
  timeline text,
  audience text,
  community_size text,
  message text not null default '',
  status text not null default 'new' check (status in ('new', 'reviewing', 'approved', 'rejected', 'closed')),
  review_note text,
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists partnership_inquiries_status_created_idx
  on public.partnership_inquiries(status, created_at desc);
create index if not exists partnership_inquiries_email_created_idx
  on public.partnership_inquiries(lower(contact_email), created_at desc);

alter table public.partnership_inquiries enable row level security;

drop policy if exists "partnership_inquiries_admin_select" on public.partnership_inquiries;
create policy "partnership_inquiries_admin_select" on public.partnership_inquiries for select using (public.is_admin());
drop policy if exists "partnership_inquiries_admin_update" on public.partnership_inquiries;
create policy "partnership_inquiries_admin_update" on public.partnership_inquiries for update using (public.is_admin()) with check (public.is_admin());
drop policy if exists "partnership_inquiries_admin_delete" on public.partnership_inquiries;
create policy "partnership_inquiries_admin_delete" on public.partnership_inquiries for delete using (public.is_admin());

