"use client";

import type { CSSProperties, PointerEvent as ReactPointerEvent, ReactNode } from "react";
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

export function InteractiveProfileCard({ children, className }: { children: ReactNode; className: string }) {
  const cardRef = useRef<HTMLDivElement>(null);

  function moveCard(event: ReactPointerEvent<HTMLDivElement>) {
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
    <div
      ref={cardRef}
      className={`${className} interactive-profile-card`}
      style={restingStyle}
      onPointerMove={moveCard}
      onPointerDown={(event) => {
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
      }}
      onPointerLeave={resetCard}
      onPointerCancel={resetCard}
    >
      {children}
      <span className="profile-card-glare" aria-hidden="true" />
    </div>
  );
}
