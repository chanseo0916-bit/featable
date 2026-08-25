import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { StudioBrand } from "@/components/site-shell";
import { InterviewForm, INTERVIEW_QUESTIONS, type InterviewFormInitialValue } from "./interview-form";

export const metadata: Metadata = { title: "인터뷰 등록 · FEATABLE" };

export default async function InterviewSubmitPage({ searchParams }: { searchParams: Promise<{ edit?: string }> }) {
  const { edit } = await searchParams;
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
  let initial: InterviewFormInitialValue | undefined;
  if (edit) {
    if (!founder) notFound();
    const { data: interview } = await supabase
      .from("features")
      .select("slug,title,cover_url,brand_id,founder_id,hook_intro,hook_label,body,kind")
      .eq("slug", edit)
      .eq("kind", "interview")
      .maybeSingle();
    if (!interview || interview.founder_id !== founder.id) notFound();
    const blocks = Array.isArray(interview.body)
      ? interview.body as { type?: string; heading?: string; body?: string }[]
      : [];
    initial = {
      slug: interview.slug,
      brandId: interview.brand_id ?? "",
      hookIntro: interview.hook_intro ?? "",
      title: interview.title,
      hookLabel: interview.hook_label ?? "",
      coverUrl: interview.cover_url ?? "",
      answers: Object.fromEntries(INTERVIEW_QUESTIONS.map((question) => [
        question.key,
        blocks.find((block) => block.type === "text" && block.heading === question.label)?.body ?? "",
      ])),
    };
  }

  return <>
    <div className="publish-console-nav simple-register-nav"><div className="shell"><StudioBrand /><nav><span className="active">{initial ? "인터뷰 수정" : "인터뷰 등록"}</span></nav><Link href="/my">나가기</Link></div></div>
    <main className="simple-registration-page interview-registration-page">
      <div className="shell">
        <div className="simple-registration-heading"><span>파운더 인터뷰</span><h1>{initial ? "내 인터뷰를 수정합니다." : "질문에 답하면 인터뷰가 완성됩니다."}</h1><p>{initial ? "저장하면 현재 공개된 인터뷰에 바로 반영됩니다." : "사진 한 장과 솔직한 답변이면 충분해요. 답한 질문만 인터뷰에 실립니다."}</p></div>
        <InterviewForm brands={brands} founderName={memberName} initial={initial} />
      </div>
    </main>
  </>;
}
