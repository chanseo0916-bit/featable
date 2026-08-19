"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export interface HomeBannerSlide {
  slug: string;
  title: string;
  excerpt: string;
  coverUrl: string;
}

interface HomeBannerCarouselProps {
  slides: HomeBannerSlide[];
}

const AUTOPLAY_DELAY = 6500;

export function HomeBannerCarousel({ slides }: HomeBannerCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isInteracting, setIsInteracting] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const shouldPause = isPaused || isInteracting;

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotionPreference = () => setPrefersReducedMotion(mediaQuery.matches);

    updateMotionPreference();
    mediaQuery.addEventListener("change", updateMotionPreference);
    return () => mediaQuery.removeEventListener("change", updateMotionPreference);
  }, []);

  useEffect(() => {
    if (shouldPause || prefersReducedMotion || slides.length < 2) return;

    const timer = window.setTimeout(() => {
      setActiveIndex((current) => (current + 1) % slides.length);
    }, AUTOPLAY_DELAY);

    return () => window.clearTimeout(timer);
  }, [activeIndex, prefersReducedMotion, shouldPause, slides.length]);

  if (slides.length === 0) return null;

  const goToSlide = (nextIndex: number) => {
    setActiveIndex((nextIndex + slides.length) % slides.length);
  };

  const goPrevious = () => goToSlide(activeIndex - 1);
  const goNext = () => goToSlide(activeIndex + 1);

  return (
    <section className="home-banner-wrap">
      <div
        className="home-banner-carousel"
        role="region"
        aria-roledescription="carousel"
        aria-label="추천 스토리 배너"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft") {
            event.preventDefault();
            goPrevious();
          } else if (event.key === "ArrowRight") {
            event.preventDefault();
            goNext();
          } else if (event.key === "Home") {
            event.preventDefault();
            goToSlide(0);
          } else if (event.key === "End") {
            event.preventDefault();
            goToSlide(slides.length - 1);
          }
        }}
        onMouseEnter={() => setIsInteracting(true)}
        onMouseLeave={() => setIsInteracting(false)}
        onFocus={() => setIsInteracting(true)}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
            setIsInteracting(false);
          }
        }}
      >
        <div className="home-banner-track">
          {slides.map((slide, index) => {
            const isActive = index === activeIndex;
            return (
              <article
                role="group"
                className={`home-banner-slide${isActive ? " is-active" : ""}`}
                key={slide.slug}
                aria-hidden={!isActive}
                aria-roledescription="slide"
                aria-label={`${index + 1} / ${slides.length}: ${slide.title}`}
              >
                <Link className="home-top-banner" href={`/stories/${slide.slug}`} tabIndex={isActive ? 0 : -1}>
                  <img src={slide.coverUrl} alt="" />
                  <div className="home-banner-shade" />
                  <div className="home-banner-copy">
                    <span>이번 주 추천 스토리</span>
                    <h1>{slide.title}</h1>
                    <p>{slide.excerpt}</p>
                    <strong>자세히 보기 <i aria-hidden="true">→</i></strong>
                  </div>
                </Link>
              </article>
            );
          })}
        </div>

        <div className="home-banner-control" aria-label="배너 탐색">
          <button className="home-banner-arrow" type="button" onClick={goPrevious} aria-label="이전 배너">‹</button>
          <span className="home-banner-counter" aria-live="polite"><b>{String(activeIndex + 1).padStart(2, "0")}</b> / {String(slides.length).padStart(2, "0")}</span>
          <button className="home-banner-arrow" type="button" onClick={goNext} aria-label="다음 배너">›</button>
          <button
            className="home-banner-play"
            type="button"
            onClick={() => setIsPaused((paused) => !paused)}
            aria-label={isPaused ? "배너 자동 재생" : "배너 자동 재생 일시정지"}
            aria-pressed={isPaused}
          >
            {isPaused ? "▶" : "Ⅱ"}
          </button>
        </div>
      </div>
    </section>
  );
}
