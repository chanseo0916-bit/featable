"use client";

import { useEffect } from "react";

/** 상세 조회수 적재 — 브라우저 세션당 콘텐츠별 1회만 */
export function ViewTracker({ slug, type = "product" }: { slug: string; type?: "product" | "feature" }) {
  useEffect(() => {
    const key = `featable:viewed:${type}:${slug}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      // 시크릿 모드 등 storage 불가 시 그냥 1회 전송
    }
    fetch("/api/view", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, type }),
      keepalive: true,
    }).catch(() => {});
  }, [slug, type]);

  return null;
}
