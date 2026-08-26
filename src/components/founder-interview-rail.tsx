"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";
import { bypassImageOptimization } from "@/lib/images";

export type FounderInterviewRailItem = {
  slug: string;
  /** 훅 1줄: "03년생, 24살" */
  hookIntro?: string;
  /** 훅 2줄: "연구용 AI 스타트업 대표" */
  title: string;
  /** 훅 3줄: 꺾쇠 안에 들어갈 "브랜드명 이름" */
  label: string;
  coverUrl: string;
  /** 표지 이미지에 이미 글자가 박혀 있으면 false — 텍스트를 겹쳐 쓰지 않는다 */
  showOverlay?: boolean;
};

/**
 * 홈 상단 "이번 주의 창업가" — 인스타형 훅 카드 그리드.
 * 사진 위에 훅 텍스트를 HTML로 얹는다 (이미지에 글자를 굽지 않음).
 */
export function FounderInterviewRail({ items }: { items: FounderInterviewRailItem[] }) {
  const railRef = useRef<HTMLDivElement>(null);

  function scroll(direction: number) {
    const rail = railRef.current;
    if (!rail) return;
    rail.scrollBy({ left: direction * Math.min(rail.clientWidth * 0.78, 520), behavior: "smooth" });
  }

  if (items.length === 0) return null;

  return (
    <section className="product-discovery-rail founder-interview-rail" aria-labelledby="founder-interview-title">
      <header>
        <div><h2 id="founder-interview-title">이번 주 인기 인터뷰</h2></div>
        <div className="product-rail-actions">
          <Link href="/stories">전체보기</Link>
          <button type="button" onClick={() => scroll(-1)} aria-label="이전 창업가">←</button>
          <button type="button" onClick={() => scroll(1)} aria-label="다음 창업가">→</button>
        </div>
      </header>

      <div className="product-square-track" ref={railRef}>
        {items.map((item, index) => {
          const overlay = item.showOverlay !== false;
          return (
            <Link className={`founder-hook-card${overlay ? "" : " is-bare"}`} href={`/stories/${item.slug}`} key={item.slug}>
              <Image
                src={item.coverUrl}
                alt={overlay ? item.label : `${item.title} · ${item.label}`}
                fill
                sizes="(max-width: 560px) 72vw, (max-width: 1100px) 36vw, 260px"
                preload={index < 2}
                unoptimized={bypassImageOptimization(item.coverUrl)}
              />
              {overlay && <>
                <span className="founder-hook-shade" aria-hidden="true" />
                <span className="founder-hook-copy">
                  {item.hookIntro && <strong>{item.hookIntro}</strong>}
                  <strong>{item.title}</strong>
                  <small>&lt;{item.label}&gt;</small>
                </span>
              </>}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
