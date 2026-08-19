"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import styles from "./live-feature-ranking.module.css";

export type RankedFeatureItem = {
  slug: string;
  title: string;
  coverUrl: string;
  brandName: string;
  founderName: string;
  category: string; // 프로덕트 카테고리 (AI, SaaS, F&B …)
  viewCount: number;
  href?: string;
};

type LiveFeatureRankingProps = {
  productItems: RankedFeatureItem[];
  featureItems: RankedFeatureItem[];
};

function isCountsResponse(value: unknown): value is { counts: Record<string, number> } {
  if (typeof value !== "object" || value === null || !("counts" in value)) {
    return false;
  }

  const counts = value.counts;
  return (
    typeof counts === "object" &&
    counts !== null &&
    Object.values(counts).every(
      (count) => typeof count === "number" && Number.isFinite(count),
    )
  );
}

function formatViewCount(viewCount: number) {
  return viewCount.toLocaleString("ko-KR");
}

export function LiveFeatureRanking({ productItems, featureItems }: LiveFeatureRankingProps) {
  const componentId = useId();
  const titleId = `${componentId}-title`;
  const panelId = `${componentId}-panel`;
  const [activeType, setActiveType] = useState<"product" | "feature">("product");
  const [activeCategory, setActiveCategory] = useState("전체");
  const [filterOpen, setFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);
  const items = activeType === "product" ? productItems : featureItems;

  // 실제 등록된 프로덕트의 카테고리로 탭을 동적 구성 (최대 4개)
  const categoryFilters = useMemo(() => {
    const seen: string[] = [];
    for (const item of items) {
      if (!seen.includes(item.category)) seen.push(item.category);
      if (seen.length >= 4) break;
    }
    return ["전체", ...seen];
  }, [items]);
  const [serverCounts, setServerCounts] = useState<Record<"product" | "feature", Record<string, number>>>({ product: {}, feature: {} });
  const [status, setStatus] = useState("실시간 조회수를 동기화하는 중입니다.");

  useEffect(() => {
    let cancelled = false;

    const syncCounts = async () => {
      try {
        const response = await fetch(`/api/view?type=${activeType}`, {
          method: "GET",
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error(`View count request failed: ${response.status}`);
        }

        const payload: unknown = await response.json();
        if (!isCountsResponse(payload)) {
          throw new Error("Invalid view count response");
        }

        if (!cancelled) {
          setServerCounts((currentCounts) => ({ ...currentCounts, [activeType]: { ...currentCounts[activeType], ...payload.counts } }));
          setStatus("실시간 조회수가 업데이트되었습니다.");
        }
      } catch {
        if (!cancelled) {
          setStatus("실시간 조회수를 불러오지 못했습니다. 현재 조회수를 표시합니다.");
        }
      }
    };

    syncCounts();
    const intervalId = window.setInterval(syncCounts, 30_000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [activeType]);

  useEffect(() => {
    setActiveCategory("전체");
    setFilterOpen(false);
  }, [activeType]);

  useEffect(() => {
    if (!filterOpen) return;
    const close = (event: MouseEvent) => {
      if (!filterRef.current?.contains(event.target as Node)) setFilterOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setFilterOpen(false);
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [filterOpen]);

  const rankedItems = useMemo(() => {
    return items
      .map((item, index) => ({
        item,
        index,
        currentViewCount: Object.prototype.hasOwnProperty.call(serverCounts[activeType], item.slug)
          ? serverCounts[activeType][item.slug]
          : item.viewCount,
      }))
      .filter(
        ({ item }) => activeCategory === "전체" || item.category === activeCategory,
      )
      .sort((a, b) => b.currentViewCount - a.currentViewCount || a.index - b.index)
      .slice(0, 5);
  }, [activeCategory, activeType, items, serverCounts]);

  return (
    <section className={styles.widget} aria-labelledby={titleId}>
      <div className={styles.header}>
        <h2 id={titleId}>실시간 베스트</h2>
        <span className={styles.liveIndicator} aria-hidden="true">
          <span className={styles.liveDot} /> LIVE
        </span>
      </div>

      <div className={styles.typeToggle} aria-label="랭킹 종류">
        <button className={activeType === "product" ? styles.activeType : ""} type="button" onClick={() => setActiveType("product")}>프로덕트</button>
        <button className={activeType === "feature" ? styles.activeType : ""} type="button" onClick={() => setActiveType("feature")}>피처</button>
      </div>

      <div className={styles.filterRow}>
        <span>{activeCategory === "전체" ? "전체 랭킹" : `${activeCategory} 랭킹`}</span>
        <div className={styles.filterMenu} ref={filterRef}>
          <button className={`${styles.filterTrigger} ${filterOpen ? styles.openTrigger : ""}`} type="button" aria-label="카테고리 필터" aria-haspopup="menu" aria-expanded={filterOpen} onClick={() => setFilterOpen((open) => !open)}>
            <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3 5h8M15 5h2M3 10h2M9 10h8M3 15h8M15 15h2"/><circle cx="13" cy="5" r="2"/><circle cx="7" cy="10" r="2"/><circle cx="13" cy="15" r="2"/></svg>
            {activeCategory !== "전체" && <i />}
          </button>
          {filterOpen && <div className={styles.filterPopover} role="menu" aria-label="카테고리 선택">
            <p>카테고리</p>
            {categoryFilters.map((category) => (
              <button className={activeCategory === category ? styles.selectedFilter : ""} type="button" role="menuitemradio" aria-checked={activeCategory === category} key={category} onClick={() => { setActiveCategory(category); setFilterOpen(false); }}>
                <span>{category}</span><b aria-hidden="true">✓</b>
              </button>
            ))}
          </div>}
        </div>
      </div>

      <p className={styles.status} aria-live="polite">
        {status}
      </p>

      <div id={panelId} role="tabpanel" aria-label={`${activeCategory} 프로덕트 조회수 순위`}>
        {rankedItems.length > 0 ? (
          <ol className={styles.list}>
          {rankedItems.map(({ item, currentViewCount }, index) => (
            <li className={styles.item} key={item.slug}><Link className={styles.itemLink} href={item.href ?? (activeType === "product" ? `/products/${item.slug}` : `/stories/${item.slug}`)}>
              <span className={styles.rank} aria-label={`${index + 1}위`}>
                {String(index + 1).padStart(2, "0")}
              </span>
              <img className={styles.cover} src={item.coverUrl} alt="" />
              <div className={styles.itemContent}>
                <div className={styles.itemMeta}>
                  <span className={styles.category}>{item.category}</span>
                  <span>{item.brandName}</span>
                </div>
                <h3>{item.title}</h3>
                <p>{item.founderName}</p>
              </div>
              <span className={styles.views}>
                <strong>{formatViewCount(currentViewCount)}</strong>
                <span>조회</span>
              </span>
            </Link></li>
          ))}
          </ol>
        ) : (
          <p className={styles.empty}>해당 카테고리의 프로덕트가 없습니다.</p>
        )}
      </div>
    </section>
  );
}
