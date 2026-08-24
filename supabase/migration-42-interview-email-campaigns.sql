begin;

create table if not exists public.interview_email_campaigns (
  id uuid primary key default uuid_generate_v4(),
  feature_id uuid not null unique references public.features(id) on delete cascade,
  status text not null default 'draft' check (status in ('draft','queued','sending','completed','failed')),
  recipient_count integer not null default 0,
  sent_count integer not null default 0,
  failed_count integer not null default 0,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.interview_email_deliveries (
  id uuid primary key default uuid_generate_v4(),
  campaign_id uuid not null references public.interview_email_campaigns(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  email text not null,
  display_name text,
  status text not null default 'queued' check (status in ('queued','sending','sent','failed','skipped')),
  provider_message_id text,
  error text,
  sent_at timestamptz,
  clicked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (campaign_id, user_id)
);

create index if not exists interview_campaign_status_idx on public.interview_email_campaigns(status, created_at);
create index if not exists interview_delivery_status_idx on public.interview_email_deliveries(status, created_at);
create index if not exists interview_delivery_campaign_idx on public.interview_email_deliveries(campaign_id, status);

alter table public.interview_email_campaigns enable row level security;
alter table public.interview_email_deliveries enable row level security;

drop policy if exists "interview_campaign_admin_select" on public.interview_email_campaigns;
create policy "interview_campaign_admin_select" on public.interview_email_campaigns for select using (public.is_admin());
drop policy if exists "interview_delivery_admin_select" on public.interview_email_deliveries;
create policy "interview_delivery_admin_select" on public.interview_email_deliveries for select using (public.is_admin());

commit;
