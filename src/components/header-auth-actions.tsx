"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * 헤더 우측 액션 이원화:
 * 비로그인 → 로그인 + "브랜드 올리기"(등록 전환 CTA)
 * 로그인   → "파운더 센터"(마이 허브)
 */
export function HeaderAuthActions() {
  const [authed, setAuthed] = useState(false);

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
      <Link className="button button-small nav-submit" href="/my">
        파운더 센터 <span>↗</span>
      </Link>
    );
  }

  return (
    <>
      <Link className="login-link" href="/login">
        로그인
      </Link>
      <Link className="button button-small nav-submit" href="/submit">
        브랜드 올리기 <span>↗</span>
      </Link>
    </>
  );
}
