import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { StudioNav } from "../studio-nav";

export const metadata: Metadata = { title: "내 파트너 · FEATABLE", robots: { index: false, follow: false } };

interface PartnerRow { id: string; name: string; logo_url: string; intro: string; field: string | null; href: string; status: "published" | "hidden" | "draft"; is_featured: boolean; }

export default async function MyPartnersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/my/partners");
  const { data } = await supabase.from("partners").select("id,name,logo_url,intro,field,href,status,is_featured").eq("owner_user_id", user.id).order("created_at", { ascending: false });
  const partners = (data ?? []) as PartnerRow[];

  return <><StudioNav active="partners" /><main className="studio-dashboard managed-community-page"><div className="shell studio-dashboard-inner">
    <header className="managed-community-heading"><div><span>PARTNER CENTER</span><h1>내 파트너</h1><p>승인받아 공개한 파트너 프로필을 직접 관리하세요.</p></div><Link href="/partners/apply">새 파트너 문의 →</Link></header>
    {partners.length ? <section className="managed-community-grid">{partners.map((partner) => <article key={partner.id}><div className="managed-community-logo">{partner.logo_url ? <img src={partner.logo_url} alt={`${partner.name} 로고`} /> : <span>{partner.name.slice(0, 1)}</span>}</div><div className="managed-community-copy"><small>{partner.field || "PARTNER"}</small><h2>{partner.name}</h2><p>{partner.intro}</p></div><span className="managed-community-status" data-status={partner.status}>{partner.status === "published" ? "공개 중" : partner.status === "hidden" ? "숨김" : "초안"}</span><footer><Link href={`/my/partners/${partner.id}`}>프로필 관리</Link><a href={partner.href} target="_blank" rel="noreferrer">연결 페이지 ↗</a></footer></article>)}</section> : <section className="managed-community-empty"><span>PARTNER</span><h2>아직 관리 중인 파트너가 없어요.</h2><p>파트너 문의가 승인되면 직접 공개 프로필을 만들고 이곳에서 계속 수정할 수 있습니다.</p><Link href="/partners/apply">파트너 문의하기 →</Link></section>}
  </div></main></>;
}
