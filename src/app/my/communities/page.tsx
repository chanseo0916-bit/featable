import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { DashNav } from "../dash-nav";

export const metadata: Metadata = { title: "내 커뮤니티 관리 · FEATABLE" };

interface ManagedCommunity {
  id: string;
  slug: string;
  name: string;
  logo_url: string | null;
  intro: string;
  field: string;
  status: "draft" | "published" | "hidden";
}

export default async function MyCommunitiesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/my/communities");

  const admin = createAdminClient();
  const [{ data: managedRows }, { data: ownedPartners }, { data: partnerMemberships }] = admin ? await Promise.all([
    admin.from("community_managers").select("community_id").eq("user_id", user.id),
    admin.from("partners").select("id").eq("owner_user_id", user.id),
    admin.from("partner_members").select("partner_id").eq("user_id", user.id).in("member_role", ["manager", "editor"]),
  ]) : [{ data: [] }, { data: [] }, { data: [] }];
  const delegatedIds = (managedRows ?? []).map((item) => item.community_id);
  const partnerIds = [...new Set([...(ownedPartners ?? []).map((item) => item.id), ...(partnerMemberships ?? []).map((item) => item.partner_id)])];
  const { data: ownedRows } = await supabase.from("communities")
    .select("id,slug,name,logo_url,intro,field,status")
    .eq("manager_user_id", user.id)
    .order("created_at", { ascending: false });
  const { data: delegatedRows } = admin && delegatedIds.length
    ? await admin.from("communities").select("id,slug,name,logo_url,intro,field,status").in("id", delegatedIds).order("created_at", { ascending: false })
    : { data: [] };
  const { data: partnerRows } = admin && partnerIds.length
    ? await admin.from("communities").select("id,slug,name,logo_url,intro,field,status").in("partner_id", partnerIds).order("created_at", { ascending: false })
    : { data: [] };
  const communityMap = new Map<string, ManagedCommunity>();
  [...(ownedRows ?? []), ...(delegatedRows ?? []), ...(partnerRows ?? [])].forEach((item) => communityMap.set(item.id, item as ManagedCommunity));
  const communities = [...communityMap.values()];

  return <>
    <DashNav active="communities" />
    <main className="dash-page managed-community-page">
      <div className="shell dash-shell">
        <header className="managed-community-heading">
          <div><span>COMMUNITY CONSOLE</span><h1>내 커뮤니티</h1><p>내가 운영하는 커뮤니티의 공개 정보를 직접 관리하세요.</p></div>
          <Link href="/partners/apply">새 커뮤니티 등록 문의 ↗</Link>
        </header>

        {communities.length ? <section className="managed-community-grid">
          {communities.map((community) => <article key={community.id}>
            <div className="managed-community-logo">{community.logo_url ? <img src={community.logo_url} alt={`${community.name} 로고`} /> : <span>{community.name.slice(0, 1)}</span>}</div>
            <div className="managed-community-copy"><small>{community.field}</small><h2>{community.name}</h2><p>{community.intro}</p></div>
            <span className="managed-community-status" data-status={community.status}>{community.status === "published" ? "공개 중" : community.status === "hidden" ? "숨김" : "초안"}</span>
            <footer><Link href={`/my/communities/${community.slug}`}>정보 수정</Link><Link href={`/communities/${community.slug}`} target="_blank">공개 페이지 ↗</Link></footer>
          </article>)}
        </section> : <section className="managed-community-empty">
          <span>COMMUNITY</span><h2>아직 관리 중인 커뮤니티가 없어요.</h2><p>승인된 커뮤니티를 등록하면 이곳에서 로고와 소개, 링크를 계속 수정할 수 있어요.</p><Link href="/partners/apply">커뮤니티 등록 문의하기 →</Link>
        </section>}
      </div>
    </main>
  </>;
}
