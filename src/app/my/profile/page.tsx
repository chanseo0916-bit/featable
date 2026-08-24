import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProfileEditor } from "../profile-editor";
import { DashNav } from "../dash-nav";

export const metadata: Metadata = { title: "내 프로필 카드 · FEATABLE" };

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/my/profile");

  const { data: founder } = await supabase.from("founders").select("id,founder_number,slug,name,role_title,headline,bio,avatar_url,sns").eq("user_id", user.id).maybeSingle();
  const sns = (founder?.sns ?? {}) as { instagram?: string; x?: string; linkedin?: string; website?: string };

  return <>
    <DashNav active="profile" />
    <main className="dash-page dash-settings">
      <div className="shell dash-settings-inner profile-settings-inner">
        <header><span>PROFILE CARD</span><h1>내 프로필 카드</h1><p>현재 역할과 만드는 사람으로서의 이야기를 소개해주세요. 브랜드가 없어도 만들 수 있어요.</p></header>
        <section className="dash-profile-panel standalone"><ProfileEditor initial={{ founderNumber: founder?.founder_number, slug: founder?.slug, name: founder?.name ?? "", role: founder?.role_title ?? "", headline: founder?.headline ?? "", bio: founder?.bio ?? "", avatarUrl: founder?.avatar_url ?? "", instagram: sns.instagram ?? "", x: sns.x ?? "", linkedin: sns.linkedin ?? "", website: sns.website ?? "" }} /></section>
      </div>
    </main>
  </>;
}
