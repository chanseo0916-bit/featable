-- Migration 56: board image attachments.
--
-- The service upload route owns Storage writes. It uploads an object to the
-- public board-images bucket and inserts a pending board_post_images row with
-- the authenticated uploader_id by using the service role. The authenticated
-- RPCs below then attach those pending rows atomically to a post.
--
-- Safe to re-run: schema objects, policies, triggers, and function grants are
-- recreated idempotently. Storage objects are never deleted by SQL; deleting
-- an attachment queues its path for a service-role cleanup worker.

begin;

-- --------------------------------------------------------------------------
-- Public board image bucket. Direct anon/authenticated writes are blocked by
-- restrictive storage policies below. The service-role upload route bypasses
-- RLS and remains the only writer.
-- --------------------------------------------------------------------------

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
) values (
  'board-images',
  'board-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update set
  name = excluded.name,
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

alter table storage.objects enable row level security;

drop policy if exists "board_images_public_read" on storage.objects;
create policy "board_images_public_read"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'board-images');

-- PostgreSQL RLS policies are permissive by default. These restrictive
-- policies make a future broad storage INSERT/UPDATE/DELETE policy unable to
-- open this bucket to the browser while preserving the existing images bucket
-- upload policy used elsewhere in Featable.
drop policy if exists "board_images_block_direct_insert" on storage.objects;
create policy "board_images_block_direct_insert"
  on storage.objects
  as restrictive
  for insert
  to anon, authenticated
  with check (bucket_id <> 'board-images');

drop policy if exists "board_images_block_direct_update" on storage.objects;
create policy "board_images_block_direct_update"
  on storage.objects
  as restrictive
  for update
  to anon, authenticated
  using (bucket_id <> 'board-images')
  with check (bucket_id <> 'board-images');

drop policy if exists "board_images_block_direct_delete" on storage.objects;
create policy "board_images_block_direct_delete"
  on storage.objects
  as restrictive
  for delete
  to anon, authenticated
  using (bucket_id <> 'board-images');

-- --------------------------------------------------------------------------
-- Attachment rows. A pending row has no post_id. The service upload route
-- creates it after Storage upload; an authenticated RPC attaches it to the
-- caller's post. The uploader UUID is intentionally absent from public grants.
-- --------------------------------------------------------------------------

create table if not exists public.board_post_images (
  id uuid primary key default uuid_generate_v4(),
  post_id uuid references public.board_posts(id) on delete cascade,
  uploader_id uuid not null references public.profiles(id) on delete cascade,
  storage_path text not null unique,
  mime_type text not null
    check (mime_type in ('image/jpeg', 'image/png', 'image/webp')),
  byte_size integer not null
    check (byte_size between 1 and 5242880),
  width integer
    check (width is null or width between 1 and 10000),
  height integer
    check (height is null or height between 1 and 10000),
  sort_order smallint not null default 0
    check (sort_order between 0 and 4),
  alt_text text not null default ''
    check (char_length(alt_text) <= 200),
  status text not null default 'pending'
    check (status in ('pending', 'attached')),
  created_at timestamptz not null default now(),
  attached_at timestamptz,
  check (
    (status = 'pending' and post_id is null and attached_at is null)
    or
    (status = 'attached' and post_id is not null and attached_at is not null)
  ),
  check (
    storage_path ~
    '^board/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}[.](jpg|png|webp)$'
  )
);

create index if not exists board_post_images_post_order_idx
  on public.board_post_images(post_id, sort_order, created_at)
  where status = 'attached';

create index if not exists board_post_images_uploader_pending_idx
  on public.board_post_images(uploader_id, created_at desc)
  where status = 'pending';

-- Keep the table private by default. Public pages receive only the selected
-- image metadata; uploader_id is usable by RLS but not queryable through REST.
alter table public.board_post_images enable row level security;
revoke all on public.board_post_images from public, anon, authenticated;

drop policy if exists "board_post_images_select_visible" on public.board_post_images;
create policy "board_post_images_select_visible"
  on public.board_post_images
  for select
  to anon, authenticated
  using (
    (
      status = 'attached'
      and post_id is not null
      and exists (
        select 1
        from public.board_posts p
        where p.id = board_post_images.post_id
          and p.status = 'published'
      )
    )
    or (
      status = 'pending'
      and post_id is null
      and uploader_id = auth.uid()
    )
    or (
      status = 'attached'
      and exists (
        select 1
        from public.board_posts p
        where p.id = board_post_images.post_id
          and p.author_id = auth.uid()
      )
    )
    or public.is_admin()
  );

grant select (
  id,
  post_id,
  storage_path,
  mime_type,
  byte_size,
  width,
  height,
  sort_order,
  alt_text,
  status,
  created_at,
  attached_at
)
  on public.board_post_images
  to anon, authenticated;

-- No INSERT/UPDATE/DELETE grant or permissive policy is exposed to anon or
-- authenticated. Pending rows and Storage objects are service-route writes;
-- the RPCs are the only authenticated mutation surface.

