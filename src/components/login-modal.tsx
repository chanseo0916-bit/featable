"use client";

import { Suspense, useEffect } from "react";
import Image from "next/image";
import { AuthForm } from "@/app/login/auth-form";

export function LoginModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  // ESC로 닫기 + 배경 스크롤 잠금
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-5 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="로그인"
    >
      <div
        className="relative w-full max-w-sm rounded-2xl bg-white p-8 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="닫기"
          className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full text-muted transition-colors hover:bg-accent-soft hover:text-accent"
        >
          ✕
        </button>

        <div className="mb-6 text-center">
          <Image
            src="/featable-logo.png"
            alt="FEATABLE"
            width={128}
            height={24}
            className="mx-auto mb-3 h-auto w-32"
          />
          <p className="text-sm text-muted">
            창업가가 세상에 발견되기 시작하는 곳
          </p>
        </div>

        <Suspense>
          <AuthForm />
        </Suspense>
      </div>
    </div>
  );
}
