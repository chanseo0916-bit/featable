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
  const [seenInitial, setSeenInitial] = useState(initialCount);

  // 서버에서 새 값이 내려오면 렌더 중에 맞춘다 (이펙트에서 setState 하지 않기)
  if (seenInitial !== initialCount) {
    setSeenInitial(initialCount);
    setCount(initialCount);
  }

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
