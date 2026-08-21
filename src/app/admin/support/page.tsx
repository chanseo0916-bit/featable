import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { RowControls } from "../admin-controls";
import { AdminDeleteButton, AdminEditButton } from "../admin-editor";
import { BizinfoSyncButton, SupportForm } from "../curation-forms";
import { ADMIN_PAGE_SIZE, AdminListTools, AdminPageHeader, AdminPagination, parseAdminQuery, StatusBadge, type PublishStatus } from "../admin-ui";

export const metadata: Metadata = { title: "지원사업 관리" };
interface SupportRow { id: string; slug: string; name: string; agency: string; target: string; benefits: string; amount: string | null; open_at: string | null; close_at: string; region: string; field: string | null; apply_url: string; status: PublishStatus }

export default async function AdminSupportPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const supabase = await createClient();
  const query = parseAdminQuery(await searchParams);
  let request = supabase.from("support_programs").select("id,slug,name,agency,target,benefits,amount,open_at,close_at,region,field,apply_url,status", { count: "exact" });
  if (query.q) request = request.ilike("name", `%${query.q.replace(/[%_]/g, "")}%`);
  if (query.status !== "all") request = request.eq("status", query.status);
  const from = (query.page - 1) * ADMIN_PAGE_SIZE;
  const { data, count } = await request.order("close_at", { ascending: false }).range(from, from + ADMIN_PAGE_SIZE - 1);
  const rows = (data ?? []) as SupportRow[];
  return <main className="admin-main shell"><AdminPageHeader eyebrow="CURATION" title="지원사업 관리" description="창업가에게 보여줄 지원사업 공고를 등록하고 관리합니다." publicHref="/support" />
    <section className="admin-list-panel"><BizinfoSyncButton /><SupportForm /><AdminListTools query={query} placeholder="지원사업명 검색" /><div className="admin-list-head"><h2>전체 지원사업 <span>{count ?? 0}</span></h2></div><div className="admin-stack-list">
      {rows.map((row) => <article key={row.id}><div><Link href={`/support/${row.slug}`}>{row.name}</Link><p>{row.agency} · 마감 {row.close_at}</p></div><StatusBadge status={row.status} /><div className="admin-row-actions"><RowControls table="support_programs" id={row.id} isFeatured={false} status={row.status} showFeatured={false} /><AdminEditButton table="support_programs" id={row.id} label={row.name} initial={{ name: row.name, agency: row.agency, target: row.target, benefits: row.benefits, amount: row.amount ?? "", openAt: row.open_at ?? "", closeAt: row.close_at, region: row.region, field: row.field ?? "", applyUrl: row.apply_url }} /><AdminDeleteButton table="support_programs" id={row.id} name={row.name} /></div></article>)}
      {!rows.length && <p className="admin-empty">등록된 지원사업이 없습니다.</p>}
    </div><AdminPagination query={query} count={count ?? 0} /></section>
  </main>;
}
