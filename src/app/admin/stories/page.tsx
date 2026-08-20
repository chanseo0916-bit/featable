import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { StoryBlock } from "@/lib/types";
import { RowControls } from "../admin-controls";
import { AdminDeleteButton } from "../admin-editor";
import { ADMIN_PAGE_SIZE, AdminListTools, AdminPageHeader, AdminPagination, formatAdminDate, parseAdminQuery, StatusBadge, type PublishStatus } from "../admin-ui";
import { StoryForm, type StoryFormInitial } from "./story-form";

export const metadata: Metadata = { title: "스토리 관리" };

interface StoryRow {
  id: string; slug: string; title: string; kind: string; excerpt: string;
  cover_url: string | null; body: StoryBlock[] | null; brand_id: string | null;
  status: PublishStatus; is_featured: boolean; published_at: string | null; view_count: number;
}

const KIND_LABEL: Record<string, string> = {
  interview: "인터뷰", "brand-story": "브랜드 스토리", "product-feature": "프로덕트 피처",
  launch: "런칭", update: "업데이트", "case-study": "케이스 스터디", qna: "Q&A",
};

export default async function AdminStoriesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const supabase = await createClient();
  const params = await searchParams;
  const query = parseAdminQuery(params);
  const editId = typeof params.edit === "string" ? params.edit : undefined;

  const { data: brandRows } = await supabase.from("brands").select("id,name").order("name");
  const brands = (brandRows ?? []) as { id: string; name: string }[];

  let editing: StoryFormInitial | undefined;
  if (editId) {
    const { data } = await supabase
      .from("features")
      .select("id,title,kind,excerpt,cover_url,body,brand_id,status")
      .eq("id", editId)
      .maybeSingle();
    if (data) {
      editing = {
        id: data.id, title: data.title, kind: data.kind, excerpt: data.excerpt,
        coverUrl: data.cover_url ?? "", brandId: data.brand_id ?? "",
        body: (data.body ?? []) as StoryBlock[], published: data.status === "published",
      };
    }
  }

  let request = supabase
    .from("features")
    .select("id,slug,title,kind,excerpt,cover_url,body,brand_id,status,is_featured,published_at,view_count", { count: "exact" });
  if (query.q) request = request.ilike("title", `%${query.q.replace(/[%_]/g, "")}%`);
  if (query.status !== "all") request = request.eq("status", query.status);
  const from = (query.page - 1) * ADMIN_PAGE_SIZE;
  const { data, count } = await request
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("updated_at", { ascending: false })
    .range(from, from + ADMIN_PAGE_SIZE - 1);
  const rows = (data ?? []) as StoryRow[];

  return (
    <main className="admin-main shell">
      <AdminPageHeader eyebrow="EDITORIAL" title="스토리 관리" description="언론 기사처럼 발행되는 인터뷰·브랜드 스토리를 작성하고 관리합니다. ★ Featured로 지정하면 홈 상단에 노출됩니다." publicHref="/stories" />
      <section className="admin-list-panel">
        {editing ? (
          <StoryForm key={editing.id} brands={brands} initial={editing} />
        ) : (
          <StoryForm brands={brands} />
        )}
        <AdminListTools query={query} placeholder="스토리 제목 검색" />
        <div className="admin-list-head"><h2>전체 스토리 <span>{count ?? 0}</span></h2></div>
        <div className="admin-stack-list">
          {rows.map((row) => (
            <article key={row.id}>
              <div>
                <Link href={`/stories/${row.slug}`}>{row.title}</Link>
                <p>{KIND_LABEL[row.kind] ?? row.kind} · 조회 {row.view_count.toLocaleString("ko-KR")}{row.published_at ? ` · ${formatAdminDate(row.published_at)} 발행` : " · 미발행"}</p>
              </div>
              <StatusBadge status={row.status} />
              <div className="admin-row-actions">
                <RowControls table="features" id={row.id} isFeatured={row.is_featured} status={row.status} />
                <Link href={`/admin/stories?edit=${row.id}`} className="admin-action-button">편집</Link>
                <AdminDeleteButton table="features" id={row.id} name={row.title} />
              </div>
            </article>
          ))}
          {!rows.length && <p className="admin-empty">작성된 스토리가 없습니다. 첫 스토리를 발행해보세요.</p>}
        </div>
        <AdminPagination query={query} count={count ?? 0} />
      </section>
    </main>
  );
}
