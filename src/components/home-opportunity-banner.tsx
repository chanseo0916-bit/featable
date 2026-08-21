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

export function HomeOpportunityBanner({ slides }: { slides: HomeOpportunitySlide[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || slides.length < 2) return;
    const timer = window.setInterval(() => setIndex((current) => (current + 1) % slides.length), 6000);
    return () => window.clearInterval(timer);
  }, [paused, slides.length]);

  if (slides.length === 0) return null;

  const go = (direction: number) => setIndex((current) => (current + direction + slides.length) % slides.length);

  return (
    <section className="home-opportunity-wrap" aria-label="다가오는 행사와 지원사업">
      <div
        className="home-opportunity-banner"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        {slides.map((slide, slideIndex) => (
          <Link
            href={slide.href}
            key={`${slide.type}-${slide.href}`}
            className={`home-opportunity-slide ${slide.type === "지원사업" ? "is-support" : "is-event"}${slideIndex === index ? " active" : ""}`}
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

        {slides.length > 1 && (
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
