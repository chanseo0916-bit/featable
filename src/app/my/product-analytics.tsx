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
  { key: "60d", label: "60일", days: 60 },
  { key: "90d", label: "90일", days: 90 },
] as const;

const METRICS = [
  { key: "views", label: "조회수" },
  { key: "clicks", label: "링크 클릭" },
  { key: "likes", label: "좋아요" },
] as const;

type RangeKey = (typeof RANGES)[number]["key"];
type MetricKey = (typeof METRICS)[number]["key"];

export function ProductAnalytics({ series }: { readonly series: readonly AnalyticsDay[] }) {
  const [range, setRange] = useState<RangeKey>("30d");
  const [metric, setMetric] = useState<MetricKey>("views");
  const days = RANGES.find((item) => item.key === range)?.days ?? 30;
  const windowSeries = useMemo(() => series.slice(-days), [days, series]);
  const totals = useMemo(() => ({
    views: windowSeries.reduce((sum, day) => sum + day.views, 0),
    clicks: windowSeries.reduce((sum, day) => sum + day.clicks, 0),
    likes: windowSeries.reduce((sum, day) => sum + day.likes, 0),
  }), [windowSeries]);
  const values = windowSeries.map((day) => day[metric]);
  const maxValue = Math.max(1, ...values);
  const metricLabel = METRICS.find((item) => item.key === metric)?.label ?? "조회수";
  const rangeLabel = RANGES.find((item) => item.key === range)?.label ?? "30일";

  return <section className="dash-section dash-panel dash-analytics">
    <div className="dash-panel-head"><h2>프로덕트 성과</h2><small>전체 프로덕트 집계</small></div>
    <div className="analytics-body">
      <div className="seg-range" role="group" aria-label="조회 기간">
        {RANGES.map((item) => <button key={item.key} type="button" aria-pressed={range === item.key} className={range === item.key ? "active" : ""} onClick={() => setRange(item.key)}>{item.label}</button>)}
      </div>
      <div className="analytics-ministats" role="group" aria-label="분석 지표">
        {METRICS.map((item) => <button key={item.key} type="button" aria-pressed={metric === item.key} className={`analytics-metric metric-${item.key}${metric === item.key ? " active" : ""}`} onClick={() => setMetric(item.key)}><b>{totals[item.key].toLocaleString("ko-KR")}</b><span>{item.label}</span></button>)}
      </div>
      <div className={`analytics-chart metric-${metric}`}>
        {values.some((value) => value > 0) ? <div className="analytics-bars" role="img" aria-label={`${rangeLabel}간 ${metricLabel} 막대 그래프`}>
          {windowSeries.map((day, index) => <i key={day.date} className={index === windowSeries.length - 1 ? "hot" : ""} style={{ height: day[metric] === 0 ? "0%" : `${Math.max(6, Math.round((day[metric] / maxValue) * 100))}%` }} />)}
        </div> : <span>아직 집계된 데이터가 없어요.</span>}
      </div>
      <div className="analytics-chart-range"><span>{windowSeries[0]?.date ?? ""}</span><span>{windowSeries.at(-1)?.date ?? ""}</span></div>
    </div>
  </section>;
}
