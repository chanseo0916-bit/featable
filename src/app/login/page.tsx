import { Suspense } from "react";
import type { Metadata } from "next";
import { AuthForm } from "./auth-form";

export const metadata: Metadata = {
  title: "로그인 — FEATABLE",
  description: "Featable에 로그인하고 당신의 브랜드를 세상에 소개하세요.",
};

export default function LoginPage() {
  return (
    <main className="flex min-h-[70vh] items-center justify-center bg-white px-6 py-16">
      <div className="w-full max-w-sm">
        <p className="mb-2 text-[11px] font-extrabold tracking-[0.13em] text-accent">
          FEATABLE
        </p>
        <h1 className="mb-8 text-2xl font-bold tracking-tight text-foreground">
          창업가가 세상에
          <br />
          발견되기 시작하는 곳
        </h1>
        <Suspense>
          <AuthForm />
        </Suspense>
      </div>
    </main>
  );
}
