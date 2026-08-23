"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";
import { bypassImageOptimization } from "@/lib/images";

export type ProductSquareRailItem = {
  slug: string;
  name: string;
  tagline: string;
  heroUrl: string;
  category: string;
  brandName: string;
};

export function ProductSquareRail({ items }: { items: ProductSquareRailItem[] }) {
  const railRef = useRef<HTMLDivElement>(null);

  function scroll(direction: number) {
    const rail = railRef.current;
    if (!rail) return;
    rail.scrollBy({ left: direction * Math.min(rail.clientWidth * 0.78, 520), behavior: "smooth" });
  }

  if (items.length === 0) return null;

  return (
    <section className="product-discovery-rail" aria-labelledby="product-discovery-title">
      <header>
        <div><h2 id="product-discovery-title">이번 주 에디터 픽</h2></div>
        <div className="product-rail-actions">
          <Link href="/products">전체보기</Link>
          <button type="button" onClick={() => scroll(-1)} aria-label="이전 프로덕트">←</button>
          <button type="button" onClick={() => scroll(1)} aria-label="다음 프로덕트">→</button>
        </div>
      </header>

      <div className="product-square-track" ref={railRef}>
        {items.map((item, index) => (
          <Link className="product-square-card" href={`/products/${item.slug}`} key={item.slug}>
            <Image
              src={item.heroUrl}
              alt=""
              fill
              sizes="(max-width: 560px) 72vw, (max-width: 1100px) 36vw, 260px"
              preload={index < 2}
              unoptimized={bypassImageOptimization(item.heroUrl)}
            />
            <span className="product-square-shade" aria-hidden="true" />
            <span className="product-square-number">{String(index + 1).padStart(2, "0")}</span>
            <span className="product-square-copy">
              <small>{item.category} · {item.brandName}</small>
              <strong>{item.name}</strong>
              <em>{item.tagline}</em>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
