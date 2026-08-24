import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { DashNav } from "../../dash-nav";
import { PartnerEditor } from "./partner-editor";
import { PartnerWorkspace } from "./partner-workspace";
import type { PartnerMemberRole } from "./workspace-actions";

export const metadata: Metadata = { title: "회사 워크스페이스 · FEATABLE", robots: { index: false, follow: false } };
interface CommunityRow { id: string; slug: string; name: string; logo_url: string | null; intro: string; partner_id: string | null; }

export default async function EditPartnerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/my/partners/${encodeURIComponent(id)}`);
  const admin = createAdminClient();
  if (!admin) notFound();

  const { data: partner } = await admin.from("partners").select("id,name,logo_url,field,intro,description,href,status,owner_user_id").eq("id", id).maybeSingle();
  if (!partner) notFound();
  const isOwner = partner.owner_user_id === user.id;
  let accessRole: "owner" | PartnerMemberRole = "owner";
  if (!isOwner) {
    const { data: membership } = await admin.from("partner_members").select("member_role").eq("partner_id", id).eq("user_id", user.id).maybeSingle();
    if (!membership) notFound();
    accessRole = membership.member_role as PartnerMemberRole;
  }

  const [communitiesResult, ownedCommunitiesResult, membersResult, invitationsResult] = await Promise.all([
    admin.from("communities").select("id,slug,name,logo_url,intro,partner_id").eq("partner_id", id).order("created_at", { ascending: false }),
    isOwner ? admin.from("communities").select("id,slug,name,logo_url,intro,partner_id").eq("manager_user_id", user.id).is("partner_id", null).order("created_at", { ascending: false }) : Promise.resolve({ data: [] }),
    admin.from("partner_members").select("user_id,member_role,profile:profiles(full_name,email)").eq("partner_id", id).order("joined_at", { ascending: true }),
    isOwner ? admin.from("partner_invitations").select("id,invitee_email,member_role,expires_at").eq("partner_id", id).eq("status", "pending").order("created_at", { ascending: false }) : Promise.resolve({ data: [] }),
  ]);
  const mapCommunity = (item: CommunityRow) => ({ id: item.id, slug: item.slug, name: item.name, logoUrl: item.logo_url ?? "", intro: item.intro });
  const communities = ((communitiesResult.data ?? []) as CommunityRow[]).map(mapCommunity);
  const communityCandidates = ((ownedCommunitiesResult.data ?? []) as CommunityRow[]).map(mapCommunity);
  const members = ((membersResult.data ?? []) as unknown as Array<{ user_id: string; member_role: PartnerMemberRole; profile: { full_name: string | null; email: string | null } | null }>).map((item) => ({ userId: item.user_id, name: item.profile?.full_name || item.profile?.email || "Featable 멤버", email: item.profile?.email || "", role: item.member_role }));
  const invitations = (invitationsResult.data ?? []).map((item) => ({ id: item.id, email: item.invitee_email, role: item.member_role as PartnerMemberRole, expiresAt: item.expires_at }));

  return <><DashNav active="partners" /><main className="approved-publishing-page"><div className="shell">
    <div className="approved-publishing-heading"><div><span>COMPANY WORKSPACE</span><h2>{partner.name}</h2></div><p>회사 프로필, 소속 커뮤니티, 팀원과 채용 공고를 한곳에서 관리합니다.</p></div>
    {(accessRole === "owner" || accessRole === "manager") ? <PartnerEditor id={partner.id} initial={{ name: partner.name, logoUrl: partner.logo_url, field: partner.field ?? "", intro: partner.intro ?? "", description: partner.description ?? "", website: partner.href, status: partner.status === "hidden" ? "hidden" : "published" }} /> : <section className="community-editor-access-note"><span>{accessRole.toUpperCase()} ACCESS</span><strong>{accessRole === "editor" ? "소속 커뮤니티와 채용 공고를 관리할 수 있습니다." : "회사 워크스페이스를 조회할 수 있습니다."}</strong><p>회사 프로필과 팀 구성 변경은 소유자 또는 관리자가 담당합니다.</p></section>}
    <PartnerWorkspace partnerId={partner.id} isOwner={isOwner} canManage={accessRole !== "viewer"} communities={communities} communityCandidates={communityCandidates} members={members} invitations={invitations} />
  </div></main></>;
}