-- The upload route uses this service-role-only function after the Storage
-- object is written. The per-user advisory lock makes the pending quota
-- atomic even when a client sends many uploads concurrently.
create or replace function public.register_board_image_upload(
  p_uploader_id uuid,
  p_storage_path text,
  p_mime_type text,
  p_byte_size integer
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  new_image_id uuid;
  pending_count integer;
begin
  if p_uploader_id is null then
    raise exception 'board_image_uploader_required';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(p_uploader_id::text, 20260825)
  );

  select count(*)::integer
    into pending_count
  from public.board_post_images i
  where i.uploader_id = p_uploader_id
    and i.status = 'pending';

  if pending_count >= 20 then
    raise exception 'board_image_pending_limit';
  end if;

  insert into public.board_post_images (
    post_id,
    uploader_id,
    storage_path,
    mime_type,
    byte_size,
    status
  ) values (
    null,
    p_uploader_id,
    p_storage_path,
    p_mime_type,
    p_byte_size,
    'pending'
  )
  returning id into new_image_id;

  return new_image_id;
end;
$$;

revoke all on function public.register_board_image_upload(uuid, text, text, integer)
  from public, anon, authenticated;
grant execute on function public.register_board_image_upload(uuid, text, text, integer)
  to service_role;

-- --------------------------------------------------------------------------
-- Storage cleanup queue. ON DELETE CASCADE removes attachment rows but cannot
-- remove a Storage object, so every row deletion records its path for a
-- service-role worker to remove and mark processed.
-- --------------------------------------------------------------------------

create table if not exists public.board_image_cleanup_queue (
  id uuid primary key default uuid_generate_v4(),
  storage_path text not null unique,
  queued_at timestamptz not null default now(),
  processed_at timestamptz,
  attempts integer not null default 0
    check (attempts >= 0),
  last_attempt_at timestamptz,
  last_error text
);

alter table public.board_image_cleanup_queue enable row level security;
revoke all on public.board_image_cleanup_queue from public, anon, authenticated;

create or replace function public.queue_board_image_cleanup()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.board_image_cleanup_queue (storage_path)
  values (old.storage_path)
  on conflict (storage_path) do nothing;
  return old;
end;
$$;

drop trigger if exists board_post_images_queue_cleanup on public.board_post_images;
create trigger board_post_images_queue_cleanup
  after delete on public.board_post_images
  for each row execute function public.queue_board_image_cleanup();

revoke all on function public.queue_board_image_cleanup() from public, anon, authenticated;

-- --------------------------------------------------------------------------
-- Enforce the five-image limit under a parent-row lock so concurrent uploads
-- cannot race past an application-only count check.
-- --------------------------------------------------------------------------

create or replace function public.enforce_board_post_image_limit()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_count integer;
begin
  if new.status <> 'attached' or new.post_id is null then
    return new;
  end if;

  perform 1
  from public.board_posts p
  where p.id = new.post_id
  for update;

  if not found then
    raise exception 'board_post_not_found';
  end if;

  select count(*)::integer
    into current_count
  from public.board_post_images i
  where i.post_id = new.post_id
    and i.status = 'attached'
    and i.id is distinct from new.id;

  if current_count >= 5 then
    raise exception 'board_images_too_many';
  end if;

  return new;
end;
$$;

drop trigger if exists board_post_images_enforce_limit on public.board_post_images;
create trigger board_post_images_enforce_limit
  before insert or update of post_id, status on public.board_post_images
  for each row execute function public.enforce_board_post_image_limit();

revoke all on function public.enforce_board_post_image_limit() from public, anon, authenticated;

-- --------------------------------------------------------------------------
-- Create a published post and attach the caller's pending images atomically.
-- The service route must create pending rows first; this function never trusts
-- client-supplied uploader_id, Storage metadata, or display identity fields.
-- --------------------------------------------------------------------------

