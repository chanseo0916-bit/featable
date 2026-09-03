import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { StudioBrand } from "@/components/site-shell";
import { createClient } from "@/lib/supabase/server";
import { ProfileEditor } from "@/app/my/profile-editor";
import { switchToFounderRole } from "@/app/my/actions";
import { isMemberType, type MemberType } from "@/lib/auth";

export const metadata: Metadata = {
  title: "내 프로필 설정 · FEATABLE",
  description: "역할과 소개를 입력하고 나만의 공개 프로필 카드를 만들어보세요.",
};

const otherRoleLabel: Record<Exclude<MemberType, "founder">, string> = {
  team: "팀 멤버",
  explorer: "예비 창업가",
  partner: "파트너",
};

// Cloudflare(OpenNext)가 Node 미들웨어를 미지원이라 페이지에서 직접 로그인 보호
export default async function SubmitPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/submit");
  const [{ data: profile }, { data: founder }] = await Promise.all([
    supabase.from("profiles").select("full_name,member_type").eq("id", user.id).maybeSingle(),
    supabase.from("founders").select("founder_number,slug,name,role_title,headline,bio,avatar_url,sns").eq("user_id", user.id).maybeSingle(),
  ]);
  const sns = (founder?.sns ?? {}) as { instagram?: string; x?: string; linkedin?: string; website?: string };
  const memberType: MemberType = isMemberType(profile?.member_type ?? "")
    ? (profile?.member_type as MemberType)
    : "founder";

  // 이 화면은 창업가 전용 흐름이다. 다른 역할로 가입한 사용자가 홈·푸터의
  // "프로필 만들기"를 눌러 들어온 경우, 역할 전환 여부를 먼저 확인한다.
  // 이미 파운더 프로필이 있으면 역할과 무관하게 통과시킨다(브랜드 운영 중일 수 있음).
  if (!founder && memberType !== "founder") {
    const currentLabel = otherRoleLabel[memberType as Exclude<MemberType, "founder">];
    return <>
      <div className="publish-console-nav simple-register-nav"><div className="shell"><StudioBrand /><nav><span className="active">내 프로필 설정</span></nav><Link href="/my">나가기</Link></div></div>
      <main className="simple-registration-page role-gate-page">
        <div className="shell role-gate-card">
          <span>ROLE CHECK</span>
          <h1>창업가로 활동을 시작할까요?</h1>
          <p>
            공개 프로필 카드는 브랜드와 프로덕트를 소개하는 <b>창업가</b> 활동에 쓰여요.
            지금은 <b>{currentLabel}</b>로 가입되어 있어서, 계속하려면 역할을 창업가로 바꿔야 합니다.
            역할은 언제든 스튜디오에서 다시 바꿀 수 있어요.
          </p>
          <div className="role-gate-actions">
            <form action={switchToFounderRole}>
              <button type="submit">창업가로 시작하기 <b>→</b></button>
            </form>
            <Link href="/my">{currentLabel} 워크스페이스로 가기</Link>
          </div>
        </div>
      </main>
    </>;
  }

  return <>
    <div className="publish-console-nav simple-register-nav"><div className="shell"><StudioBrand /><nav><span className="active">내 프로필 설정</span></nav><Link href="/my">나가기</Link></div></div>
    <main className="simple-registration-page profile-registration-page"><div className="shell"><div className="simple-registration-context"><span>내 프로필</span><p>입력한 내용은 언제든 스튜디오에서 수정할 수 있어요.<br />오른쪽 카드에서 공개 모습을 미리 확인해보세요.</p></div><ProfileEditor setupMode afterSaveHref="/submit/interview" initial={{ founderNumber: founder?.founder_number, slug: founder?.slug, name: founder?.name ?? profile?.full_name ?? user.user_metadata?.full_name ?? "", role: founder?.role_title ?? "", headline: founder?.headline ?? "", bio: founder?.bio ?? "", avatarUrl: founder?.avatar_url ?? "", instagram: sns.instagram ?? "", x: sns.x ?? "", linkedin: sns.linkedin ?? "", website: sns.website ?? "" }} /></div></main>
  </>;
}
