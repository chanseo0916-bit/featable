import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { StudioBrand } from "@/components/site-shell";
import { InterviewForm } from "./interview-form";

export const metadata: Metadata = { title: "인터뷰 등록 · FEATABLE" };

export default async function InterviewSubmitPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/submit/interview");
  const [{ data: founder }, { data: profile }] = await Promise.all([
    supabase.from("founders").select("id,name").eq("user_id", user.id).maybeSingle(),
    supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
  ]);
  const { data } = founder
    ? await supabase.from("brands").select("id,name").eq("founder_id", founder.id).order("created_at", { ascending: true })
    : { data: [] };
  const brands = data ?? [];
  const memberName = founder?.name || profile?.full_name || user.user_metadata?.full_name || user.user_metadata?.name || "Featable 멤버";

  return <>
    <div className="publish-console-nav simple-register-nav"><div className="shell"><StudioBrand /><nav><span className="active">인터뷰 등록</span></nav><Link href="/my">나가기</Link></div></div>
    <main className="simple-registration-page interview-registration-page">
      <div className="shell">
        <div className="simple-registration-heading"><span>FOUNDER INTERVIEW</span><h1>질문에 답하면 인터뷰가 완성됩니다.</h1><p>사진 한 장과 솔직한 답변이면 충분해요. 답한 질문만 인터뷰에 실립니다.</p></div>
        <InterviewForm brands={brands} founderName={memberName} />
      </div>
    </main>
  </>;
}
