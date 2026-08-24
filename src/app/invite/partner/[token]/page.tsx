import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { StudioBrand } from "@/components/site-shell";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { acceptPartnerInvitation } from "./actions";

export const metadata = { title: "회사 팀 초대 · Featable", robots: { index: false, follow: false } };
const roleName = { manager: "관리자", editor: "편집자", viewer: "뷰어" } as const;

export default async function PartnerInvitePage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ error?: string }> }) {
  const { token } = await params;
  const { error } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/invite/partner/${encodeURIComponent(token)}`);
  const admin = createAdminClient();
  if (!admin) notFound();
  const { data: invitation } = await admin.from("partner_invitations").select("invitee_email,member_role,status,expires_at,partner:partners(name)").eq("token", token).maybeSingle();
  if (!invitation) notFound();
  const partner = invitation.partner as unknown as { name: string } | null;
  if (!partner) notFound();
  if (invitation.status === "accepted") redirect("/my/partners");
  const expired = invitation.status !== "pending";

  return <main className="invite-page"><section>
    <StudioBrand /><p>COMPANY TEAM INVITE</p>
    <h1><strong>{partner.name}</strong> 팀에서<br />함께하길 기다리고 있어요.</h1>
    <span>{invitation.invitee_email} 계정에 {roleName[invitation.member_role as keyof typeof roleName]} 권한으로 초대했습니다.</span>
    {error && <div className="invite-error">초대를 수락하지 못했습니다. 초대 이메일과 현재 로그인한 계정이 같은지 확인해주세요.</div>}
    {expired ? <div className="invite-error">초대 링크가 만료됐습니다. 회사 소유자에게 새 링크를 요청해주세요.</div> : <form action={acceptPartnerInvitation}><input type="hidden" name="token" value={token} /><button type="submit">회사 팀에 참여하기 <b>→</b></button></form>}
    <Link href="/my/partners">내 회사로 이동</Link>
  </section></main>;
}
