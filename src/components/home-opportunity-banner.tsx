"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { bypassImageOptimization } from "@/lib/images";

export type HomeOpportunitySlide = {
  href: string;
  type: "행사" | "지원사업";
  title: string;
  detail: string;
  badge: string;
  imageUrl?: string;
};

const fallbackSlides: HomeOpportunitySlide[] = [
  {
    href: "/support",
    type: "지원사업",
    title: "창업에 필요한 다음 기회를 찾아보세요",
    detail: "정부지원사업과 성장 기회를 한곳에서 확인하세요.",
    badge: "OPEN",
  },
  {
    href: "/events",
    type: "행사",
    title: "만드는 사람들의 다음 만남",
    detail: "창업가와 빌더를 위한 행사 소식을 준비하고 있어요.",
    badge: "COMING SOON",
  },
];

export function HomeOpportunityBanner({ slides }: { slides: HomeOpportunitySlide[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const visibleSlides = slides.length > 0 ? slides : fallbackSlides;

  useEffect(() => {
    if (paused || visibleSlides.length < 2) return;
    const timer = window.setInterval(() => setIndex((current) => (current + 1) % visibleSlides.length), 6000);
    return () => window.clearInterval(timer);
  }, [paused, visibleSlides.length]);

  const go = (direction: number) => setIndex((current) => (current + direction + visibleSlides.length) % visibleSlides.length);

  return (
    <section className="home-opportunity-wrap" aria-label="다가오는 행사와 지원사업">
      <div
        className="home-opportunity-banner"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        {visibleSlides.map((slide, slideIndex) => (
          <Link
            href={slide.href}
            key={`${slide.type}-${slide.href}`}
            className={`home-opportunity-slide ${slide.type === "지원사업" ? "is-support" : "is-event"} ${slide.imageUrl ? "has-image" : "no-image"}${slideIndex === index ? " active" : ""}`}
            aria-hidden={slideIndex !== index}
            tabIndex={slideIndex === index ? 0 : -1}
          >
            {slide.imageUrl && (
              <Image
                src={slide.imageUrl}
                alt=""
                fill
                sizes="(max-width: 760px) 100vw, 1180px"
                preload={slideIndex === 0}
                unoptimized={bypassImageOptimization(slide.imageUrl)}
              />
            )}
            <span className="home-opportunity-pattern" aria-hidden="true" />
            <span className="home-opportunity-shade" aria-hidden="true" />
            <span className="home-opportunity-copy">
              <span className="home-opportunity-eyebrow"><b>{slide.type}</b>{slide.badge}</span>
              <strong>{slide.title}</strong>
              <small>{slide.detail}</small>
              <em>자세히 보기 <i aria-hidden="true">→</i></em>
            </span>
          </Link>
        ))}

        {visibleSlides.length > 1 && (
          <div className="home-opportunity-control" aria-label="배너 탐색">
            <button type="button" onClick={() => go(-1)} aria-label="이전 배너">‹</button>
            <span><b>{String(index + 1).padStart(2, "0")}</b> / {String(slides.length).padStart(2, "0")}</span>
            <button type="button" onClick={() => go(1)} aria-label="다음 배너">›</button>
          </div>
        )}
      </div>
    </section>
  );
}
