"use client";

import { useMemo, useState } from "react";

export interface AnalyticsDay {
  date: string;
  views: number;
  clicks: number;
  likes: number;
}

const RANGES = [
  { key: "today", label: "오늘", days: 1 },
  { key: "7d", label: "7일", days: 7 },
  { key: "30d", label: "30일", days: 30 },
  { key: "90d", label: "90일", days: 90 },
] as const;

type RangeKey = (typeof RANGES)[number]["key"];

export function ProductAnalytics({ series }: { readonly series: readonly AnalyticsDay[] }) {
  const [range, setRange] = useState<RangeKey>("7d");
  const days = RANGES.find((item) => item.key === range)?.days ?? 7;
  const windowSeries = useMemo(() => series.slice(-days), [days, series]);
  const totals = useMemo(() => ({
    views: windowSeries.reduce((sum, day) => sum + day.views, 0),
    clicks: windowSeries.reduce((sum, day) => sum + day.clicks, 0),
    likes: windowSeries.reduce((sum, day) => sum + day.likes, 0),
  }), [windowSeries]);
  const maxViews = Math.max(1, ...windowSeries.map((day) => day.views));
  const newestViews = windowSeries.at(-1)?.views ?? 0;

  return <section className="dash-section dash-panel dash-analytics">
    <div className="dash-panel-head"><strong>프로덕트 성과</strong><small>전체 프로덕트 집계</small></div>
    <div className="analytics-body">
      <div className="seg-range" role="group" aria-label="조회 기간">
        {RANGES.map((item) => <button key={item.key} type="button" aria-pressed={range === item.key} className={range === item.key ? "active" : ""} onClick={() => setRange(item.key)}>{item.label}</button>)}
      </div>
      <div className="analytics-big"><b>{totals.views.toLocaleString("ko-KR")}</b>{newestViews > 0 && <span className="delta">최근 {newestViews.toLocaleString("ko-KR")}건</span>}</div>
      <div className="analytics-bars" role="img" aria-label={`${RANGES.find((item) => item.key === range)?.label}간 조회수 막대 그래프`}>
        {windowSeries.length > 0 ? windowSeries.map((day, index) => <i key={day.date} className={index === windowSeries.length - 1 ? "hot" : ""} style={{ height: `${Math.max(8, Math.round((day.views / maxViews) * 100))}%` }} />) : <span>아직 집계된 데이터가 없어요.</span>}
      </div>
      <div className="analytics-ministats"><div><b>{totals.views.toLocaleString("ko-KR")}</b><span>조회수</span></div><div><b>{totals.clicks.toLocaleString("ko-KR")}</b><span>링크 클릭</span></div><div><b>{totals.likes.toLocaleString("ko-KR")}</b><span>좋아요</span></div></div>
    </div>
  </section>;
}
