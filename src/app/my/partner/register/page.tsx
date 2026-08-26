import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashNav } from "../../dash-nav";
import { PartnerSubmissionForm, type PartnerSubmissionRow } from "../partner-submission-form";

export const metadata: Metadata = { title: "파트너 등록 도구", robots: { index: false, follow: false } };

export default async function PartnerRegisterPage({ searchParams }: { searchParams: Promise<{ edit?: string; type?: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/my/partner/register");

  const { data: profile } = await supabase.from("profiles").select("member_type").eq("id", user.id).maybeSingle();

  const { data } = await supabase
    .from("partner_submissions")
    .select("id,submission_type,status,title,payload,review_note,updated_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });
  const { edit, type } = await searchParams;
  const initialType = profile?.member_type === "partner" && (type === "support" || type === "community") ? type : "event";

  return <>
    <DashNav />
    <main className="dash-page partner-register-page">
      <div className="shell dash-shell">
        <div className="partner-register-heading"><h1>기회를 등록하고<br />Founder와 연결하세요.</h1><span>작성 중에는 언제든 저장할 수 있고, 승인된 정보만 Featable에 공개됩니다.</span></div>
        <PartnerSubmissionForm submissions={(data ?? []) as PartnerSubmissionRow[]} initialId={edit} initialType={initialType} eventOnly={profile?.member_type !== "partner"} />
      </div>
    </main>
  </>;
}
