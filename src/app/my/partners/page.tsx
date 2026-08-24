import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { StudioNav } from "../studio-nav";

export const metadata: Metadata = { title: "내 회사 · FEATABLE", robots: { index: false, follow: false } };
type Role = "owner" | "manager" | "editor" | "viewer";
interface PartnerRow { id: string; name: string; logo_url: string; intro: string; field: string | null; href: string; status: "published" | "hidden" | "draft"; created_at: string; }

export default async function MyPartnersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/my/partners");
  const admin = createAdminClient();
  const [{ data: owned }, { data: memberships }] = admin ? await Promise.all([
    admin.from("partners").select("id,name,logo_url,intro,field,href,status,created_at").eq("owner_user_id", user.id).order("created_at", { ascending: false }),
    admin.from("partner_members").select("member_role,partner:partners(id,name,logo_url,intro,field,href,status,created_at)").eq("user_id", user.id),
  ]) : [{ data: [] }, { data: [] }];
  const partnerMap = new Map<string, { partner: PartnerRow; role: Role }>();
  ((owned ?? []) as PartnerRow[]).forEach((partner) => partnerMap.set(partner.id, { partner, role: "owner" }));
  ((memberships ?? []) as unknown as Array<{ member_role: Exclude<Role, "owner">; partner: PartnerRow | null }>).forEach(({ partner, member_role }) => { if (partner && !partnerMap.has(partner.id)) partnerMap.set(partner.id, { partner, role: member_role }); });
  const partners = [...partnerMap.values()].sort((a, b) => Date.parse(b.partner.created_at) - Date.parse(a.partner.created_at));
  const roleName: Record<Role, string> = { owner: "소유자", manager: "관리자", editor: "편집자", viewer: "뷰어" };

  return <><StudioNav active="partners" /><main className="studio-dashboard managed-community-page"><div className="shell studio-dashboard-inner">
    <header className="managed-community-heading"><div><span>COMPANY WORKSPACE</span><h1>내 회사</h1><p>회사 프로필, 소속 커뮤니티, 팀원과 채용 공고를 한곳에서 관리하세요.</p></div><Link href="/partners/apply">파트너 등록 문의 →</Link></header>
    {partners.length ? <section className="managed-community-grid">{partners.map(({ partner, role }) => <article key={partner.id}><div className="managed-community-logo">{partner.logo_url ? <img src={partner.logo_url} alt={`${partner.name} 로고`} /> : <span>{partner.name.slice(0, 1)}</span>}</div><div className="managed-community-copy"><small>{partner.field || "PARTNER"} · {roleName[role]}</small><h2>{partner.name}</h2><p>{partner.intro}</p></div><span className="managed-community-status" data-status={partner.status}>{partner.status === "published" ? "공개 중" : partner.status === "hidden" ? "숨김" : "초안"}</span><footer><Link href={`/my/partners/${partner.id}`}>워크스페이스</Link>{role !== "viewer" && <Link href="/my/jobs">채용 공고</Link>}<a href={partner.href} target="_blank" rel="noreferrer">연결 페이지 ↗</a></footer></article>)}</section> : <section className="managed-community-empty"><span>COMPANY</span><h2>아직 참여 중인 회사가 없어요</h2><p>파트너 등록이 승인되거나 회사 팀 초대를 수락하면 여기에서 워크스페이스를 관리할 수 있습니다.</p><Link href="/partners/apply">파트너 등록 문의하기 →</Link></section>}
  </div></main></>;
}
