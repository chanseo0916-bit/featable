"use client";

import { useState } from "react";
import { DiscoveryBanner, type DiscoveryBannerSlide } from "./discovery-banner";

export type DiscoveryTab = {
  key: string;
  label: string;
  slides: DiscoveryBannerSlide[];
};

/** 탭 전환으로 배너 콘텐츠가 그 자리에서 바뀌는 발견 스테이지 */
export function DiscoveryStage({
  tabs,
  updateLabel,
}: {
  tabs: DiscoveryTab[];
  updateLabel: string;
}) {
  const [activeKey, setActiveKey] = useState(tabs[0]?.key);
  const current = tabs.find((t) => t.key === activeKey) ?? tabs[0];

  if (!current) return null;

  return (
    <>
      <div className="stage-heading">
        <div className="stage-tabs">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={tab.key === current.key ? "active" : ""}
              onClick={() => setActiveKey(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <span>{updateLabel}</span>
      </div>
      {/* key로 탭 전환 시 슬라이드 인덱스 초기화 */}
      <DiscoveryBanner key={current.key} slides={current.slides} />
    </>
  );
}
