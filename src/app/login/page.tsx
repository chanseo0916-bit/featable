import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { AuthForm } from "./auth-form";

export const metadata: Metadata = {
  title: "로그인",
  description: "Featable에 로그인하고 당신의 브랜드를 세상에 소개하세요.",
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-5 py-14">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-white p-8 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.25)]">
        <div className="mb-6 text-center">
          <Link href="/" className="inline-block" aria-label="Featable 홈으로 돌아가기">
            <Image
              src="/featable-logo.png"
              alt="FEATABLE"
              width={128}
              height={24}
              priority
              className="mx-auto mb-3 h-auto w-32"
            />
          </Link>
          <p className="text-sm text-muted">창업가가 세상에 발견되기 시작하는 곳</p>
        </div>

        <Suspense>
          <AuthForm />
        </Suspense>

        <Link
          href="/"
          className="mt-6 block text-center text-xs font-semibold text-muted transition-colors hover:text-accent"
        >
          ← 홈으로 돌아가기
        </Link>
      </div>
    </main>
  );
}
