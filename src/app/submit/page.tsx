import type { Metadata } from "next";
import { Header } from "@/components/site-shell";
import { SubmitWizard } from "./wizard";

export const metadata: Metadata = {
  title: "브랜드 등록 — FEATABLE",
  description: "10분 안에 당신의 브랜드를 세상에 소개하세요.",
};

// 미들웨어가 비로그인 접근을 /login으로 돌려보낸다
export default function SubmitPage() {
  return (
    <><Header /><main className="submit-page"><div className="submit-page-heading"><p>SELF-SERVE PUBLISHING</p><h1>당신의 브랜드를<br />직접 세상에 올려보세요.</h1><span>입력부터 상세페이지 제작, 미리보기, 공개까지 한 번에 진행합니다.</span></div><SubmitWizard /></main></>
  );
}
