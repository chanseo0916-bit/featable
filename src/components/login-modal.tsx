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
      className="fixed inset-0 z-[10000] grid place-items-center overflow-y-auto bg-black/55 p-3 backdrop-blur-sm sm:p-6"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="로그인"
    >
      <div
        className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="닫기"
          className="absolute right-3 top-3 z-20 grid h-10 w-10 place-items-center rounded-full border border-border bg-white/95 text-lg text-muted shadow-sm transition-colors hover:bg-accent-soft hover:text-accent sm:right-5 sm:top-5"
        >
          ✕
        </button>

        <div className="max-h-[calc(100dvh-1.5rem)] overflow-y-auto overscroll-contain px-5 pb-6 pt-7 sm:max-h-[calc(100dvh-3rem)] sm:px-8 sm:pb-8 sm:pt-8">
          <div className="mb-6 pr-10 text-center">
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
    </div>
  );
}
