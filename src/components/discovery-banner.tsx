"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export type DiscoveryBannerSlide = {
  href: string;
  imageUrl: string;
  eyebrow?: string;
  title: string;
  subtitle?: string;
};

/** 오늘의 발견 — 와이드 배너 캐러셀 (자동 슬라이드 + 하단 진행바) */
export function DiscoveryBanner({ slides }: { slides: DiscoveryBannerSlide[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = slides.length;

  useEffect(() => {
    if (paused || count < 2) return;
    const id = window.setInterval(() => setIndex((i) => (i + 1) % count), 5000);
    return () => window.clearInterval(id);
  }, [paused, count]);

  if (count === 0) return null;

  const go = (delta: number) => setIndex((i) => (i + delta + count) % count);

  return (
    <div
      className="discovery-banner-wrap"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="discovery-banner">
        {slides.map((slide, i) => (
          <Link
            href={slide.href}
            key={slide.href}
            className={`discovery-banner-slide ${i === index ? "active" : ""}`}
            aria-hidden={i !== index}
            tabIndex={i === index ? 0 : -1}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={slide.imageUrl} alt="" />
            <div className="discovery-banner-shade" />
            <div className="discovery-banner-copy">
              {slide.eyebrow && <span>{slide.eyebrow}</span>}
              <h2>{slide.title}</h2>
              {slide.subtitle && <p>{slide.subtitle}</p>}
            </div>
          </Link>
        ))}

        {count > 1 && (
          <div className="discovery-banner-control">
            <button type="button" onClick={() => go(-1)} aria-label="이전 배너">‹</button>
            <span>
              <b>{String(index + 1).padStart(2, "0")}</b> / {String(count).padStart(2, "0")}
            </span>
            <button type="button" onClick={() => go(1)} aria-label="다음 배너">›</button>
          </div>
        )}
      </div>

      <div className="discovery-banner-progress" aria-hidden>
        <span style={{ width: `${((index + 1) / count) * 100}%` }} />
      </div>
    </div>
  );
}
