"use client";

import { useRef } from "react";

/**
 * 홈 "새로 등록된 프로덕트" 가로 슬라이드 래퍼.
 * 카드 렌더링은 서버(children)에서 하고, 여기서는 스크롤 컨트롤만 담당한다.
 */
export function FreshProductRail({ header, showControls, children }: { header: React.ReactNode; showControls: boolean; children: React.ReactNode }) {
  const railRef = useRef<HTMLDivElement>(null);

  function scroll(direction: number) {
    const rail = railRef.current;
    if (!rail) return;
    rail.scrollBy({ left: direction * Math.min(rail.clientWidth * 0.9, 560), behavior: "smooth" });
  }

  return (
    <>
      <header className="fresh-rail-head">
        {header}
        {showControls && <div className="product-rail-actions">
          <button type="button" onClick={() => scroll(-1)} aria-label="이전 프로덕트">←</button>
          <button type="button" onClick={() => scroll(1)} aria-label="다음 프로덕트">→</button>
        </div>}
      </header>
      <div className="fresh-rail-track" ref={railRef}>{children}</div>
    </>
  );
}
