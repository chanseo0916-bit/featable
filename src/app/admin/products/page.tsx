import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { RowControls } from "../admin-controls";
import { AdminDeleteButton, AdminEditButton } from "../admin-editor";
import { ADMIN_PAGE_SIZE, AdminListTools, AdminPageHeader, AdminPagination, formatAdminDate, parseAdminQuery, StatusBadge, type PublishStatus } from "../admin-ui";

export const metadata: Metadata = { title: "프로덕트 관리" };

interface ProductRow { id: string; slug: string; name: string; tagline: string; category: string; problem: string; solution: string; features: string[]; price: string | null; buy_url: string | null; official_url: string | null; hero_url: string | null; status: PublishStatus; is_featured: boolean; created_at: string; brand: { name: string } | null }

export default async function AdminProductsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const supabase = await createClient();
  const query = parseAdminQuery(await searchParams);
  let request = supabase.from("products").select("id,slug,name,tagline,category,problem,solution,features,price,buy_url,official_url,hero_url,status,is_featured,created_at,brand:brands(name)", { count: "exact" });
  if (query.q) request = request.ilike("name", `%${query.q.replace(/[%_]/g, "")}%`);
  if (query.status !== "all") request = request.eq("status", query.status);
  const from = (query.page - 1) * ADMIN_PAGE_SIZE;
  const { data, count } = await request.order("created_at", { ascending: false }).range(from, from + ADMIN_PAGE_SIZE - 1);
  const rows = (data ?? []) as unknown as ProductRow[];
  return <main className="admin-main shell">
    <AdminPageHeader eyebrow="CONTENT" title="프로덕트 관리" description="프로덕트와 상세페이지의 공개 상태, 피쳐 노출을 관리합니다." publicHref="/products" />
    <section className="admin-list-panel"><AdminListTools query={query} placeholder="프로덕트명 검색" /><div className="admin-list-head"><h2>전체 프로덕트 <span>{count ?? 0}</span></h2></div>
      <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>프로덕트</th><th>카테고리</th><th>상태</th><th>등록일</th><th>관리</th></tr></thead><tbody>
        {rows.map((row) => <tr key={row.id}><td><Link href={`/products/${row.slug}`}>{row.name}</Link><p>{row.tagline} · {row.brand?.name ?? "-"}</p></td><td>{row.category}</td><td><StatusBadge status={row.status} /></td><td>{formatAdminDate(row.created_at)}</td><td><div className="admin-row-actions"><RowControls table="products" id={row.id} isFeatured={row.is_featured} status={row.status} /><AdminEditButton table="products" id={row.id} label={row.name} initial={{ name: row.name, tagline: row.tagline, category: row.category, problem: row.problem, solution: row.solution, features: row.features.join("\n"), price: row.price ?? "", buyUrl: row.buy_url ?? "", officialUrl: row.official_url ?? "", heroUrl: row.hero_url ?? "" }} /><AdminDeleteButton table="products" id={row.id} name={row.name} /></div></td></tr>)}
        {!rows.length && <tr><td colSpan={5} className="admin-empty">등록된 프로덕트가 없습니다.</td></tr>}
      </tbody></table></div><AdminPagination query={query} count={count ?? 0} />
    </section>
  </main>;
}
