import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isMemberType, type MemberType } from "@/lib/auth";
import { StudioNav } from "../studio-nav";
import { RoleSwitcher } from "../role-switcher";

export const metadata: Metadata = { title: "계정 설정 · FEATABLE" };

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/my/settings");

  const { data: profile } = await supabase.from("profiles").select("full_name,member_type").eq("id", user.id).maybeSingle();
  const memberType: MemberType = isMemberType(profile?.member_type ?? "") ? profile!.member_type as MemberType : "founder";

  return <>
    <StudioNav active="settings" founder={memberType === "founder"} />
    <main className="studio-dashboard studio-settings-page">
      <div className="shell studio-settings-inner">
        <header><span>ACCOUNT</span><h1>계정 설정</h1><p>로그인 정보와 Featable에서 사용할 역할을 관리합니다.</p></header>
        <section className="studio-settings-card">
          <div><strong>로그인 계정</strong><span>{profile?.full_name || "이름 미설정"}</span><small>{user.email}</small></div>
        </section>
        <section className="studio-settings-card role-card">
          <div><strong>내 역할</strong><span>주로 하려는 일에 맞는 화면과 기능을 보여드려요.</span><small>언제든 다시 변경할 수 있습니다.</small></div>
          <RoleSwitcher memberType={memberType} />
        </section>
      </div>
    </main>
  </>;
}
