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

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-12 sm:px-6">
      <div className="w-full max-w-md">
        <div className="mb-14 flex justify-center">
          <Link href="/" aria-label="Featable 홈"><Image src="/featable-logo.png" alt="FEATABLE" width={136} height={27} priority className="h-auto w-32" /></Link>
        </div>
        <Suspense><AuthForm /></Suspense>
      </div>
    </main>
  );
}
