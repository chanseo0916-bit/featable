"use client";

import { useState } from "react";

export function FeatureActions({ title, initialInterest, initialCheers }: { title: string; initialInterest: number; initialCheers: number }) {
  const [interested, setInterested] = useState(false);
  const [cheered, setCheered] = useState(false);
  const [shared, setShared] = useState(false);

  async function share() {
    const data = { title, text: `${title} · Featable`, url: window.location.href };
    if (navigator.share) await navigator.share(data);
    else await navigator.clipboard.writeText(window.location.href);
    setShared(true);
    window.setTimeout(() => setShared(false), 1600);
  }

  return (
    <div className="feature-action-area">
      <div className="feature-small-actions">
        <button type="button" onClick={share}><span>↗</span><strong>{shared ? "복사됨" : "공유"}</strong></button>
        <button type="button" className={interested ? "active" : ""} onClick={() => setInterested((value) => !value)}><span>{interested ? "♥" : "♡"}</span><strong>{(initialInterest + (interested ? 1 : 0)).toLocaleString()}</strong></button>
      </div>
      <button type="button" className={cheered ? "feature-cheer active" : "feature-cheer"} onClick={() => setCheered((value) => !value)}><span>{cheered ? "응원했어요" : "Founder 응원하기"}</span><strong>{(initialCheers + (cheered ? 1 : 0)).toLocaleString()}명</strong></button>
    </div>
  );
}
