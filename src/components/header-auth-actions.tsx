"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { LoginModal } from "@/components/login-modal";

/**
 * 헤더 우측 액션 이원화:
 * 비로그인 → 로그인(모달) + "브랜드 올리기"(등록 전환 CTA)
 * 로그인   → "파운더 센터"(마이 허브)
 */
export function HeaderAuthActions() {
  const [authed, setAuthed] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);

  useEffect(() => {
    try {
      const supabase = createClient();
      supabase.auth.getUser().then(({ data }) => setAuthed(Boolean(data.user)));
    } catch {
      // Supabase 미설정 환경(UI 개발용)에서는 비로그인 상태 유지
    }
  }, []);

  if (authed) {
    return (
      <div className="nav-submit-wrap">
        <Link className="button button-small nav-submit" href="/my">
          파운더 센터 <span>↗</span>
        </Link>
        <span className="nav-submit-hint">등록한 피쳐를 <b>한곳에서 관리</b></span>
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        className="login-link"
        onClick={() => setLoginOpen(true)}
      >
        로그인
      </button>
      <div className="nav-submit-wrap">
        <Link className="button button-small nav-submit" href="/submit">
          브랜드 올리기 <span>↗</span>
        </Link>
        <span className="nav-submit-hint">AI로 더 똑똑한 <b>피쳐 관리</b></span>
      </div>
      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
    </>
  );
}
