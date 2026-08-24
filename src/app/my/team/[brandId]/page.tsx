import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashNav } from "../../dash-nav";
import { TeamProfileForm } from "./team-profile-form";

export const metadata: Metadata = { title: "팀 프로필 · FEATABLE" };

export default async function TeamProfilePage({ params }: { params: Promise<{ brandId: string }> }) {
  const { brandId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/my/team/${brandId}`);

  const { data: membership } = await supabase
    .from("brand_members")
    .select("display_name,title,bio,avatar_url,is_public,brand:brands(id,slug,name,logo_url)")
    .eq("brand_id", brandId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!membership) notFound();

  const brand = membership.brand as unknown as { id: string; slug: string; name: string; logo_url: string | null } | null;
  if (!brand) notFound();

  return <>
    <DashNav />
    <main className="dash-page dash-team-editor-page">
      <div className="shell dash-team-editor-shell">
        <header>
          <div><span>TEAM PROFILE</span><h1>{brand.name}에서<br />나는 어떤 사람인가요?</h1><p>계정 전체가 아닌, 이 팀에서의 역할과 소개를 설정합니다.</p></div>
          <Link href="/my">워크스페이스로 돌아가기 →</Link>
        </header>
        <TeamProfileForm initial={{
          brandId: brand.id,
          displayName: membership.display_name ?? "",
          title: membership.title ?? "팀 멤버",
          bio: membership.bio ?? "",
          avatarUrl: membership.avatar_url ?? "",
          isPublic: membership.is_public ?? true,
        }} />
      </div>
    </main>
  </>;
}
