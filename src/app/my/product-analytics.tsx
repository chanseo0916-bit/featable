"use client";

import { useMemo, useState } from "react";

export interface AnalyticsDay {
  date: string; // YYYY-MM-DD
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

type RangeKey = (typeof RANGES)[number]["key"];
type MetricKey = "views" | "clicks" | "likes";

const METRICS: { key: MetricKey; label: string; color: string }[] = [
  { key: "views", label: "조회수", color: "#ef4125" },
  { key: "clicks", label: "링크 클릭", color: "#2563eb" },
  { key: "likes", label: "좋아요", color: "#16a34a" },
];

function buildPath(values: number[], width: number, height: number, pad: number) {
  const max = Math.max(1, ...values);
  const n = values.length;
  const stepX = n > 1 ? (width - pad * 2) / (n - 1) : 0;
  const points = values.map((v, i) => {
    const x = pad + stepX * i;
    const y = height - pad - (v / max) * (height - pad * 2);
    return [x, y] as const;
  });
  const line = points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${line} L${points[points.length - 1][0].toFixed(1)},${(height - pad).toFixed(1)} L${points[0][0].toFixed(1)},${(height - pad).toFixed(1)} Z`;
  return { line, area, points };
}

export function ProductAnalytics({ series }: { series: AnalyticsDay[] }) {
  const [range, setRange] = useState<RangeKey>("30d");
  const [metric, setMetric] = useState<MetricKey>("views");

  const days = RANGES.find((r) => r.key === range)?.days ?? 30;
  const windowSeries = useMemo(() => series.slice(-days), [series, days]);

  const totals = useMemo(
    () => ({
      views: windowSeries.reduce((sum, d) => sum + d.views, 0),
      clicks: windowSeries.reduce((sum, d) => sum + d.clicks, 0),
      likes: windowSeries.reduce((sum, d) => sum + d.likes, 0),
    }),
    [windowSeries],
  );

  const width = 720;
  const height = 220;
  const pad = 16;
  const values = windowSeries.map((d) => d[metric]);
  const { line, area, points } = buildPath(values.length ? values : [0], width, height, pad);
  const activeColor = METRICS.find((m) => m.key === metric)!.color;

  const fmt = (n: number) => n.toLocaleString("ko-KR");

  return (
    <section className="analytics-panel">
      <div className="analytics-head">
        <div className="studio-panel-heading"><strong>프로덕트 애널리틱스</strong><span>내 프로덕트 전체 기준으로 집계됩니다.</span></div>
        <div className="analytics-range-tabs" role="tablist" aria-label="조회 기간">
          {RANGES.map((r) => (
            <button key={r.key} type="button" role="tab" aria-selected={range === r.key} className={range === r.key ? "active" : ""} onClick={() => setRange(r.key)}>
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="analytics-stats">
        {METRICS.map((m) => (
          <button
            key={m.key}
            type="button"
            className={`analytics-stat${metric === m.key ? " active" : ""}`}
            style={{ "--metric-color": m.color } as React.CSSProperties}
            onClick={() => setMetric(m.key)}
          >
            <span>{m.label}</span>
            <strong>{fmt(totals[m.key])}</strong>
          </button>
        ))}
      </div>

      <div className="analytics-chart">
        {values.every((v) => v === 0) ? (
          <div className="analytics-chart-empty">아직 데이터가 없어요. 프로덕트가 조회·클릭·저장되면 여기에 쌓입니다.</div>
        ) : (
          <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" role="img" aria-label={`${METRICS.find((m) => m.key === metric)?.label} 추이`}>
            <defs>
              <linearGradient id="analytics-area-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={activeColor} stopOpacity="0.22" />
                <stop offset="100%" stopColor={activeColor} stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d={area} fill="url(#analytics-area-fill)" stroke="none" />
            <path d={line} fill="none" stroke={activeColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            {points.length <= 31 && points.map(([x, y], i) => <circle key={i} cx={x} cy={y} r="3" fill={activeColor} />)}
          </svg>
        )}
      </div>
      <div className="analytics-chart-range">
        <span>{windowSeries[0]?.date ?? ""}</span>
        <span>{windowSeries[windowSeries.length - 1]?.date ?? ""}</span>
      </div>
    </section>
  );
}
