import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { StudioBrand } from "@/components/site-shell";
import { createClient } from "@/lib/supabase/server";
import { ProfileEditor } from "@/app/my/profile-editor";

export const metadata: Metadata = {
  title: "내 프로필 설정 · FEATABLE",
  description: "역할과 소개를 입력하고 나만의 공개 프로필 카드를 만들어보세요.",
};

// Cloudflare(OpenNext)가 Node 미들웨어를 미지원이라 페이지에서 직접 로그인 보호
export default async function SubmitPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/submit");
  const [{ data: profile }, { data: founder }] = await Promise.all([
    supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
    supabase.from("founders").select("founder_number,slug,name,role_title,headline,bio,avatar_url,sns").eq("user_id", user.id).maybeSingle(),
  ]);
  const sns = (founder?.sns ?? {}) as { instagram?: string; x?: string; linkedin?: string; website?: string };

  return <>
    <div className="publish-console-nav simple-register-nav"><div className="shell"><StudioBrand /><nav><span className="active">내 프로필 설정</span></nav><Link href="/my">나가기</Link></div></div>
    <main className="simple-registration-page profile-registration-page"><div className="shell"><div className="simple-registration-context"><span>MY PROFILE</span><p>입력한 내용은 언제든 스튜디오에서 수정할 수 있어요.<br />오른쪽 카드에서 공개 모습을 미리 확인해보세요.</p></div><ProfileEditor setupMode initial={{ founderNumber: founder?.founder_number, slug: founder?.slug, name: founder?.name ?? profile?.full_name ?? user.user_metadata?.full_name ?? "", role: founder?.role_title ?? "", headline: founder?.headline ?? "", bio: founder?.bio ?? "", avatarUrl: founder?.avatar_url ?? "", instagram: sns.instagram ?? "", x: sns.x ?? "", linkedin: sns.linkedin ?? "", website: sns.website ?? "" }} /></div></main>
  </>;
}
