import type { Metadata } from "next";
import Link from "next/link";
import { SubmitWizard } from "./wizard";
import { loadSubmissionDraft } from "./actions";

export const metadata: Metadata = {
  title: "브랜드 등록 — FEATABLE",
  description: "10분 안에 당신의 브랜드를 세상에 소개하세요.",
};

// 미들웨어가 비로그인 접근을 /login으로 돌려보낸다
export default async function SubmitPage() {
  const saved = await loadSubmissionDraft();
  return (
    <>
      <div className="publish-console-nav"><div className="shell"><strong><i>F</i> FEATABLE STUDIO</strong><nav><a className="active" href="#editor">브랜드 관리</a><a href="#products">프로덕트</a><a href="#story">상세페이지</a><a href="#publish">공개 설정</a></nav><Link href="/my">내 워크스페이스 →</Link></div></div>
      <div className="publish-console-tabs"><div className="shell"><a className="active" href="#editor">등록 현황</a><a href="#editor">기본 정보</a><a href="#story">콘텐츠 관리</a><a href="#publish">공개 설정</a></div></div>
      <main className="submit-page"><SubmitWizard initial={saved?.draft} initialStep={saved?.step} /></main>
    </>
  );
}
