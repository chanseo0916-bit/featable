"use client";

import type { CSSProperties, PointerEvent as ReactPointerEvent, MouseEvent as ReactMouseEvent, ReactNode } from "react";
import { useRef } from "react";

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

/** 드래그로 간주할 최소 이동 거리(px) — 이보다 크면 카드 회전으로 보고 링크 이동을 막는다. */
const DRAG_THRESHOLD = 8;

export function InteractiveProfileCard({ children, className }: { children: ReactNode; className: string }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const dragStart = useRef<{ x: number; y: number } | null>(null);
  const didDrag = useRef(false);

  function moveCard(event: ReactPointerEvent<HTMLDivElement>) {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const card = cardRef.current;
    if (!card) return;

    // 터치·펜은 손가락을 댄 동안에만 반응한다 (호버 개념이 없음)
    const isPointerDown = event.pointerType !== "mouse" ? card.classList.contains("is-grabbing") : true;
    if (!isPointerDown) return;

    const bounds = card.getBoundingClientRect();
    const x = Math.min(Math.max((event.clientX - bounds.left) / bounds.width, 0), 1);
    const y = Math.min(Math.max((event.clientY - bounds.top) / bounds.height, 0), 1);
    // 터치는 손가락이 카드를 직접 잡은 느낌이 나도록 각도를 더 크게 준다
    const strength = event.pointerType !== "mouse" ? 22 : card.classList.contains("is-grabbing") ? 16 : 10;

    if (dragStart.current) {
      const moved = Math.hypot(event.clientX - dragStart.current.x, event.clientY - dragStart.current.y);
      if (moved > DRAG_THRESHOLD) didDrag.current = true;
    }

    card.style.setProperty("--card-rotate-x", `${(0.5 - y) * strength}deg`);
    card.style.setProperty("--card-rotate-y", `${(x - 0.5) * strength}deg`);
    card.style.setProperty("--card-glare-x", `${x * 100}%`);
    card.style.setProperty("--card-glare-y", `${y * 100}%`);
  }

  function resetCard() {
    const card = cardRef.current;
    if (!card) return;
    dragStart.current = null;
    card.classList.remove("is-grabbing");
    card.style.setProperty("--card-rotate-x", "0deg");
    card.style.setProperty("--card-rotate-y", "0deg");
    card.style.setProperty("--card-glare-x", "50%");
    card.style.setProperty("--card-glare-y", "50%");
  }

  return (
    <div
      ref={cardRef}
      className={`${className} interactive-profile-card`}
      style={restingStyle}
      onPointerMove={moveCard}
      onPointerDown={(event) => {
        dragStart.current = { x: event.clientX, y: event.clientY };
        didDrag.current = false;
        event.currentTarget.classList.add("is-grabbing");
        if (event.pointerType === "mouse") {
          event.currentTarget.setPointerCapture(event.pointerId);
          moveCard(event);
        }
      }}
      onPointerUp={(event) => {
        event.currentTarget.classList.remove("is-grabbing");
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId);
        }
        if (event.pointerType !== "mouse") resetCard();
      }}
      onPointerLeave={resetCard}
      onPointerCancel={resetCard}
      // 카드를 돌리려던 동작이 링크 이동으로 이어지지 않게 한다
      onClickCapture={(event: ReactMouseEvent<HTMLDivElement>) => {
        if (!didDrag.current) return;
        event.preventDefault();
        event.stopPropagation();
        didDrag.current = false;
      }}
    >
      {children}
      <span className="profile-card-glare" aria-hidden="true" />
      <span className="profile-card-holo" aria-hidden="true" />
    </div>
  );
}
