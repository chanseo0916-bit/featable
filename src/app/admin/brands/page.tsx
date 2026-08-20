import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { RowControls } from "../admin-controls";
import { AdminDeleteButton, AdminEditButton } from "../admin-editor";
import { ADMIN_PAGE_SIZE, AdminListTools, AdminPageHeader, AdminPagination, formatAdminDate, parseAdminQuery, StatusBadge, type PublishStatus } from "../admin-ui";

export const metadata: Metadata = { title: "브랜드 관리" };

interface BrandRow { id: string; slug: string; name: string; tagline: string; category: string; description: string; problem: string | null; audience: string | null; website: string | null; logo_url: string | null; cover_url: string | null; status: PublishStatus; is_featured: boolean; created_at: string; founder: { name: string } | null }

export default async function AdminBrandsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const supabase = await createClient();
  const query = parseAdminQuery(await searchParams);
  let request = supabase.from("brands").select("id,slug,name,tagline,category,description,problem,audience,website,logo_url,cover_url,status,is_featured,created_at,founder:founders(name)", { count: "exact" });
  if (query.q) request = request.ilike("name", `%${query.q.replace(/[%_]/g, "")}%`);
  if (query.status !== "all") request = request.eq("status", query.status);
  const from = (query.page - 1) * ADMIN_PAGE_SIZE;
  const { data, count } = await request.order("created_at", { ascending: false }).range(from, from + ADMIN_PAGE_SIZE - 1);
  const rows = (data ?? []) as unknown as BrandRow[];
  return <main className="admin-main shell">
    <AdminPageHeader eyebrow="CONTENT" title="브랜드 관리" description="등록된 기업 정보를 검수하고 공개 여부와 메인 노출을 관리합니다." publicHref="/brands" />
    <section className="admin-list-panel">
      <AdminListTools query={query} placeholder="브랜드명 검색" />
      <div className="admin-list-head"><h2>전체 브랜드 <span>{count ?? 0}</span></h2></div>
      <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>브랜드</th><th>카테고리</th><th>상태</th><th>등록일</th><th>관리</th></tr></thead><tbody>
        {rows.map((row) => <tr key={row.id}><td><Link href={`/brands/${row.slug}`}>{row.name}</Link><p>{row.tagline} · {row.founder?.name ?? "-"}</p></td><td>{row.category}</td><td><StatusBadge status={row.status} /></td><td>{formatAdminDate(row.created_at)}</td><td><div className="admin-row-actions"><RowControls table="brands" id={row.id} isFeatured={row.is_featured} status={row.status} /><AdminEditButton table="brands" id={row.id} label={row.name} initial={{ name: row.name, tagline: row.tagline, category: row.category, description: row.description, problem: row.problem ?? "", audience: row.audience ?? "", website: row.website ?? "", logoUrl: row.logo_url ?? "", coverUrl: row.cover_url ?? "" }} /><AdminDeleteButton table="brands" id={row.id} name={row.name} /></div></td></tr>)}
        {!rows.length && <tr><td colSpan={5} className="admin-empty">등록된 브랜드가 없습니다.</td></tr>}
      </tbody></table></div><AdminPagination query={query} count={count ?? 0} />
    </section>
  </main>;
}
