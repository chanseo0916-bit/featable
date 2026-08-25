"use client";

import { useEffect } from "react";

/** 게시글 상세 조회수: 같은 브라우저 세션에서는 한 번만 기록합니다. */
export function BoardViewTracker({ postId }: { postId: string }) {
  useEffect(() => {
    const key = `featable:viewed:board:${postId}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      // Storage가 제한된 환경도 서버의 HttpOnly 세션 쿠키로 중복됩니다.
    }

    fetch("/api/board/view", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postId }),
      keepalive: true,
    }).catch(() => {});
  }, [postId]);

  return null;
}
