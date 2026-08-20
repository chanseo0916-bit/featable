"use client";

import { useEffect, useState } from "react";

export function ProductViewMetric({ slug, initialCount }: { slug: string; initialCount: number }) {
  const [count, setCount] = useState(initialCount);

  useEffect(() => {
    let cancelled = false;

    const sync = async () => {
      const key = `featable:viewed:product:${slug}`;
      let shouldTrack = true;
      try {
        shouldTrack = !sessionStorage.getItem(key);
        if (shouldTrack) sessionStorage.setItem(key, "1");
      } catch {
        // Storage can be unavailable in privacy-restricted browsers.
      }

      if (shouldTrack) {
        await fetch("/api/view", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug, type: "product" }),
          keepalive: true,
        }).catch(() => {});
      }

      try {
        const response = await fetch("/api/view?type=product", { cache: "no-store" });
        if (!response.ok) return;
        const payload = await response.json() as { counts?: Record<string, number> };
        const nextCount = payload.counts?.[slug];
        if (!cancelled && typeof nextCount === "number") setCount(nextCount);
      } catch {
        // Keep the server-rendered count if analytics is unavailable.
      }
    };

    sync();
    return () => { cancelled = true; };
  }, [slug]);

  return <span>조회 {count.toLocaleString("ko-KR")}</span>;
}
