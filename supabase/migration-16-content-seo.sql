-- Run before deploying the matching application build.
alter table public.brands
  add column if not exists seo_title text,
  add column if not exists seo_description text,
  add column if not exists primary_keyword text,
  add column if not exists secondary_keywords text[] not null default '{}',
  add column if not exists og_image_url text,
  add column if not exists is_indexable boolean not null default false,
  add column if not exists published_at timestamptz;

alter table public.products
  add column if not exists seo_title text,
  add column if not exists seo_description text,
  add column if not exists primary_keyword text,
  add column if not exists secondary_keywords text[] not null default '{}',
  add column if not exists og_image_url text,
  add column if not exists is_indexable boolean not null default false,
  add column if not exists published_at timestamptz;

alter table public.features
  add column if not exists seo_title text,
  add column if not exists seo_description text,
  add column if not exists primary_keyword text,
  add column if not exists secondary_keywords text[] not null default '{}',
  add column if not exists og_image_url text,
  add column if not exists is_indexable boolean not null default false;

update public.brands set
  seo_title = coalesce(nullif(seo_title, ''), name),
  seo_description = coalesce(nullif(seo_description, ''), left(regexp_replace(coalesce(nullif(description, ''), tagline), '\s+', ' ', 'g'), 155)),
  primary_keyword = coalesce(nullif(primary_keyword, ''), name),
  og_image_url = coalesce(nullif(og_image_url, ''), cover_url, logo_url),
  is_indexable = (status = 'published'),
  published_at = case when status = 'published' then coalesce(published_at, created_at) else published_at end;

update public.products set
  seo_title = coalesce(nullif(seo_title, ''), name),
  seo_description = coalesce(nullif(seo_description, ''), left(regexp_replace(coalesce(nullif(tagline, ''), solution, problem), '\s+', ' ', 'g'), 155)),
  primary_keyword = coalesce(nullif(primary_keyword, ''), name),
  og_image_url = coalesce(nullif(og_image_url, ''), hero_url),
  is_indexable = (status = 'published'),
  published_at = case when status = 'published' then coalesce(published_at, created_at) else published_at end;

update public.features set
  seo_title = coalesce(nullif(seo_title, ''), title),
  seo_description = coalesce(nullif(seo_description, ''), left(regexp_replace(excerpt, '\s+', ' ', 'g'), 155)),
  primary_keyword = coalesce(nullif(primary_keyword, ''), title),
  og_image_url = coalesce(nullif(og_image_url, ''), cover_url),
  is_indexable = (status = 'published');

create index if not exists brands_public_seo_idx on public.brands (updated_at desc) where status = 'published' and is_indexable;
create index if not exists products_public_seo_idx on public.products (updated_at desc) where status = 'published' and is_indexable;
create index if not exists features_public_seo_idx on public.features (updated_at desc) where status = 'published' and is_indexable;
