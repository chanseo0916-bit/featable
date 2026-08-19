import type { Metadata } from "next";
import { SubmitWizard } from "./wizard";

export const metadata: Metadata = {
  title: "브랜드 등록 — FEATABLE",
  description: "10분 안에 당신의 브랜드를 세상에 소개하세요.",
};

// 미들웨어가 비로그인 접근을 /login으로 돌려보낸다
export default function SubmitPage() {
  return (
    <main className="bg-white px-6 pt-14">
      <SubmitWizard />
    </main>
  );
}
