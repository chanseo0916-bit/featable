"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { LoginModal } from "@/components/login-modal";
import { NotificationCenter } from "@/components/notification-center";
import { LogoutButton } from "@/components/logout-button";

/**
 * 헤더 우측 액션 이원화:
 * 비로그인 → 로그인(모달) + "브랜드 올리기"(등록 전환 CTA)
 * 로그인   → "파운더 센터"(마이 허브)
 */
export function HeaderAuthActions() {
  const [authed, setAuthed] = useState(false);
  const [profileHref, setProfileHref] = useState("/my/profile");
  const [loginOpen, setLoginOpen] = useState(false);

  useEffect(() => {
    let active = true;

    try {
      const supabase = createClient();
      supabase.auth.getUser().then(async ({ data }) => {
        if (!active) return;

        const user = data.user;
        setAuthed(Boolean(user));
        if (!user) return;

        const { data: founder } = await supabase
          .from("founders")
          .select("slug")
          .eq("user_id", user.id)
          .maybeSingle();

        if (active && founder?.slug) {
          setProfileHref(`/founders/${founder.slug}`);
        }
      });
    } catch {
      // Supabase 미설정 환경(UI 개발용)에서는 비로그인 상태 유지
    }

    return () => {
      active = false;
    };
  }, []);

  if (authed) {
    return (
      <>
        <NotificationCenter />
        <LogoutButton />
        <Link
          className="header-profile-card-link"
          href={profileHref}
          aria-label="내 프로필 카드 보기"
          title="내 프로필 카드 보기"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24">
            <rect x="3" y="5" width="18" height="14" rx="2" />
            <circle cx="9" cy="11" r="2" />
            <path d="M6 16c.7-1.5 1.7-2.2 3-2.2s2.3.7 3 2.2M14 10h4M14 14h4" />
          </svg>
          <span>내 프로필 카드</span>
        </Link>
        <div className="nav-submit-wrap">
          <Link className="button button-small nav-submit" href="/my">
            파운더 센터 <span>↗</span>
          </Link>
          <span className="nav-submit-hint">등록한 피쳐를 <b>한곳에서 관리</b></span>
        </div>
      </>
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
          프로필 만들기 <span>↗</span>
        </Link>
        <span className="nav-submit-hint">나만의 <b>프로필 카드 만들기</b></span>
      </div>
      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
    </>
  );
}
