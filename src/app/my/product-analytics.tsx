"use client";

import { useMemo, useState } from "react";

export interface AnalyticsDay {
  date: string;
  label: string;
  views: number;
  clicks: number;
  likes: number;
}

export interface AnalyticsHour {
  key: string;
  label: string;
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

export function ProductAnalytics({ series, todaySeries }: {
  readonly series: readonly AnalyticsDay[];
  readonly todaySeries: readonly AnalyticsHour[];
}) {
  const [range, setRange] = useState<RangeKey>("30d");
  const [metric, setMetric] = useState<MetricKey>("views");
  const isToday = range === "today";
  const days = RANGES.find((item) => item.key === range)?.days ?? 30;
  const windowSeries = useMemo(() => series.slice(-days), [days, series]);
  const activeSeries = isToday ? todaySeries : windowSeries;

  const totals = useMemo(() => ({
    views: activeSeries.reduce((sum, point) => sum + point.views, 0),
    clicks: activeSeries.reduce((sum, point) => sum + point.clicks, 0),
    likes: activeSeries.reduce((sum, point) => sum + point.likes, 0),
  }), [activeSeries]);
  const values = activeSeries.map((point) => point[metric]);
  const maxValue = Math.max(1, ...values);
  const metricLabel = METRICS.find((item) => item.key === metric)?.label ?? "조회수";
  const rangeLabel = RANGES.find((item) => item.key === range)?.label ?? "30일";
  const isDense = activeSeries.length > 44;

  return <section className="dash-section dash-panel dash-analytics">
    <div className="dash-panel-head"><h2>프로덕트 성과</h2><small>전체 프로덕트 집계</small></div>
    <div className="analytics-body">
      <div className="seg-range" role="group" aria-label="조회 기간">
        {RANGES.map((item) => <button key={item.key} type="button" aria-pressed={range === item.key} className={range === item.key ? "active" : ""} onClick={() => setRange(item.key)}>{item.label}</button>)}
      </div>
      <div className="analytics-ministats" role="group" aria-label="분석 지표">
        {METRICS.map((item) => <button key={item.key} type="button" aria-pressed={metric === item.key} className={`analytics-metric metric-${item.key}${metric === item.key ? " active" : ""}`} onClick={() => setMetric(item.key)}><b>{totals[item.key].toLocaleString("ko-KR")}</b><span>{item.label}</span></button>)}
      </div>
      <div className={`analytics-chart metric-${metric}${isToday ? " is-hourly" : ""}${isDense ? " is-dense" : ""}`}>
        {activeSeries.length > 0 ? <div className="analytics-bars" role="group" aria-label={`${rangeLabel} ${metricLabel} 그래프`}>
          {activeSeries.map((point, index) => {
            const value = point[metric];
            const tooltip = `${point.label} · ${value.toLocaleString("ko-KR")} ${metricLabel}`;
            return <span
              key={"key" in point ? point.key : point.date}
              className={index === activeSeries.length - 1 ? "hot" : ""}
              role="img"
              tabIndex={0}
              aria-label={tooltip}
              data-tooltip={tooltip}
              style={{ height: value === 0 ? "var(--radius-xs)" : `${Math.max(6, Math.round((value / maxValue) * 100))}%` }}
            />;
          })}
        </div> : <span>아직 집계된 데이터가 없어요.</span>}
      </div>
      <div className="analytics-chart-range"><span>{activeSeries[0]?.label ?? ""}</span><span>{activeSeries.at(-1)?.label ?? ""}</span></div>
    </div>
  </section>;
}
