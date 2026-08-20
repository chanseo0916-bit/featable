import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { RowControls } from "./admin-controls";
import { DeleteCurationButton, EventForm, PartnerForm, SupportForm } from "./curation-forms";
import { StudioBrand } from "@/components/site-shell";

export const metadata: Metadata = {
  title: "관리자",
  robots: { index: false, follow: false },
};

interface AdminBrandRow {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  category: string;
  status: "draft" | "published" | "hidden";
  is_featured: boolean;
  created_at: string;
  founder: { name: string } | null;
}

interface AdminProductRow {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  category: string;
  status: "draft" | "published" | "hidden";
  is_featured: boolean;
  created_at: string;
  brand: { name: string; slug: string } | null;
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    published: "bg-accent-soft text-accent",
    draft: "bg-gray-100 text-muted",
    hidden: "bg-red-50 text-red-500",
  };
  const labels: Record<string, string> = {
    published: "공개",
    draft: "초안",
    hidden: "숨김",
  };
  return (
    <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${styles[status] ?? ""}`}>
      {labels[status] ?? status}
    </span>
  );
}

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = user
    ? await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()
    : { data: null };

  if (profile?.role !== "admin") {
    return (
      <main className="mx-auto max-w-md bg-white px-6 py-24 text-center">
        <p className="mb-2 text-[11px] font-extrabold tracking-[0.13em] text-accent">ADMIN</p>
        <h1 className="mb-3 text-xl font-bold">접근 권한이 없습니다</h1>
        <p className="text-sm text-muted">
          관리자 계정으로 로그인해야 합니다.
        </p>
      </main>
    );
  }

  // admin은 RLS 정책상 draft/hidden 포함 전체 조회 가능
  const [brandsRes, productsRes, eventsRes, supportRes, partnersRes] = await Promise.all([
    supabase
      .from("brands")
      .select("id,slug,name,tagline,category,status,is_featured,created_at,founder:founders(name)")
      .order("created_at", { ascending: false }),
    supabase
      .from("products")
      .select("id,slug,name,tagline,category,status,is_featured,created_at,brand:brands(name,slug)")
      .order("created_at", { ascending: false }),
    supabase
      .from("events")
      .select("id,slug,name,host,starts_at,status")
      .order("starts_at", { ascending: false }),
    supabase
      .from("support_programs")
      .select("id,slug,name,agency,close_at,status")
      .order("close_at", { ascending: false }),
    supabase
      .from("partners")
      .select("id,name,logo_url,href,intro,field,status")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
  ]);

  const eventRows = (eventsRes.data ?? []) as {
    id: string; slug: string; name: string; host: string; starts_at: string;
    status: "draft" | "published" | "hidden";
  }[];
  const supportRows = (supportRes.data ?? []) as {
    id: string; slug: string; name: string; agency: string; close_at: string;
    status: "draft" | "published" | "hidden";
  }[];
  // 마이그레이션 전(컬럼 없음)에는 조회가 실패하므로 빈 목록으로 폴백
  const partnerRows = (partnersRes.data ?? []) as {
    id: string; name: string; logo_url: string; href: string;
    intro: string | null; field: string | null;
    status: "draft" | "published" | "hidden";
  }[];

  const brands = (brandsRes.data ?? []) as unknown as AdminBrandRow[];
  const products = (productsRes.data ?? []) as unknown as AdminProductRow[];
  const fmt = (iso: string) =>
    new Intl.DateTimeFormat("ko-KR", { month: "short", day: "numeric" }).format(new Date(iso));

  return (
    <>
      <div className="publish-console-nav"><div className="shell"><StudioBrand /><nav><a className="active" href="#brands">콘텐츠 검수</a><a href="#events">행사</a><a href="#support">지원사업</a><a href="#partners">파트너</a></nav><Link href="/">사이트 보기 →</Link></div></div>
      <div className="publish-console-tabs"><div className="shell"><a className="active" href="#brands">브랜드</a><a href="#products">프로덕트</a><a href="#events">행사</a><a href="#support">지원사업</a><a href="#partners">파트너</a></div></div>

      <main className="shell my-dash">
        <div className="my-dash-heading">
          <div>
            <p className="eyebrow">FEATABLE ADMIN</p>
            <h1>운영 콘솔</h1>
            <p>브랜드 검수부터 행사·지원사업·파트너 큐레이션까지 한곳에서 관리하세요.</p>
          </div>
        </div>

        <div className="my-dash-stats">
          <div className="my-dash-stat"><span>브랜드</span><strong>{brands.length}<em>개</em></strong></div>
          <div className="my-dash-stat"><span>프로덕트</span><strong>{products.length}<em>개</em></strong></div>
          <div className="my-dash-stat"><span>행사</span><strong>{eventRows.length}<em>개</em></strong></div>
          <div className="my-dash-stat"><span>지원사업</span><strong>{supportRows.length}<em>개</em></strong></div>
        </div>

      <section id="brands" className="my-dash-panel">
        <div className="my-dash-panel-head">
          <h2>브랜드 <span className="text-sm font-normal text-muted">{brands.length}</span></h2>
          <Link href="/brands">공개 페이지 →</Link>
        </div>
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted">
                <th className="px-4 py-3 font-semibold">브랜드</th>
                <th className="px-4 py-3 font-semibold">카테고리</th>
                <th className="px-4 py-3 font-semibold">상태</th>
                <th className="px-4 py-3 font-semibold">등록일</th>
                <th className="px-4 py-3 font-semibold">관리</th>
              </tr>
            </thead>
            <tbody>
              {brands.map((b) => (
                <tr key={b.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">
                    <Link href={`/brands/${b.slug}`} className="font-semibold hover:text-accent">
                      {b.name}
                    </Link>
                    <p className="text-xs text-muted">
                      {b.tagline} · {b.founder?.name ?? "-"}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-xs">{b.category}</td>
                  <td className="px-4 py-3"><StatusBadge status={b.status} /></td>
                  <td className="px-4 py-3 text-xs text-muted">{fmt(b.created_at)}</td>
                  <td className="px-4 py-3">
                    <RowControls table="brands" id={b.id} isFeatured={b.is_featured} status={b.status} />
                  </td>
                </tr>
              ))}
              {brands.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-sm text-muted">등록된 브랜드가 없습니다.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section id="products" className="my-dash-panel">
        <div className="my-dash-panel-head">
          <h2>프로덕트 <span className="text-sm font-normal text-muted">{products.length}</span></h2>
          <Link href="/products">공개 페이지 →</Link>
        </div>
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted">
                <th className="px-4 py-3 font-semibold">프로덕트</th>
                <th className="px-4 py-3 font-semibold">카테고리</th>
                <th className="px-4 py-3 font-semibold">상태</th>
                <th className="px-4 py-3 font-semibold">등록일</th>
                <th className="px-4 py-3 font-semibold">관리</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">
                    <Link href={`/products/${p.slug}`} className="font-semibold hover:text-accent">
                      {p.name}
                    </Link>
                    <p className="text-xs text-muted">
                      {p.tagline} · {p.brand?.name ?? "-"}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-xs">{p.category}</td>
                  <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                  <td className="px-4 py-3 text-xs text-muted">{fmt(p.created_at)}</td>
                  <td className="px-4 py-3">
                    <RowControls table="products" id={p.id} isFeatured={p.is_featured} status={p.status} />
                  </td>
                </tr>
              ))}
              {products.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-sm text-muted">등록된 프로덕트가 없습니다.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section id="events" className="my-dash-panel">
        <div className="my-dash-panel-head">
          <h2>행사 <span className="text-sm font-normal text-muted">{eventRows.length}</span></h2>
          <Link href="/events">공개 페이지 →</Link>
        </div>
        <EventForm />
        <div className="grid gap-2">
          {eventRows.map((e) => (
            <div key={e.id} className="flex items-center justify-between rounded-xl border border-border px-4 py-3">
              <div>
                <p className="text-sm font-semibold">
                  <Link href={`/events/${e.slug}`} className="hover:text-accent">{e.name}</Link>
                  <span className="ml-2"><StatusBadge status={e.status} /></span>
                </p>
                <p className="text-xs text-muted">{e.host} · {fmt(e.starts_at)}</p>
              </div>
              <div className="flex items-center gap-2">
                <RowControls table="events" id={e.id} isFeatured={false} status={e.status} showFeatured={false} />
                <DeleteCurationButton table="events" id={e.id} name={e.name} />
              </div>
            </div>
          ))}
          {eventRows.length === 0 && (
            <p className="rounded-xl border border-dashed border-border py-8 text-center text-sm text-muted">등록된 행사가 없습니다.</p>
          )}
        </div>
      </section>

      <section id="support" className="my-dash-panel">
        <div className="my-dash-panel-head">
          <h2>지원사업 <span className="text-sm font-normal text-muted">{supportRows.length}</span></h2>
          <Link href="/support">공개 페이지 →</Link>
        </div>
        <SupportForm />
        <div className="grid gap-2">
          {supportRows.map((s) => (
            <div key={s.id} className="flex items-center justify-between rounded-xl border border-border px-4 py-3">
              <div>
                <p className="text-sm font-semibold">
                  <Link href={`/support/${s.slug}`} className="hover:text-accent">{s.name}</Link>
                  <span className="ml-2"><StatusBadge status={s.status} /></span>
                </p>
                <p className="text-xs text-muted">{s.agency} · 마감 {s.close_at}</p>
              </div>
              <div className="flex items-center gap-2">
                <RowControls table="support_programs" id={s.id} isFeatured={false} status={s.status} showFeatured={false} />
                <DeleteCurationButton table="support_programs" id={s.id} name={s.name} />
              </div>
            </div>
          ))}
          {supportRows.length === 0 && (
            <p className="rounded-xl border border-dashed border-border py-8 text-center text-sm text-muted">등록된 지원사업이 없습니다.</p>
          )}
        </div>
      </section>

      <section id="partners" className="my-dash-panel">
        <div className="my-dash-panel-head">
          <h2>파트너 <span className="text-sm font-normal text-muted">{partnerRows.length}</span></h2>
          <Link href="/partners">공개 페이지 →</Link>
        </div>
        <PartnerForm />
        <div className="grid gap-2">
          {partnerRows.map((p) => (
            <div key={p.id} className="flex items-center justify-between gap-4 rounded-xl border border-border px-4 py-3">
              <div className="flex min-w-0 items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.logo_url} alt="" className="h-10 w-10 flex-none rounded-lg border border-border object-cover" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">
                    {p.name}
                    {p.field && <span className="ml-2 text-xs font-normal text-muted">{p.field}</span>}
                    <span className="ml-2"><StatusBadge status={p.status} /></span>
                  </p>
                  <p className="truncate text-xs text-muted">{p.intro || p.href}</p>
                </div>
              </div>
              <div className="flex flex-none items-center gap-2">
                <RowControls table="partners" id={p.id} isFeatured={false} status={p.status} showFeatured={false} />
                <DeleteCurationButton table="partners" id={p.id} name={p.name} />
              </div>
            </div>
          ))}
          {partnerRows.length === 0 && (
            <p className="rounded-xl border border-dashed border-border py-8 text-center text-sm text-muted">등록된 파트너가 없습니다.</p>
          )}
        </div>
      </section>
      </main>
    </>
  );
}
