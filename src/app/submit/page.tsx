import type { Metadata } from "next";
import { randomUUID } from "node:crypto";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SubmitWizard } from "./wizard";
import { loadSubmissionDraft } from "./actions";
import { StudioBrand } from "@/components/site-shell";

export const metadata: Metadata = {
  title: "브랜드 등록 — FEATABLE",
  description: "10분 안에 당신의 브랜드를 세상에 소개하세요.",
};

// 미들웨어가 비로그인 접근을 /login으로 돌려보낸다
export default async function SubmitPage({ searchParams }: { searchParams: Promise<{ draft?: string }> }) {
  const { draft } = await searchParams;
  if (!draft) redirect(`/submit?draft=${randomUUID()}`);
  const draftKey = draft.slice(0, 80);
  const saved = await loadSubmissionDraft(draftKey);
  return (
    <>
      <div className="publish-console-nav"><div className="shell"><StudioBrand /><nav><a className="active" href="#editor" data-submit-step="0">브랜드 관리</a><a href="#editor" data-submit-step="2">프로덕트</a><a href="#editor" data-submit-step="3">상세페이지</a><a href="#editor" data-submit-step="4">공개 설정</a></nav><Link href="/my">내 워크스페이스 →</Link></div></div>
      <div className="publish-console-tabs"><div className="shell"><a className="active" href="#editor" data-submit-step="0">등록 현황</a><a href="#editor" data-submit-step="0">기본 정보</a><a href="#editor" data-submit-step="3">콘텐츠 관리</a><a href="#editor" data-submit-step="4">공개 설정</a></div></div>
      <main className="submit-page"><SubmitWizard draftKey={draftKey} initial={saved?.draft} initialStep={saved?.step} initialSavedAt={saved?.savedAt} /></main>
    </>
  );
}
