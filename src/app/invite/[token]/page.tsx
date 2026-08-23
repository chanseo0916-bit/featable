import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { StudioBrand } from "@/components/site-shell";
import { acceptBrandInvitation } from "@/app/my/team-actions";

export const metadata = { title: "팀 초대 · Featable", robots: { index: false, follow: false } };

function isExpired(expiresAt: string): boolean {
  return new Date(expiresAt).getTime() <= Date.now();
}

export default async function InvitePage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ error?: string }> }) {
  const { token } = await params;
  const { error: queryError } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/invite/${encodeURIComponent(token)}`);

  const { data: invitation } = await supabase
    .from("brand_invitations")
    .select("email,expires_at,accepted_at,brand:brands(name,slug)")
    .eq("token", token)
    .maybeSingle();

  if (!invitation) notFound();
  const brand = invitation.brand as unknown as { name: string; slug: string } | null;
  if (!brand) notFound();
  if (invitation.accepted_at) redirect("/my");
  const expired = isExpired(invitation.expires_at);

  return <main className="invite-page">
    <section>
      <StudioBrand />
      <p>팀 초대</p>
      <h1><strong>{brand.name}</strong> 팀에서<br />함께하길 기다리고 있어요.</h1>
      <span>{invitation.email} 계정으로 초대되었습니다.</span>
      {queryError && <div className="invite-error">초대를 수락하지 못했어요. 초대 이메일과 로그인 계정이 같은지 확인해주세요.</div>}
      {expired ? <div className="invite-error">초대 링크가 만료됐어요. 브랜드 관리자에게 새 링크를 요청해주세요.</div> : <form action={acceptBrandInvitation}><input type="hidden" name="token" value={token} /><button type="submit">팀에 참여하기 <b>→</b></button></form>}
      <Link href="/">Featable 둘러보기</Link>
    </section>
  </main>;
}

