"use client";

import type { CSSProperties, PointerEvent as ReactPointerEvent, ReactNode } from "react";
import { useState, useRef } from "react";
import { CardShowcase } from "@/components/card-showcase";

type TiltProperties = CSSProperties & {
  "--card-rotate-x": string;
  "--card-rotate-y": string;
  "--card-glare-x": string;
  "--card-glare-y": string;
};

const restingStyle: TiltProperties = {
  "--card-rotate-x": "0deg",
  "--card-rotate-y": "0deg",
  "--card-glare-x": "50%",
  "--card-glare-y": "50%",
};

/** 이보다 많이 움직이면 카드를 열려던 탭이 아니라 스크롤로 본다 */
const TAP_SLOP = 10;

export function InteractiveProfileCard({
  children,
  className,
  expandable = false,
}: {
  children: ReactNode;
  className: string;
  /** 탭하면 카드를 크게 띄워 돌려볼 수 있게 한다 */
  expandable?: boolean;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const tapStart = useRef<{ x: number; y: number } | null>(null);
  const [showcase, setShowcase] = useState(false);

  function moveCard(event: ReactPointerEvent<HTMLDivElement>) {
    // 마우스에서만 따라 기울인다. 터치는 평소 정적으로 두고 탭하면 뷰어를 연다.
    if (event.pointerType !== "mouse" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const card = cardRef.current;
    if (!card) return;

    const bounds = card.getBoundingClientRect();
    const x = Math.min(Math.max((event.clientX - bounds.left) / bounds.width, 0), 1);
    const y = Math.min(Math.max((event.clientY - bounds.top) / bounds.height, 0), 1);
    const strength = card.classList.contains("is-grabbing") ? 16 : 10;

    card.style.setProperty("--card-rotate-x", `${(0.5 - y) * strength}deg`);
    card.style.setProperty("--card-rotate-y", `${(x - 0.5) * strength}deg`);
    card.style.setProperty("--card-glare-x", `${x * 100}%`);
    card.style.setProperty("--card-glare-y", `${y * 100}%`);
  }

  function resetCard() {
    const card = cardRef.current;
    if (!card) return;
    card.classList.remove("is-grabbing");
    card.style.setProperty("--card-rotate-x", "0deg");
    card.style.setProperty("--card-rotate-y", "0deg");
    card.style.setProperty("--card-glare-x", "50%");
    card.style.setProperty("--card-glare-y", "50%");
  }

  return (
    <>
      <div
        ref={cardRef}
        className={`${className} interactive-profile-card${expandable ? " is-expandable" : ""}`}
        style={restingStyle}
        onPointerMove={moveCard}
        onPointerDown={(event) => {
          if (expandable) tapStart.current = { x: event.clientX, y: event.clientY };
          if (event.pointerType !== "mouse") return;
          event.currentTarget.classList.add("is-grabbing");
          event.currentTarget.setPointerCapture(event.pointerId);
          moveCard(event);
        }}
        onPointerUp={(event) => {
          event.currentTarget.classList.remove("is-grabbing");
          if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
          }
          if (!expandable || !tapStart.current) return;
          const moved = Math.hypot(event.clientX - tapStart.current.x, event.clientY - tapStart.current.y);
          tapStart.current = null;
          if (moved <= TAP_SLOP) {
            resetCard();
            setShowcase(true);
          }
        }}
        onPointerLeave={resetCard}
        onPointerCancel={() => {
          tapStart.current = null;
          resetCard();
        }}
        {...(expandable
          ? {
            role: "button" as const,
            tabIndex: 0,
            "aria-haspopup": "dialog" as const,
            onKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                setShowcase(true);
              }
            },
          }
          : {})}
      >
        {children}
        <span className="profile-card-glare" aria-hidden="true" />
        <span className="profile-card-holo" aria-hidden="true" />
        {expandable && <span className="profile-card-expand-hint" aria-hidden="true">탭해서 카드 돌려보기</span>}
      </div>

      {showcase && (
        <CardShowcase onClose={() => setShowcase(false)}>
          <div className={`${className} showcase-card-inner`}>{children}</div>
        </CardShowcase>
      )}
    </>
  );
}
