"use client";

import { useEffect, useState } from "react";

/** 상세 조회수 적재: 브라우저 세션당 콘텐츠별 한 번 */
export function ViewTracker({ slug, type = "product" }: { slug: string; type?: "product" | "feature" | "event" }) {
  useEffect(() => {
    const key = `featable:viewed:${type}:${slug}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      // storage를 사용할 수 없는 환경에서는 요청을 전송합니다.
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

export function FeatureViewMetric({ slug, initialCount }: { slug: string; initialCount: number }) {
  const [count, setCount] = useState(initialCount);

  useEffect(() => {
    let cancelled = false;

    const sync = async () => {
      const key = `featable:viewed:feature:${slug}`;
      let shouldTrack = true;
      try {
        shouldTrack = !sessionStorage.getItem(key);
        if (shouldTrack) sessionStorage.setItem(key, "1");
      } catch {
        // storage를 사용할 수 없는 환경에서는 요청을 전송합니다.
      }

      if (shouldTrack) {
        await fetch("/api/view", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug, type: "feature" }),
          keepalive: true,
        }).catch(() => {});
      }

      try {
        const response = await fetch("/api/view?type=feature", { cache: "no-store" });
        if (!response.ok) return;
        const payload = await response.json() as { counts?: Record<string, number> };
        const nextCount = payload.counts?.[slug];
        if (!cancelled && typeof nextCount === "number") setCount(nextCount);
      } catch {
        // 서버 집계가 준비되지 않은 환경에서는 초기 조회수를 유지합니다.
      }
    };

    sync();
    return () => { cancelled = true; };
  }, [slug]);

  return <div className="feature-discovery-metric"><strong>{count.toLocaleString("ko-KR")}</strong><span>회 조회</span><i>실시간</i></div>;
}
