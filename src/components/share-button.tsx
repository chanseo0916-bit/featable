"use client";

import { useEffect, useRef, useState } from "react";

type ShareStatus = "idle" | "shared" | "copied" | "error";

export function ShareButton({
  title,
  text,
  url,
  className,
}: {
  title: string;
  text?: string;
  url?: string;
  className?: string;
}) {
  const [status, setStatus] = useState<ShareStatus>("idle");
  const resetTimer = useRef<number | null>(null);

  useEffect(() => () => {
    if (resetTimer.current) window.clearTimeout(resetTimer.current);
  }, []);

  function showStatus(nextStatus: ShareStatus) {
    setStatus(nextStatus);
    if (resetTimer.current) window.clearTimeout(resetTimer.current);
    resetTimer.current = window.setTimeout(() => setStatus("idle"), 2200);
  }

  async function copyLink(shareUrl: string) {
    await navigator.clipboard.writeText(shareUrl);
    showStatus("copied");
  }

  async function share() {
    const shareUrl = url ?? window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url: shareUrl });
        showStatus("shared");
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }

    try {
      await copyLink(shareUrl);
    } catch {
      showStatus("error");
    }
  }

  const label = status === "shared"
    ? "공유 완료"
    : status === "copied"
      ? "링크 복사됨"
      : status === "error"
        ? "복사 실패"
        : "공유하기";

  return (
    <button type="button" className={className ?? "save-item-button share-item-button"} onClick={share} aria-live="polite">
      <span aria-hidden="true">↗</span>
      <strong>{label}</strong>
    </button>
  );
}
