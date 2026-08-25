"use client";

import { useState } from "react";

type BalanceShareButtonProps = {
  title?: string;
  text?: string;
};

export function BalanceShareButton({
  title = "오늘의 밸런스 게임 · Featable",
  text = "창업가라면 어떻게 할까? 로그인 없이 투표하고, 결과는 로그인 후 확인해보세요.",
}: BalanceShareButtonProps) {
  const [status, setStatus] = useState("");

  async function share() {
    const url = window.location.href;
    const shareData = { title, text, url };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        setStatus("공유했어요.");
        return;
      }

      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const input = document.createElement("textarea");
        input.value = url;
        input.setAttribute("readonly", "");
        input.style.position = "fixed";
        input.style.opacity = "0";
        document.body.appendChild(input);
        input.select();
        document.execCommand("copy");
        input.remove();
      }
      setStatus("링크를 복사했어요.");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setStatus("공유하지 못했어요. 다시 시도해 주세요.");
    }
  }

  return (
    <div className="balance-share-control">
      <button type="button" className="balance-share-button" onClick={share}>
        <svg aria-hidden="true" viewBox="0 0 24 24">
          <circle cx="18" cy="5" r="2.5" />
          <circle cx="6" cy="12" r="2.5" />
          <circle cx="18" cy="19" r="2.5" />
          <path d="m8.2 10.8 7.5-4.4M8.2 13.2l7.5 4.4" />
        </svg>
        <span>공유하기</span>
      </button>
      {status && (
        <span className="balance-share-status" role="status" aria-live="polite">
          {status}
        </span>
      )}
    </div>
  );
}
