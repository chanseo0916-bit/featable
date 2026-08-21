import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { RowControls } from "../admin-controls";
import { AdminDeleteButton, AdminEditButton } from "../admin-editor";
import { EventForm } from "../curation-forms";
import { ADMIN_PAGE_SIZE, AdminListTools, AdminPageHeader, AdminPagination, formatAdminDate, parseAdminQuery, StatusBadge, toAdminDateTimeInput, type PublishStatus } from "../admin-ui";

export const metadata: Metadata = { title: "행사 관리" };
interface EventRow { id: string; slug: string; name: string; host: string; starts_at: string; location: string; is_online: boolean; fee: string | null; category: string; audience: string | null; apply_url: string; cover_url: string | null; status: PublishStatus; is_featured: boolean }

export default async function AdminEventsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const supabase = await createClient();
  const query = parseAdminQuery(await searchParams);
  let request = supabase.from("events").select("id,slug,name,host,starts_at,location,is_online,fee,category,audience,apply_url,cover_url,status,is_featured", { count: "exact" });
  if (query.q) request = request.ilike("name", `%${query.q.replace(/[%_]/g, "")}%`);
  if (query.status !== "all") request = request.eq("status", query.status);
  const from = (query.page - 1) * ADMIN_PAGE_SIZE;
  const { data, count } = await request.order("starts_at", { ascending: false }).range(from, from + ADMIN_PAGE_SIZE - 1);
  const rows = (data ?? []) as EventRow[];
  return <main className="admin-main shell"><AdminPageHeader eyebrow="CURATION" title="행사 관리" description="행사를 직접 등록하고 공개 상태를 관리합니다." publicHref="/events" />
    <section className="admin-list-panel"><EventForm /><AdminListTools query={query} placeholder="행사명 검색" /><div className="admin-list-head"><h2>전체 행사 <span>{count ?? 0}</span></h2></div><div className="admin-stack-list">
      {rows.map((row) => <article key={row.id}><div><Link href={`/events/${row.slug}`}>{row.name}</Link><p>{row.host} · {formatAdminDate(row.starts_at)}</p></div><StatusBadge status={row.status} /><div className="admin-row-actions"><RowControls table="events" id={row.id} isFeatured={row.is_featured} status={row.status} /><AdminEditButton table="events" id={row.id} label={row.name} initial={{ name: row.name, host: row.host, startsAt: toAdminDateTimeInput(row.starts_at), location: row.location, isOnline: row.is_online, fee: row.fee ?? "", category: row.category, audience: row.audience ?? "", applyUrl: row.apply_url, coverUrl: row.cover_url ?? "" }} /><AdminDeleteButton table="events" id={row.id} name={row.name} /></div></article>)}
      {!rows.length && <p className="admin-empty">등록된 행사가 없습니다.</p>}
    </div><AdminPagination query={query} count={count ?? 0} /></section>
  </main>;
}
