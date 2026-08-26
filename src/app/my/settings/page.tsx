import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isMemberType, type MemberType } from "@/lib/auth";
import { DashNav } from "../dash-nav";
import { RoleSwitcher } from "../role-switcher";
import { MarketingPreference } from "./marketing-preference";
import { NotificationEmailPreference } from "./notification-email-preference";

export const metadata: Metadata = { title: "계정 설정 · FEATABLE" };

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/my/settings");

  let { data: profile, error: profileError } = await supabase.from("profiles").select("full_name,member_type,marketing_agreed_at,notification_email").eq("id", user.id).maybeSingle();
  if (profileError && profileError.message.includes("notification_email")) {
    const fallback = await supabase.from("profiles").select("full_name,member_type,marketing_agreed_at").eq("id", user.id).maybeSingle();
    profile = fallback.data ? { ...fallback.data, notification_email: null } : null;
    profileError = fallback.error;
  }
  const memberType: MemberType = isMemberType(profile?.member_type ?? "") ? profile!.member_type as MemberType : "founder";

  return <>
    <DashNav active="settings" founder={memberType === "founder"} />
    <main className="dash-page dash-settings">
      <div className="shell dash-settings-inner">
        <header><span>ACCOUNT</span><h1>계정 설정</h1><p>로그인 정보와 Featable에서 사용할 역할을 관리합니다.</p></header>
        <section className="dash-settings-card">
          <div><strong>로그인 계정</strong><span>{profile?.full_name || "이름 미설정"}</span><small>{user.email}</small></div>
        </section>
        <section className="dash-settings-card notification-email-card">
          <div><strong>운영 알림 이메일</strong><span>행사 신청과 공동 주최 알림을 받을 주소예요.</span><small>로그인 이메일은 변경되지 않습니다.</small></div>
          <NotificationEmailPreference initialEmail={profile?.notification_email || user.email || ""} />
        </section>
        <section className="dash-settings-card role-card">
          <div><strong>내 역할</strong><span>주로 하려는 일에 맞는 화면과 기능을 보여드려요.</span><small>언제든 다시 변경할 수 있습니다.</small></div>
          <RoleSwitcher memberType={memberType} />
        </section>
        <section className="dash-settings-card marketing-card">
          <div><strong>인터뷰·마케팅 이메일</strong><span>새로운 Founder 인터뷰와 Featable의 주요 소식을 받아보세요.</span><small>언제든 수신을 중단할 수 있습니다.</small></div>
          <MarketingPreference initialEnabled={Boolean(profile?.marketing_agreed_at)} />
        </section>
      </div>
    </main>
  </>;
}
