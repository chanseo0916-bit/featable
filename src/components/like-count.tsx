"use client";

import { useEffect, useState } from "react";

/** SaveButton 이 좋아요를 토글하면 같은 페이지의 카운트도 바로 따라 움직인다 */
const SAVE_CHANGED = "featable:save-changed";

export function LikeCount({
  itemType,
  slug,
  initialCount,
}: {
  itemType: string;
  slug: string;
  initialCount: number;
}) {
  const [count, setCount] = useState(initialCount);

  useEffect(() => setCount(initialCount), [initialCount]);

  useEffect(() => {
    const onChange = (event: Event) => {
      const detail = (event as CustomEvent<{ itemType: string; slug: string; saved: boolean }>).detail;
      if (detail.itemType !== itemType || detail.slug !== slug) return;
      setCount((value) => Math.max(0, value + (detail.saved ? 1 : -1)));
    };
    window.addEventListener(SAVE_CHANGED, onChange);
    return () => window.removeEventListener(SAVE_CHANGED, onChange);
  }, [itemType, slug]);

  return <strong>{count.toLocaleString("ko-KR")}</strong>;
}