create or replace function public.create_board_post_with_images(
  p_category text,
  p_author_visibility text,
  p_title text,
  p_body text,
  p_image_ids uuid[]
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_user_id uuid := auth.uid();
  image_ids uuid[] := coalesce(p_image_ids, '{}'::uuid[]);
  image_count integer;
  new_post_id uuid;
begin
  if current_user_id is null then
    raise exception 'authentication_required';
  end if;

  if p_category is null or p_category not in ('free', 'question', 'feedback', 'team') then
    raise exception 'board_category_invalid';
  end if;

  if p_author_visibility is null or p_author_visibility not in ('anonymous', 'profile') then
    raise exception 'board_author_visibility_invalid';
  end if;

  if char_length(btrim(coalesce(p_title, ''))) not between 2 and 120 then
    raise exception 'board_title_invalid';
  end if;

  if char_length(btrim(coalesce(p_body, ''))) not between 1 and 10000 then
    raise exception 'board_body_invalid';
  end if;

  if exists (select 1 from unnest(image_ids) as item(image_id) where item.image_id is null) then
    raise exception 'board_images_invalid';
  end if;

  if cardinality(image_ids) > 5 then
    raise exception 'board_images_too_many';
  end if;

  if exists (
    select item.image_id
    from unnest(image_ids) as item(image_id)
    group by item.image_id
    having count(*) > 1
  ) then
    raise exception 'board_images_invalid';
  end if;

  -- Lock selected rows before validating and attaching them.
  perform 1
  from public.board_post_images i
  where i.id = any(image_ids)
  for update;

  select count(*)::integer
    into image_count
  from public.board_post_images i
  where i.id = any(image_ids)
    and i.status = 'pending'
    and i.post_id is null
    and i.uploader_id = current_user_id;

  if image_count <> cardinality(image_ids) then
    raise exception 'board_images_invalid';
  end if;

  insert into public.board_posts (
    author_id,
    author_visibility,
    category,
    title,
    body,
    status
  ) values (
    current_user_id,
    p_author_visibility,
    p_category,
    btrim(p_title),
    btrim(p_body),
    'published'
  )
  returning id into new_post_id;

  update public.board_post_images i
  set post_id = new_post_id,
      status = 'attached',
      attached_at = now(),
      sort_order = (selected.ord - 1)::smallint
  from (
    select item.image_id, item.ord
    from unnest(image_ids) with ordinality as item(image_id, ord)
  ) as selected
  where i.id = selected.image_id;

  return new_post_id;
end;
$$;

-- --------------------------------------------------------------------------
-- Update an owned post and replace its attached image set atomically.
-- removed_paths is returned so the service route can eagerly remove Storage
-- objects; the delete trigger also queues them for retry-safe cleanup.
-- --------------------------------------------------------------------------

create or replace function public.update_board_post_with_images(
  p_post_id uuid,
  p_category text,
  p_author_visibility text,
  p_title text,
  p_body text,
  p_image_ids uuid[]
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_user_id uuid := auth.uid();
  image_ids uuid[] := coalesce(p_image_ids, '{}'::uuid[]);
  image_count integer;
  locked_post_id uuid;
  removed_paths jsonb;
begin
  if current_user_id is null then
    raise exception 'authentication_required';
  end if;

  select p.id
    into locked_post_id
  from public.board_posts p
  where p.id = p_post_id
    and p.author_id = current_user_id
  for update;

  if not found then
    raise exception 'board_post_not_owned';
  end if;

  if p_category is null or p_category not in ('free', 'question', 'feedback', 'team') then
    raise exception 'board_category_invalid';
  end if;

  if p_author_visibility is null or p_author_visibility not in ('anonymous', 'profile') then
    raise exception 'board_author_visibility_invalid';
  end if;

  if char_length(btrim(coalesce(p_title, ''))) not between 2 and 120 then
    raise exception 'board_title_invalid';
  end if;

  if char_length(btrim(coalesce(p_body, ''))) not between 1 and 10000 then
    raise exception 'board_body_invalid';
  end if;

  if exists (select 1 from unnest(image_ids) as item(image_id) where item.image_id is null) then
    raise exception 'board_images_invalid';
  end if;

  if cardinality(image_ids) > 5 then
    raise exception 'board_images_too_many';
  end if;

  if exists (
    select item.image_id
    from unnest(image_ids) as item(image_id)
    group by item.image_id
    having count(*) > 1
  ) then
    raise exception 'board_images_invalid';
  end if;

  -- Lock selected rows before checking ownership or calculating removals.
  perform 1
  from public.board_post_images i
  where i.id = any(image_ids)
  for update;

  select count(*)::integer
    into image_count
  from public.board_post_images i
  where i.id = any(image_ids)
    and i.uploader_id = current_user_id
    and (
      (i.status = 'pending' and i.post_id is null)
      or (i.status = 'attached' and i.post_id = p_post_id)
    );

  if image_count <> cardinality(image_ids) then
    raise exception 'board_images_invalid';
  end if;

  select coalesce(
    jsonb_agg(i.storage_path order by i.sort_order, i.created_at),
    '[]'::jsonb
  )
    into removed_paths
  from public.board_post_images i
  where i.post_id = p_post_id
    and i.status = 'attached'
    and not (i.id = any(image_ids));

  delete from public.board_post_images i
  where i.post_id = p_post_id
    and i.status = 'attached'
    and not (i.id = any(image_ids));

  update public.board_posts
  set author_visibility = p_author_visibility,
      category = p_category,
      title = btrim(p_title),
      body = btrim(p_body)
  where id = p_post_id;

  update public.board_post_images i
  set post_id = p_post_id,
      status = 'attached',
      attached_at = coalesce(i.attached_at, now()),
      sort_order = (selected.ord - 1)::smallint
  from (
    select item.image_id, item.ord
    from unnest(image_ids) with ordinality as item(image_id, ord)
  ) as selected
  where i.id = selected.image_id;

  return jsonb_build_object(
    'post_id', p_post_id,
    'removed_paths', removed_paths
  );
end;
$$;

revoke all on function public.create_board_post_with_images(text, text, text, text, uuid[])
  from public, anon, authenticated;
grant execute on function public.create_board_post_with_images(text, text, text, text, uuid[])
  to authenticated;

revoke all on function public.update_board_post_with_images(uuid, text, text, text, text, uuid[])
  from public, anon, authenticated;
grant execute on function public.update_board_post_with_images(uuid, text, text, text, text, uuid[])
  to authenticated;

commit;
