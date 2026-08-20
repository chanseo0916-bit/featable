import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { RowControls } from "../admin-controls";
import { AdminDeleteButton, AdminEditButton } from "../admin-editor";
import { PartnerForm } from "../curation-forms";
import { ADMIN_PAGE_SIZE, AdminListTools, AdminPageHeader, AdminPagination, parseAdminQuery, StatusBadge, type PublishStatus } from "../admin-ui";

export const metadata: Metadata = { title: "파트너 관리" };
interface PartnerRow { id: string; name: string; logo_url: string; href: string; intro: string | null; description: string | null; field: string | null; status: PublishStatus }

export default async function AdminPartnersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const supabase = await createClient();
  const query = parseAdminQuery(await searchParams);
  let request = supabase.from("partners").select("id,name,logo_url,href,intro,description,field,status", { count: "exact" });
  if (query.q) request = request.ilike("name", `%${query.q.replace(/[%_]/g, "")}%`);
  if (query.status !== "all") request = request.eq("status", query.status);
  const from = (query.page - 1) * ADMIN_PAGE_SIZE;
  const { data, count } = await request.order("sort_order", { ascending: true }).order("created_at", { ascending: true }).range(from, from + ADMIN_PAGE_SIZE - 1);
  const rows = (data ?? []) as PartnerRow[];
  return <main className="admin-main shell"><AdminPageHeader eyebrow="NETWORK" title="파트너 관리" description="Featable과 연결된 파트너의 정보와 공개 상태를 관리합니다." publicHref="/partners" />
    <section className="admin-list-panel"><PartnerForm /><AdminListTools query={query} placeholder="파트너명 검색" /><div className="admin-list-head"><h2>전체 파트너 <span>{count ?? 0}</span></h2></div><div className="admin-stack-list">
      {rows.map((row) => <article key={row.id}>
        <div className="admin-partner-name">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={row.logo_url} alt="" />
          <div><a href={row.href}>{row.name}</a><p>{row.field ? `${row.field} · ` : ""}{row.intro || row.href}</p></div>
        </div>
        <StatusBadge status={row.status} />
        <div className="admin-row-actions"><RowControls table="partners" id={row.id} isFeatured={false} status={row.status} showFeatured={false} /><AdminEditButton table="partners" id={row.id} label={row.name} initial={{ name: row.name, logoUrl: row.logo_url, href: row.href, intro: row.intro ?? "", description: row.description ?? "", field: row.field ?? "" }} /><AdminDeleteButton table="partners" id={row.id} name={row.name} /></div>
      </article>)}
      {!rows.length && <p className="admin-empty">등록된 파트너가 없습니다.</p>}
    </div><AdminPagination query={query} count={count ?? 0} /></section>
  </main>;
}
