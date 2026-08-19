"use client";

import { useEffect } from "react";

/** 프로덕트 상세 조회수 적재 — 브라우저 세션당 slug 1회만 */
export function ViewTracker({ slug }: { slug: string }) {
  useEffect(() => {
    const key = `featable:viewed:${slug}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      // 시크릿 모드 등 storage 불가 시 그냥 1회 전송
    }
    fetch("/api/view", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug }),
      keepalive: true,
    }).catch(() => {});
  }, [slug]);

  return null;
}
