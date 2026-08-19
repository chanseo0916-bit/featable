"use client";

import { useEffect, useId, useMemo, useState } from "react";
import Link from "next/link";
import styles from "./live-feature-ranking.module.css";

export type RankedFeatureItem = {
  slug: string;
  title: string;
  coverUrl: string;
  brandName: string;
  founderName: string;
  category: "창업가" | "브랜드" | "제품";
  viewCount: number;
};

type LiveFeatureRankingProps = {
  items: RankedFeatureItem[];
};

type CategoryFilter = "전체" | RankedFeatureItem["category"];

const categoryFilters: CategoryFilter[] = ["전체", "창업가", "브랜드", "제품"];

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

export function LiveFeatureRanking({ items }: LiveFeatureRankingProps) {
  const componentId = useId();
  const titleId = `${componentId}-title`;
  const panelId = `${componentId}-panel`;
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>("전체");
  const [serverCounts, setServerCounts] = useState<Record<string, number>>({});
  const [status, setStatus] = useState("실시간 조회수를 동기화하는 중입니다.");

  useEffect(() => {
    let cancelled = false;

    const syncCounts = async () => {
      try {
        const response = await fetch("/api/view?type=feature", {
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
          setServerCounts((currentCounts) => ({ ...currentCounts, ...payload.counts }));
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
  }, []);

  const rankedItems = useMemo(() => {
    return items
      .map((item, index) => ({
        item,
        index,
        currentViewCount: Object.prototype.hasOwnProperty.call(serverCounts, item.slug)
          ? serverCounts[item.slug]
          : item.viewCount,
      }))
      .filter(
        ({ item }) => activeCategory === "전체" || item.category === activeCategory,
      )
      .sort((a, b) => b.currentViewCount - a.currentViewCount || a.index - b.index)
      .slice(0, 5);
  }, [activeCategory, items, serverCounts]);

  return (
    <section className={styles.widget} aria-labelledby={titleId}>
      <div className={styles.header}>
        <h2 id={titleId}>실시간 베스트 스토리</h2>
        <span className={styles.liveIndicator} aria-hidden="true">
          <span className={styles.liveDot} /> LIVE
        </span>
      </div>

      <div className={styles.tabs} role="tablist" aria-label="스토리 랭킹 카테고리">
        {categoryFilters.map((category) => {
          const isActive = activeCategory === category;

          return (
            <button
              key={category}
              className={`${styles.tab} ${isActive ? styles.activeTab : ""}`}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={panelId}
              tabIndex={isActive ? 0 : -1}
              onClick={() => setActiveCategory(category)}
            >
              {category}
            </button>
          );
        })}
      </div>

      <p className={styles.status} aria-live="polite">
        {status}
      </p>

      <div id={panelId} role="tabpanel" aria-label={`${activeCategory} 스토리 조회수 순위`}>
        {rankedItems.length > 0 ? (
          <ol className={styles.list}>
          {rankedItems.map(({ item, currentViewCount }, index) => (
            <li className={styles.item} key={item.slug}><Link className={styles.itemLink} href={`/stories/${item.slug}`}>
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
          <p className={styles.empty}>해당 카테고리의 스토리가 없습니다.</p>
        )}
      </div>
    </section>
  );
}
