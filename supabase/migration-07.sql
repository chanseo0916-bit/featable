-- 조회수와 공개 상태처럼 여러 요청이 겹칠 수 있는 갱신을 원자적으로 처리한다.

create or replace function public.increment_product_view_count(p_slug text)
returns integer
language sql
security definer
set search_path = public
as $$
  update public.products
  set view_count = view_count + 1
  where slug = p_slug
    and status = 'published'
  returning view_count;
$$;

revoke execute on function public.increment_product_view_count(text) from public, anon, authenticated;
grant execute on function public.increment_product_view_count(text) to service_role;

create or replace function public.set_brand_publication_state(
  p_brand_id uuid,
  p_publish boolean
)
returns boolean
language plpgsql
security invoker
set search_path = public
as $$
declare
  next_status public.content_status := case when p_publish then 'published' else 'draft' end;
  changed_count integer;
begin
  update public.brands
  set status = next_status,
      updated_at = now()
  where id = p_brand_id
    and (public.owns_founder(founder_id) or public.is_admin());

  get diagnostics changed_count = row_count;
  if changed_count = 0 then
    return false;
  end if;

  update public.products
  set status = next_status,
      updated_at = now()
  where brand_id = p_brand_id;

  return true;
end;
$$;

revoke execute on function public.set_brand_publication_state(uuid, boolean) from public, anon;
grant execute on function public.set_brand_publication_state(uuid, boolean) to authenticated;
