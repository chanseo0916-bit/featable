import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { AuthForm } from "./auth-form";

export const metadata: Metadata = {
  title: "로그인·회원가입",
  description: "Featable에 가입하고 새로운 창업가, 브랜드와 제품을 만나보세요.",
  robots: { index: false, follow: false },
};

const benefits = [
  ["01", "프로덕트 등록", "직접 만든 제품과 브랜드를 한 페이지에 소개하세요."],
  ["02", "실시간 발견", "조회수와 반응을 확인하고 새로운 사용자를 만나세요."],
  ["03", "기회 연결", "행사·지원사업·커뮤니티를 한곳에서 찾아보세요."],
] as const;

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-[#f5f5f3] px-4 py-5 sm:px-6 sm:py-8">
      <div className="mx-auto grid min-h-[calc(100vh-40px)] max-w-6xl overflow-hidden rounded-[28px] border border-border bg-white lg:grid-cols-[0.86fr_1.14fr]">
        <aside className="relative hidden flex-col justify-between overflow-hidden bg-[#111] p-12 text-white lg:flex">
          <div className="absolute -right-24 -top-24 size-72 rounded-full bg-accent" />
          <div className="absolute -bottom-32 -left-20 size-80 rounded-full border-[70px] border-white/[0.04]" />
          <Link href="/" className="relative z-10 w-fit" aria-label="Featable 홈"><Image src="/featable-logo.png" alt="FEATABLE" width={150} height={30} priority className="h-auto w-[150px] brightness-0 invert" /></Link>
          <div className="relative z-10 my-16">
            <p className="mb-4 text-xs font-extrabold tracking-[0.2em] text-[#ff765f]">지금 만드는 것을 알려주세요</p>
            <h2 className="max-w-md text-[46px] font-black leading-[1.08] tracking-[-0.06em]">만들고 있는 것을<br />세상에 보여주세요.</h2>
            <p className="mt-5 max-w-sm text-sm leading-6 text-white/55">계정 하나로 Founder 프로필부터 브랜드, 제품, 스토리까지 직접 관리할 수 있습니다.</p>
            <div className="mt-10 space-y-1">
              {benefits.map(([number, title, copy]) => <div key={number} className="grid grid-cols-[34px_1fr] gap-3 border-t border-white/10 py-4"><span className="text-xs font-black text-[#ff765f]">{number}</span><div><strong className="text-sm">{title}</strong><p className="mt-1 text-xs leading-5 text-white/45">{copy}</p></div></div>)}
            </div>
          </div>
          <p className="relative z-10 text-xs text-white/30">FEATABLE</p>
        </aside>

        <section className="flex items-center justify-center px-5 py-10 sm:px-10 lg:px-14">
          <div className="w-full max-w-xl">
            <div className="mb-8 flex items-center justify-between lg:hidden">
              <Link href="/" aria-label="Featable 홈"><Image src="/featable-logo.png" alt="FEATABLE" width={136} height={27} priority className="h-auto w-32" /></Link>
              <Link href="/" className="text-xs font-bold text-muted hover:text-accent">홈으로 →</Link>
            </div>
            <Suspense><AuthForm /></Suspense>
            <Link href="/" className="mt-6 hidden text-center text-xs font-semibold text-muted transition hover:text-accent lg:block">← 둘러보기로 돌아가기</Link>
          </div>
        </section>
      </div>
    </main>
  );
}
