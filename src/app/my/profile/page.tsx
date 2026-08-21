import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProfileEditor } from "../profile-editor";
import { StudioNav } from "../studio-nav";

export const metadata: Metadata = { title: "내 팀 프로필 · FEATABLE" };

export default async function FounderProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/my/profile");

  const { data: founder } = await supabase.from("founders").select("id,founder_number,slug,name,headline,bio,avatar_url,sns").eq("user_id", user.id).maybeSingle();
  const sns = (founder?.sns ?? {}) as { instagram?: string; x?: string; linkedin?: string; website?: string };
  const { count } = founder
    ? await supabase.from("brands").select("id", { count: "exact", head: true }).eq("founder_id", founder.id)
    : { count: 0 };

  return <>
    <StudioNav active="profile" founder />
    <main className="studio-dashboard studio-settings-page">
      <div className="shell studio-settings-inner profile-settings-inner">
        <header><span>TEAM PROFILE</span><h1>내 팀 프로필</h1><p>내 브랜드에서 맡은 역할과 만드는 사람으로서의 이야기를 소개해주세요.</p></header>
        <section className="studio-profile-panel standalone"><ProfileEditor brandCount={count ?? 0} initial={{ founderNumber: founder?.founder_number, slug: founder?.slug, name: founder?.name ?? "", headline: founder?.headline ?? "", bio: founder?.bio ?? "", avatarUrl: founder?.avatar_url ?? "", instagram: sns.instagram ?? "", x: sns.x ?? "", linkedin: sns.linkedin ?? "", website: sns.website ?? "" }} /></section>
      </div>
    </main>
  </>;
}
