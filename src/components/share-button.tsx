"use client";

import { useState } from "react";

/** 공유 버튼 — 모바일은 시스템 공유 시트, 데스크톱은 링크 복사 */
export function ShareButton({
  title,
  text,
  className,
}: {
  title: string;
  text?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch {
        // 사용자가 공유 시트를 닫음 — 무시
        return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("아래 링크를 복사하세요:", url);
    }
  }

  return (
    <button type="button" onClick={handleShare} className={className}>
      {copied ? "복사됨 ✓" : "공유"}
    </button>
  );
}
