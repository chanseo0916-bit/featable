begin;

-- saved_items 는 본인 행만 읽을 수 있어(user_id = auth.uid()) 좋아요 총합을 셀 수 없다.
-- 누가 눌렀는지는 감추고 개수만 공개하는 집계 뷰를 둔다.
create or replace view public.item_like_counts as
  select item_type, item_slug, count(*)::int as like_count
  from public.saved_items
  group by item_type, item_slug;

-- 집계 결과만 노출하므로 익명 사용자도 읽을 수 있게 한다.
grant select on public.item_like_counts to anon, authenticated;

commit;
