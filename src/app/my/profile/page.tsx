import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProfileEditor } from "../profile-editor";
import { DashNav } from "../dash-nav";

export const metadata: Metadata = { title: "내 프로필 카드 · FEATABLE" };

export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ setup?: string }> }) {
  const { setup } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/my/profile");

  const [{ data: founder }, { data: profile }] = await Promise.all([
    supabase.from("founders").select("id,founder_number,slug,name,role_title,headline,bio,avatar_url,sns").eq("user_id", user.id).maybeSingle(),
    supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
  ]);
  const sns = (founder?.sns ?? {}) as { instagram?: string; x?: string; linkedin?: string; website?: string };
  const interviewSetup = setup === "interview" && !founder;

  return <>
    <DashNav active="profile" />
    <main className="dash-page dash-settings">
      <div className="shell dash-settings-inner profile-settings-inner">
        <header><span>PROFILE CARD</span><h1>{interviewSetup ? "인터뷰 전에 프로필을 만들어주세요." : "내 프로필 카드"}</h1><p>{interviewSetup ? "작성자 정보를 먼저 등록하면 저장 후 인터뷰 작성 화면으로 바로 이어집니다. 가입 역할은 바뀌지 않아요." : "현재 역할과 만드는 사람으로서의 이야기를 소개해주세요. 브랜드가 없어도 만들 수 있어요."}</p></header>
        <section className="dash-profile-panel standalone"><ProfileEditor setupMode={interviewSetup} afterSaveHref={interviewSetup ? "/submit/interview" : undefined} initial={{ founderNumber: founder?.founder_number, slug: founder?.slug, name: founder?.name ?? profile?.full_name ?? "", role: founder?.role_title ?? "", headline: founder?.headline ?? "", bio: founder?.bio ?? "", avatarUrl: founder?.avatar_url ?? "", instagram: sns.instagram ?? "", x: sns.x ?? "", linkedin: sns.linkedin ?? "", website: sns.website ?? "" }} /></section>
      </div>
    </main>
  </>;
}
