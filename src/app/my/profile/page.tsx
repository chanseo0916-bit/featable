import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProfileEditor } from "../profile-editor";
import { DashNav } from "../dash-nav";

export const metadata: Metadata = { title: "내 프로필 카드 · FEATABLE" };

export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ setup?: string; returnTo?: string }> }) {
  const { setup, returnTo } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/my/profile");

  const [{ data: founder }, { data: profile }] = await Promise.all([
    supabase.from("founders").select("id,founder_number,slug,name,role_title,headline,bio,avatar_url,sns").eq("user_id", user.id).maybeSingle(),
    supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
  ]);
  const sns = (founder?.sns ?? {}) as { instagram?: string; x?: string; linkedin?: string; website?: string };
  const interviewSetup = setup === "interview" && !founder;
  const afterSaveHref = returnTo === "/submit/interview" || returnTo?.startsWith("/submit/interview?")
    ? returnTo
    : "/submit/interview";

  return <>
    <DashNav active="profile" />
    <main className="dash-page dash-settings">
      <div className="shell dash-settings-inner profile-settings-inner">
        <header><h1>{interviewSetup ? "인터뷰를 내 프로필과 먼저 연결할게요." : "내 프로필 카드"}</h1><p>{interviewSetup ? "인터뷰에 표시할 이름과 역할을 먼저 확인해주세요." : "역할과 이야기를 등록하면 브랜드와 인터뷰에 함께 표시돼요."}</p></header>
        <section className="dash-profile-panel standalone"><ProfileEditor setupMode={interviewSetup} afterSaveHref={interviewSetup ? afterSaveHref : undefined} initial={{ founderNumber: founder?.founder_number, slug: founder?.slug, name: founder?.name ?? profile?.full_name ?? "", role: founder?.role_title ?? "", headline: founder?.headline ?? "", bio: founder?.bio ?? "", avatarUrl: founder?.avatar_url ?? "", instagram: sns.instagram ?? "", x: sns.x ?? "", linkedin: sns.linkedin ?? "", website: sns.website ?? "" }} /></section>
      </div>
    </main>
  </>;
}
