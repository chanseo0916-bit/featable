"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

/** 손가락 이동 1px당 회전 각도 */
const DRAG_TO_DEG_Y = 0.45;
const DRAG_TO_DEG_X = 0.35;
/** 위아래 기울기는 카드가 뒤집혀 보이지 않게 제한한다 */
const MAX_TILT_X = 42;
/** 손을 뗀 뒤 관성이 줄어드는 비율 (프레임당) */
const SPIN_DECAY = 0.94;
/** 이보다 느려지면 관성을 멈춘다 */
const SPIN_STOP = 0.02;

/**
 * 카드를 화면 가운데 띄우고 손가락으로 자유롭게 돌려보는 뷰어.
 * 포커 카드처럼 뒷면까지 돌아가며, 손을 떼면 관성으로 조금 더 돈다.
 */
export function CardShowcase({
  children,
  back,
  onClose,
}: {
  children: ReactNode;
  back?: ReactNode;
  onClose: () => void;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const rotation = useRef({ x: 0, y: 0 });
  const velocity = useRef({ x: 0, y: 0 });
  const dragging = useRef(false);
  const last = useRef({ x: 0, y: 0, t: 0 });
  const frame = useRef<number | null>(null);
  const [hint, setHint] = useState(true);

  const paint = useCallback(() => {
    const card = cardRef.current;
    if (!card) return;
    const { x, y } = rotation.current;
    card.style.setProperty("--show-rot-x", `${x}deg`);
    card.style.setProperty("--show-rot-y", `${y}deg`);
    // 빛이 카드 표면을 훑는 위치를 회전 각도에서 끌어온다
    const glareX = 50 + Math.sin((y * Math.PI) / 180) * 46;
    const glareY = 50 - (x / MAX_TILT_X) * 38;
    card.style.setProperty("--show-glare-x", `${glareX}%`);
    card.style.setProperty("--show-glare-y", `${glareY}%`);
  }, []);

  const spin = useCallback(() => {
    if (dragging.current) return;
    const v = velocity.current;
    if (Math.abs(v.x) < SPIN_STOP && Math.abs(v.y) < SPIN_STOP) {
      frame.current = null;
      return;
    }
    rotation.current.y += v.y;
    rotation.current.x = Math.max(-MAX_TILT_X, Math.min(MAX_TILT_X, rotation.current.x + v.x));
    v.x *= SPIN_DECAY;
    v.y *= SPIN_DECAY;
    paint();
    frame.current = requestAnimationFrame(spin);
  }, [paint]);

  useEffect(() => {
    paint();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        rotation.current.y += event.key === "ArrowLeft" ? -30 : 30;
        paint();
        setHint(false);
      }
      if (event.key === "ArrowUp" || event.key === "ArrowDown") {
        const next = rotation.current.x + (event.key === "ArrowUp" ? -12 : 12);
        rotation.current.x = Math.max(-MAX_TILT_X, Math.min(MAX_TILT_X, next));
        paint();
        setHint(false);
      }
    };
    window.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
      if (frame.current) cancelAnimationFrame(frame.current);
    };
  }, [onClose, paint]);

  function start(event: React.PointerEvent<HTMLDivElement>) {
    dragging.current = true;
    velocity.current = { x: 0, y: 0 };
    last.current = { x: event.clientX, y: event.clientY, t: performance.now() };
    setHint(false);
    event.currentTarget.setPointerCapture(event.pointerId);
    if (frame.current) {
      cancelAnimationFrame(frame.current);
      frame.current = null;
    }
  }

  function move(event: React.PointerEvent<HTMLDivElement>) {
    if (!dragging.current) return;
    const dx = event.clientX - last.current.x;
    const dy = event.clientY - last.current.y;
    const dt = Math.max(performance.now() - last.current.t, 1);
    last.current = { x: event.clientX, y: event.clientY, t: performance.now() };

    rotation.current.y += dx * DRAG_TO_DEG_Y;
    rotation.current.x = Math.max(-MAX_TILT_X, Math.min(MAX_TILT_X, rotation.current.x - dy * DRAG_TO_DEG_X));
    // 프레임당 각도로 환산해 손을 뗀 뒤 이어질 관성을 만든다
    velocity.current = { x: (-dy * DRAG_TO_DEG_X * 16) / dt, y: (dx * DRAG_TO_DEG_Y * 16) / dt };
    paint();
  }

  function end(event: React.PointerEvent<HTMLDivElement>) {
    if (!dragging.current) return;
    dragging.current = false;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (frame.current === null) frame.current = requestAnimationFrame(spin);
  }

  return (
    <div className="card-showcase" role="dialog" aria-modal="true" aria-label="프로필 카드 크게 보기">
      <button type="button" className="card-showcase-backdrop" onClick={onClose} aria-label="닫기" />
      <div className="card-showcase-stage">
        <div
          ref={cardRef}
          className="card-showcase-card"
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerCancel={end}
        >
          <div className="card-showcase-face card-showcase-front">
            {children}
            <span className="card-showcase-sheen" aria-hidden="true" />
          </div>
          <div className="card-showcase-face card-showcase-back">
            {back ?? (
              <div className="card-showcase-back-default">
                <strong>Featable</strong>
                <span>창업가가 세상에 발견되기 시작하는 곳</span>
              </div>
            )}
          </div>
        </div>
        <p className={`card-showcase-hint${hint ? "" : " is-hidden"}`}>손가락으로 카드를 돌려보세요</p>
      </div>
      <button type="button" className="card-showcase-close" onClick={onClose} aria-label="닫기">✕</button>
    </div>
  );
}
